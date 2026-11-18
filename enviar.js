// Paso 2: publica en cada red lo que preparar.js dejó en publicadas/AAAA-MM-DD/.
// Solo publica en las redes que tengan sus secrets configurados, y nunca dos veces en la misma
// (el resultado se guarda en resultado.json). Si una red falla, las demás siguen.
//
// Uso: node enviar.js [AAAA-MM-DD]
// Variables: URL_BASE (dónde quedan públicas las imágenes), ENSAYO=1 (no publica, solo enseña lo que haría)
const fs = require('fs');
const path = require('path');
const { hoyMadrid } = require('./render');
const { instagram, facebook } = require('./publicar/meta');
const REDES = [require('./publicar/telegram'), instagram, facebook, require('./publicar/x')];

(async () => {
  const fecha = process.argv[2] || hoyMadrid();
  const carpeta = path.join(__dirname, 'publicadas', fecha);
  const fichero = path.join(carpeta, 'publicacion.json');
  if (!fs.existsSync(fichero)) { console.log(`No hay nada preparado para ${fecha}`); return; }

  const datos = JSON.parse(fs.readFileSync(fichero, 'utf8'));
  const resPath = path.join(carpeta, 'resultado.json');
  const resultado = fs.existsSync(resPath) ? JSON.parse(fs.readFileSync(resPath, 'utf8')) : {};
  const base = (process.env.URL_BASE || '').replace(/\/$/, '');
  const urls = datos.imagenes.map(n => `${base}/publicadas/${fecha}/${n}`);
  const ensayo = process.env.ENSAYO === '1';

  let fallos = 0;
  for (const red of REDES) {
    if (resultado[red.nombre] && resultado[red.nombre].ok) { console.log(`${red.nombre}: ya publicado`); continue; }
    if (!red.activo()) { console.log(`${red.nombre}: sin configurar, se salta`); continue; }
    if (ensayo) { console.log(`${red.nombre}: [ENSAYO] publicaría ${urls.length} imagen(es)`); continue; }
    try {
      resultado[red.nombre] = { ...(await red.publicar({ carpeta, datos, urls })), hora: new Date().toISOString() };
      console.log(`${red.nombre}: publicado ✔`);
    } catch (e) {
      fallos++;
      resultado[red.nombre] = { ok: false, error: e.message, hora: new Date().toISOString() };
      console.error(`${red.nombre}: ERROR ${e.message}`);
    }
  }
  if (!ensayo) fs.writeFileSync(resPath, JSON.stringify(resultado, null, 2));
  // Si algo falló, el workflow sale en rojo y GitHub te avisa por correo
  if (fallos) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
