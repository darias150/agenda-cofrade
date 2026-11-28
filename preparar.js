// Paso 1 (6:00): descarga el calendario, genera las imágenes y los textos del día
// y lo deja todo en publicadas/AAAA-MM-DD/ para que se suba al repositorio (así las imágenes tienen URL pública).
//
// Uso: node preparar.js [AAAA-MM-DD]
// Variables: FORZAR=1 (ignora temporada, hora y si ya se publicó)  COMPROBAR_HORA=1 (sale si en Madrid aún no son las 6)
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { render, fechaLarga, hoyMadrid } = require('./render');

const forzar = process.env.FORZAR === '1';

function salida(clave, valor) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${clave}=${valor}\n`);
}
function fin(motivo) { console.log('No se publica:', motivo); salida('hay', 'false'); process.exit(0); }

// Domingo de Resurrección (algoritmo de Meeus/Jones/Butcher)
function pascua(anio) {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(anio, mes - 1, dia));
}
const masDias = (d, n) => new Date(d.getTime() + n * 864e5).toISOString().slice(0, 10);

function temporada(anio) {
  const p = pascua(anio);
  return { inicio: masDias(p, -46 - config.diasAntesDeCeniza), fin: masDias(p, config.diasDespuesDePascua) };
}

function horaMadrid() {
  return +new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false }).format(new Date());
}

// ---------- Textos ----------
function lineaActo(e) {
  const quien = e.cofradia ? e.cofradia.nombre : null;
  const serie = e.dia && e.total ? (e.dia === e.total ? ' (último día)' : ` (día ${e.dia} de ${e.total})`) : '';
  return `🕯️ ${e.hora || 'Todo el día'} · ${quien ? quien + ' — ' : ''}${e.acto}${serie}${e.lugar ? `\n📍 ${e.lugar.split(',')[0]}` : ''}`;
}

function textos(fecha, eventos) {
  const larga = fechaLarga(fecha);                       // "lunes, 23 de marzo de 2026"
  const corta = larga.replace(/ de \d{4}$/, '').replace(',', ''); // "lunes 23 de marzo"
  const cabecera = `🗓️ Agenda Cofrade de Actos y Cultos para hoy ${corta}:`;
  const lista = eventos.map(lineaActo).join('\n\n');
  const largo = `${cabecera}\n\n${lista}\n\nℹ️ Más información en ${config.web}\n\n${config.hashtags}`;
  // Instagram: menciona a las cofradías del día (les llega el aviso). Instagram admite como mucho 20 menciones.
  const menciones = [...new Set(eventos.map(e => e.cofradia && e.cofradia.ig).filter(Boolean))].slice(0, 20).map(u => '@' + u).join(' ');
  const largoIg = menciones ? `${cabecera}\n\n${lista}\n\nℹ️ Más información en ${config.web}\n\n${menciones}\n\n${config.hashtags}` : largo;
  return {
    instagram: largoIg.slice(0, 2200),
    facebook: largo,
    x: config.xTextoLargo
      ? `${cabecera}\n\n${lista}\n\n${config.hashtags}`
      : `🗓️➡️ Agenda Cofrade de Actos y Cultos para hoy ${corta}:\n\n${config.hashtags.split(' ')[0]}`,
    telegram: largo.slice(0, 1024),
    // Texto alternativo de la imagen (accesibilidad)
    alt: `Agenda cofrade del ${larga}. ` + eventos.map(e =>
      `${e.hora || ''} ${e.cofradia ? e.cofradia.nombre + ': ' : ''}${e.acto}${e.lugar ? ', ' + e.lugar.split(',')[0] : ''}`).join('. '),
  };
}

// Cuentas de X a etiquetar en la imagen: la línea "X: @..." del evento o, si no, la de su cofradía (máx. 10)
function etiquetasX(eventos) {
  const vistas = new Map();
  for (const e of eventos) {
    for (const u of e.x || (e.cofradia && e.cofradia.x ? [e.cofradia.x] : [])) {
      if (!vistas.has(u.toLowerCase())) vistas.set(u.toLowerCase(), u);
    }
  }
  return [...vistas.values()].slice(0, 10);
}

// ---------- Principal ----------
if (require.main === module) (async () => {
  const fecha = process.argv[2] || hoyMadrid();
  const carpeta = path.join(__dirname, 'publicadas', fecha);

  if (!forzar) {
    const t = temporada(+fecha.slice(0, 4));
    if (!config.todoElAnio && (fecha < t.inicio || fecha > t.fin)) fin(`${fecha} está fuera de temporada (${t.inicio} → ${t.fin})`);
    if (process.env.COMPROBAR_HORA === '1' && horaMadrid() < config.hora) fin(`en Madrid aún no son las ${config.hora}:00`);
    if (process.env.COMPROBAR_HORA === '1' && horaMadrid() >= (config.horaLimite || 24)) fin(`ya son más de las ${config.horaLimite}:00, se publicaría demasiado tarde`);
    // Solo cuenta como hecho si se llegó a publicar (las pruebas en ensayo no dejan resultado.json)
    if (fs.existsSync(path.join(carpeta, 'resultado.json'))) fin(`${fecha} ya estaba publicado`);
  }

  // Calendario siempre recién descargado
  const icsPath = path.join(__dirname, 'data', 'calendario.ics');
  fs.mkdirSync(path.dirname(icsPath), { recursive: true });
  const r = await fetch(config.ics);
  if (!r.ok) throw new Error(`No se pudo descargar el calendario: HTTP ${r.status}`);
  fs.writeFileSync(icsPath, await r.text());

  const { eventos, imagenes, historias } = await render(fecha, { ics: icsPath, salida: carpeta, nombre: 'agenda', saltarVacios: true, historias: true });
  if (!eventos.length) fin(`no hay actos el ${fecha}`);

  const datos = {
    fecha, imagenes: imagenes.map(i => path.basename(i)), historias: historias.map(i => path.basename(i)),
    actos: eventos.length, textos: textos(fecha, eventos),
    etiquetasX: etiquetasX(eventos),
  };
  fs.writeFileSync(path.join(carpeta, 'publicacion.json'), JSON.stringify(datos, null, 2));
  console.log(`Preparado ${fecha}: ${eventos.length} actos, ${imagenes.length} imagen(es) en ${carpeta}`);
  salida('hay', 'true');
  salida('fecha', fecha);
})().catch(e => { console.error(e); process.exit(1); });

module.exports = { pascua, temporada, etiquetasX };
