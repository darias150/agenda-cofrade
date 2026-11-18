// X (Twitter): sube las imágenes (máx. 4) y publica el post. Firma OAuth 1.0a sin dependencias.
// Secrets: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET (de developer.x.com, con permiso "Read and write")
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
  // Con cuerpo JSON o multipart, solo se firman los parámetros oauth_*
  const params = Object.keys(o).sort().map(k => `${enc(k)}=${enc(o[k])}`).join('&');
  const base = [metodo, enc(url), enc(params)].join('&');
  const clave = `${enc(process.env.X_API_SECRET)}&${enc(process.env.X_ACCESS_SECRET)}`;
  o.oauth_signature = crypto.createHmac('sha1', clave).update(base).digest('base64');
  return 'OAuth ' + Object.keys(o).sort().map(k => `${enc(k)}="${enc(o[k])}"`).join(', ');
}

async function llamar(url, opciones) {
  const r = await fetch(url, { ...opciones, headers: { ...(opciones.headers || {}), Authorization: cabeceraOAuth('POST', url) } });
  const texto = await r.text();
  if (!r.ok) throw new Error(`X ${url}: HTTP ${r.status} ${texto.slice(0, 300)}`);
  return texto ? JSON.parse(texto) : {};
}

module.exports = {
  nombre: 'x',
  activo: () => ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'].every(k => process.env[k]),
  async publicar({ carpeta, datos }) {
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
    const r = await llamar('https://api.x.com/2/tweets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: datos.textos.x, media: { media_ids: ids } }),
    });
    return { ok: true, id: r.data && r.data.id };
  },
};
