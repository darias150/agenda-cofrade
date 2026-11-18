// Genera la imagen de la agenda de un día.
// Uso: node render.js [YYYY-MM-DD]   (sin fecha = hoy en Madrid)
const fs = require('fs');
const path = require('path');
const { eventosDelDia } = require('./ical');
const COFRADIAS = require('./cofradias');

const ICS = path.join(__dirname, 'data', 'calendario.ics');
const OUT = path.join(__dirname, 'out');
const EDGE = process.env.CHROME_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MARCA = '#7A1426';

const limpiar = t => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
const esc = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Igual que tu script de Helix: se detecta por cómo empieza el título.
function clasificar(ev) {
  const t = limpiar(ev.titulo);
  const quitarPrefijo = len => ev.titulo.slice(len).replace(/^\s*[-–:]\s*/, '').trim();
  for (const c of COFRADIAS) {
    for (const k of c.claves) {
      if (t.startsWith(k)) return { ...ev, cofradia: c, acto: quitarPrefijo(k.length) };
    }
  }
  if (t.startsWith('EL HACHON')) return { ...ev, especial: 'radio', acto: ev.titulo };
  return { ...ev, acto: ev.titulo };
}

function fechaLarga(f) {
  const d = new Date(f + 'T12:00:00Z');
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}

function hoyMadrid() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
}

const CRUZ = color => `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="${color}"/><path d="M44 18h12v22h20v12H56v30H44V52H24V40h20z" fill="#fff"/></svg>`;
const RADIO = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#24467A"/><rect x="26" y="40" width="48" height="32" rx="6" fill="#fff"/><circle cx="40" cy="56" r="8" fill="#24467A"/><path d="M54 50h14M54 56h14M54 62h14" stroke="#24467A" stroke-width="3"/><path d="M34 40l30-14" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`;

// Etiqueta "Novena · día 5 de 9" con puntos de progreso
function serie(ev) {
  if (!ev.dia || !ev.total) return '';
  const texto = ev.dia === ev.total ? 'Último día' : `Día ${ev.dia} de ${ev.total}`;
  const puntos = ev.total <= 9
    ? `<span class="puntos">${Array.from({ length: ev.total }, (_, i) => `<i class="${i < ev.dia ? 'on' : ''}"></i>`).join('')}</span>` : '';
  return `<span class="serie">${ev.culto ? ev.culto + ' · ' : ''}${texto}${puntos}</span>`;
}

function tarjeta(ev, conFigura) {
  const c = ev.cofradia;
  const color = c ? c.color : ev.especial === 'radio' ? '#24467A' : MARCA;
  const acento = c ? c.acento : '#EFE7E2';
  const escudo = c ? `<img src="../assets/escudos/${c.n}.png">` : ev.especial === 'radio' ? RADIO : CRUZ(MARCA);
  const etiqueta = c ? c.nombre : ev.especial === 'radio' ? 'Radio' : 'Agenda cofrade';
  // Si el evento trae cartel/foto, va de marca de agua a la derecha y sustituye a la figura del nazareno
  const cartel = ev.cartel
    ? `<div class="cartel" style="background-image:url('${ev.cartel.replace(/'/g, '%27')}');background-position:center ${ev.cartelFoco}"></div>` : '';
  return `
  <div class="ev${cartel ? ' con-cartel' : ''}" style="--c:${color};--a:${acento}">
    ${cartel}
    <div class="hora">${ev.hora || 'Todo el día'}</div>
    <div class="escudo">${escudo}</div>
    <div class="txt">
      <div class="cof">${esc(etiqueta)}${serie(ev)}</div>
      <div class="acto">${esc(ev.acto)}</div>
      ${ev.lugar ? `<div class="lugar"><svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>${esc(ev.lugar.split(',')[0].split(' - ')[0])}</div>` : ''}
    </div>
    ${conFigura && c && !cartel ? `<img class="fig" src="../assets/cofrades/${c.n}.png">` : ''}
  </div>`;
}

function html(fecha, eventos, pag = 1, pags = 1) {
  const conFigura = eventos.length <= 6;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Source+Sans+3:wght@400;600;700&display=block" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1080px; height: 1350px; overflow: hidden; }
  body { --s: 1; font-family: 'Source Sans 3', sans-serif; color: #2A2222;
    background: #F6F1EA radial-gradient(circle at 50% 0, #FFFFFF 0, #F6F1EA 60%); display: flex; flex-direction: column; }
  header { background: ${MARCA}; color: #fff; padding: 44px 64px 40px; display: flex; align-items: center; gap: 32px;
    position: relative; box-shadow: 0 6px 0 #C9A44C; }
  .pag { margin-left: auto; align-self: flex-start; font-weight: 700; font-size: 30px; color: #E9C46A;
    border: 2px solid #E9C46A; border-radius: 999px; padding: 4px 18px; }
  .logo { width: 104px; height: 104px; flex: none; }
  h1 { font-family: 'Cinzel', serif; font-size: 66px; letter-spacing: 3px; line-height: 1; }
  h1 span { color: #E9C46A; }
  .fecha { font-size: 34px; margin-top: 12px; opacity: .92; }
  .fecha::first-letter { text-transform: uppercase; }
  .lista { flex: 1; padding: calc(var(--s) * 44px) 56px 24px; display: flex; flex-direction: column;
    gap: calc(var(--s) * 22px); overflow: hidden; justify-content: center; }
  .ev { position: relative; display: flex; align-items: center; gap: calc(var(--s) * 26px); background: #fff;
    border-radius: 22px; padding: calc(var(--s) * 22px) 28px; padding-right: ${conFigura ? '150px' : '28px'};
    box-shadow: 0 2px 10px rgba(60,20,20,.08); border-left: 14px solid var(--c);
    background: linear-gradient(90deg, #fff 70%, var(--a)); min-height: calc(var(--s) * 150px); }
  .hora { flex: none; width: calc(var(--s) * 118px); text-align: center; font-weight: 700; font-size: calc(var(--s) * 36px);
    color: #fff; background: var(--c); border-radius: 14px; padding: calc(var(--s) * 10px) 0; }
  .escudo { flex: none; width: calc(var(--s) * 104px); height: calc(var(--s) * 104px); display: grid; place-items: center; }
  .escudo img, .escudo svg { max-width: 100%; max-height: 100%; }
  .txt { flex: 1; min-width: 0; }
  .cof { font-family: 'Cinzel', serif; font-weight: 700; color: var(--c); font-size: calc(var(--s) * 26px);
    letter-spacing: 1px; text-transform: uppercase; }
  .cof { display: flex; flex-wrap: wrap; align-items: center; column-gap: calc(var(--s) * 14px); row-gap: 4px; }
  .serie { display: inline-flex; align-items: center; gap: calc(var(--s) * 10px); font-family: 'Source Sans 3', sans-serif; font-size: calc(var(--s) * 21px); font-weight: 700;
    letter-spacing: .5px; color: var(--c); border: 2px solid var(--c); border-radius: 999px;
    padding: calc(var(--s) * 2px) calc(var(--s) * 12px); text-transform: none; }
  .puntos { display: inline-flex; gap: calc(var(--s) * 4px); }
  .puntos i { width: calc(var(--s) * 9px); height: calc(var(--s) * 9px); border-radius: 50%; border: 1.5px solid var(--c); }
  .puntos i.on { background: var(--c); }
  .acto { font-weight: 700; font-size: calc(var(--s) * 33px); line-height: 1.15; margin-top: 4px;
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .lugar { display: flex; align-items: center; gap: 8px; color: #6F6262; font-size: calc(var(--s) * 26px); margin-top: 8px; }
  .lugar svg { width: 1em; height: 1em; fill: var(--c); flex: none; }
  .fig { position: absolute; right: 18px; bottom: 0; height: 112%; max-height: calc(var(--s) * 210px); }
  /* Cartel / foto como marca de agua: ocupa la derecha y se funde hacia el texto */
  /* flex-shrink 0: si no caben, la tarjeta NO se encoge (cortando el texto); así ajustar() reduce el tamaño */
  .ev { overflow: hidden; flex-shrink: 0; }
  .ev > .hora, .ev > .escudo, .ev > .txt { position: relative; z-index: 1; }
  /* Varios actos: la foto ocupa la franja derecha y se funde antes de llegar al texto */
  .con-cartel { padding-right: 29%; }
  .cartel { position: absolute; top: 0; right: 0; bottom: 0; width: 36%; background-size: cover;
    -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,.45) 30%, #000 62%);
            mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,.45) 30%, #000 62%); }
  /* Un solo acto: la foto arriba a todo el ancho, fundiéndose hacia el texto de abajo */
  /* (la foto termina justo donde empieza el texto, para que un cartel con letras no se monte encima) */
  .uno .con-cartel { padding: calc(var(--s) * 620px) 28px calc(var(--s) * 34px); }
  .uno .con-cartel .cartel { width: auto; left: 0; bottom: auto; height: calc(var(--s) * 610px);
    -webkit-mask-image: linear-gradient(180deg, #000 72%, transparent 100%);
            mask-image: linear-gradient(180deg, #000 72%, transparent 100%); }
  .vacio { margin: auto; text-align: center; font-size: 40px; color: #8A7B7B; }
  footer { background: #2A1B1E; color: #E9C46A; text-align: center; padding: 22px; font-size: 30px; font-weight: 600; letter-spacing: 2px; }
</style></head><body>
<header>
  <svg class="logo" viewBox="0 0 100 100"><rect width="100" height="100" rx="12" fill="#fff"/><rect x="6" y="6" width="88" height="88" rx="8" fill="${MARCA}"/>
    <path d="M50 18 L76 82 H64 L50 44 L36 82 H24 Z" fill="#fff"/></svg>
  <div><h1>AGENDA <span>COFRADE</span></h1><div class="fecha">${fechaLarga(fecha)}</div></div>
  ${pags > 1 ? `<div class="pag">${pag}/${pags}</div>` : ''}
</header>
<main class="lista${eventos.length === 1 ? ' uno' : ''}">
  ${eventos.length ? eventos.map(e => tarjeta(e, conFigura)).join('') : '<div class="vacio">Hoy no hay actos programados</div>'}
</main>
<footer>www.valladolidcofrade.com</footer>
</body></html>`;
}

// Empieza grande (días con pocos actos) y se va reduciendo hasta que entra todo.
function ajustar() {
  const l = document.querySelector('.lista'); let s = 1.15;
  document.body.style.setProperty('--s', s);
  l.style.justifyContent = 'flex-start';
  while (l.scrollHeight > l.clientHeight + 1 && s > 0.55) { s -= 0.02; document.body.style.setProperty('--s', s); }
  l.style.justifyContent = 'center';
}

// Genera las imágenes (JPG 1080x1350) de un día. Devuelve los eventos y las rutas.
// opciones.ics: ruta del calendario; opciones.salida: carpeta; opciones.nombre: prefijo de archivo
async function render(fecha, opciones = {}) {
  const puppeteer = require('puppeteer-core');
  const salida = opciones.salida || OUT;
  fs.mkdirSync(salida, { recursive: true });
  const eventos = eventosDelDia(opciones.ics || ICS, fecha).map(clasificar);
  if (!eventos.length && opciones.saltarVacios) return { eventos, imagenes: [] };

  // Días cargados: se reparten a partes iguales en varias imágenes (carrusel), máximo 8 actos por imagen
  const MAX = 8;
  const pags = Math.max(1, Math.ceil(eventos.length / MAX));
  const porPag = Math.ceil(eventos.length / pags) || 0;
  const imagenes = [];
  const browser = await puppeteer.launch({ executablePath: EDGE, args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
    for (let p = 1; p <= pags; p++) {
      const nombre = `${opciones.nombre || fecha}${pags > 1 ? `-${p}` : ''}`;
      // El HTML va en out/ para que encuentre ../assets
      fs.mkdirSync(OUT, { recursive: true });
      const htmlPath = path.join(OUT, `${nombre}.html`);
      fs.writeFileSync(htmlPath, html(fecha, eventos.slice((p - 1) * porPag, p * porPag), p, pags));
      await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0', timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(ajustar);
      const jpg = path.join(salida, `${nombre}.jpg`);
      await page.screenshot({ path: jpg, type: 'jpeg', quality: 92 });
      imagenes.push(jpg);
    }
  } finally {
    await browser.close();
  }
  console.log(`${fecha}: ${eventos.length} actos en ${imagenes.length} imagen(es)`);
  return { eventos, imagenes };
}

module.exports = { render, clasificar, fechaLarga, hoyMadrid };
if (require.main === module) {
  (async () => {
    for (const f of (process.argv.slice(2).length ? process.argv.slice(2) : [hoyMadrid()])) await render(f);
  })().catch(e => { console.error(e); process.exit(1); });
}
