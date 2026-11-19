// X (Twitter): sube las imágenes (máx. 4) y publica el post. Firma OAuth 1.0a sin dependencias.
// Secrets: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET (de developer.x.com, con permiso "Read and write")
// Etiqueta en la imagen a las cofradías del día (datos.etiquetasX, máx. 10). Los ids de las cuentas
// se buscan una sola vez y se guardan en publicadas/x-usuarios.json para no pagar la búsqueda cada día.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());

function cabeceraOAuth(metodo, url) {
  const o = {
    oauth_consumer_key: process.env.X_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: process.env.X_ACCESS_TOKEN,
    oauth_version: '1.0',
  };
  // Se firman los oauth_* y los parámetros de la URL (con cuerpo JSON o multipart, el cuerpo no se firma)
  const u = new URL(url);
  const firmar = { ...o };
  for (const [k, v] of u.searchParams) firmar[k] = v;
  const params = Object.keys(firmar).sort().map(k => `${enc(k)}=${enc(firmar[k])}`).join('&');
  const base = [metodo, enc(u.origin + u.pathname), enc(params)].join('&');
  const clave = `${enc(process.env.X_API_SECRET)}&${enc(process.env.X_ACCESS_SECRET)}`;
  o.oauth_signature = crypto.createHmac('sha1', clave).update(base).digest('base64');
  return 'OAuth ' + Object.keys(o).sort().map(k => `${enc(k)}="${enc(o[k])}"`).join(', ');
}

async function llamar(url, opciones = {}) {
  const metodo = opciones.method || 'GET';
  const r = await fetch(url, { ...opciones, headers: { ...(opciones.headers || {}), Authorization: cabeceraOAuth(metodo, url) } });
  const texto = await r.text();
  if (!r.ok) throw new Error(`X ${url}: HTTP ${r.status} ${texto.slice(0, 300)}`);
  return texto ? JSON.parse(texto) : {};
}

// Convierte nombres de usuario en ids, usando la caché del repositorio. Si falla, se publica sin etiquetas.
async function idsDeUsuarios(nombres = []) {
  if (!nombres.length) return { ids: [], etiquetadas: [] };
  const fichero = path.join(__dirname, '..', 'publicadas', 'x-usuarios.json');
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(fichero, 'utf8')); } catch {}
  const faltan = nombres.filter(n => !(n.toLowerCase() in cache));
  if (faltan.length) {
    try {
      const r = await llamar(`https://api.x.com/2/users/by?usernames=${faltan.join(',')}`);
      for (const u of r.data || []) cache[u.username.toLowerCase()] = u.id;
      // Las que no existen se apuntan como null para no volver a buscarlas
      for (const n of faltan) if (!(n.toLowerCase() in cache)) cache[n.toLowerCase()] = null;
      fs.mkdirSync(path.dirname(fichero), { recursive: true });
      fs.writeFileSync(fichero, JSON.stringify(cache, null, 2));
    } catch (e) { console.warn('X: no se pudieron buscar las cuentas a etiquetar:', e.message); }
  }
  const etiquetadas = nombres.filter(n => cache[n.toLowerCase()]);
  return { ids: etiquetadas.map(n => cache[n.toLowerCase()]), etiquetadas };
}

module.exports = {
  nombre: 'x',
  activo: () => ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'].every(k => process.env[k]),
  // Prueba invisible: sube las imágenes (X las borra a las 24 h) y comprueba la cuenta, sin publicar
  probar: args => module.exports.publicar(args, true),
  async publicar({ carpeta, datos }, soloProbar = false) {
    const ids = [];
    for (const n of datos.imagenes.slice(0, 4)) {
      const form = new FormData();
      form.append('media', new Blob([fs.readFileSync(path.join(carpeta, n))], { type: 'image/jpeg' }), n);
      form.append('media_category', 'tweet_image');
      const r = await llamar('https://api.x.com/2/media/upload', { method: 'POST', body: form });
      const id = (r.data && r.data.id) || r.media_id_string;
      ids.push(id);
      // Texto alternativo (si falla, no impide publicar)
      try {
        await llamar('https://api.x.com/2/media/metadata', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, metadata: { alt_text: { text: datos.textos.alt.slice(0, 1000) } } }),
        });
      } catch (e) { console.warn('X: no se pudo poner el texto alternativo:', e.message); }
    }
    const etiquetas = await idsDeUsuarios(datos.etiquetasX);

    // Modo prueba: la imagen se ha subido (invisible, X la borra a las 24 h) pero NO se publica.
    // Se comprueba además a qué cuenta pertenecen las claves.
    if (soloProbar) {
      const yo = await llamar('https://api.x.com/2/users/me');
      return {
        ok: false, prueba: true, cuenta: '@' + yo.data.username, imagenesSubidas: ids.length,
        etiquetaria: etiquetas.etiquetadas.map(n => '@' + n), textoQuePublicaria: datos.textos.x,
      };
    }

    const tuit = media => llamar('https://api.x.com/2/tweets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: datos.textos.x, media }),
    });
    let r, etiquetadas = etiquetas.etiquetadas;
    try {
      r = await tuit(etiquetas.ids.length ? { media_ids: ids, tagged_user_ids: etiquetas.ids } : { media_ids: ids });
    } catch (e) {
      if (!etiquetas.ids.length) throw e;
      // Si X rechaza las etiquetas, se publica igualmente sin ellas
      console.warn('X: no se pudo publicar con etiquetas, se publica sin ellas:', e.message);
      r = await tuit({ media_ids: ids });
      etiquetadas = [];
    }
    return { ok: true, id: r.data && r.data.id, etiquetadas: etiquetadas.map(n => '@' + n) };
  },
};
