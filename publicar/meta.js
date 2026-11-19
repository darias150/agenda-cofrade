// Instagram y Facebook (API Graph de Meta).
// Secrets: META_TOKEN (token de página de larga duración), FB_PAGE_ID, IG_USER_ID
// Instagram descarga la imagen desde una URL pública: por eso antes se suben al repositorio.
const VERSION = process.env.META_API_VERSION || 'v27.0';
const GRAPH = `https://graph.facebook.com/${VERSION}`;

async function graph(ruta, params = {}, metodo = 'POST') {
  const body = new URLSearchParams({ ...params, access_token: process.env.META_TOKEN });
  const url = metodo === 'POST' ? `${GRAPH}/${ruta}` : `${GRAPH}/${ruta}?${body}`;
  const r = await fetch(url, metodo === 'POST' ? { method: 'POST', body } : { method: metodo });
  const j = await r.json();
  if (j.error) throw new Error(`Meta ${ruta}: ${j.error.message}`);
  return j;
}

const esperar = ms => new Promise(r => setTimeout(r, ms));

// Instagram procesa cada contenedor antes de poder publicarlo
async function listo(id) {
  for (let i = 0; i < 20; i++) {
    const { status_code } = await graph(id, { fields: 'status_code' }, 'GET');
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`Instagram: contenedor ${id} en estado ${status_code}`);
    await esperar(3000);
  }
  throw new Error(`Instagram: el contenedor ${id} no terminó de procesarse`);
}

const instagram = {
  nombre: 'instagram',
  activo: () => !!(process.env.META_TOKEN && process.env.IG_USER_ID),
  async publicar({ urls, datos }) {
    const ig = process.env.IG_USER_ID;
    let contenedor;
    if (urls.length === 1) {
      contenedor = (await graph(`${ig}/media`, { image_url: urls[0], caption: datos.textos.instagram })).id;
    } else {
      const hijos = [];
      for (const u of urls) hijos.push((await graph(`${ig}/media`, { image_url: u, is_carousel_item: 'true' })).id);
      for (const h of hijos) await listo(h);
      contenedor = (await graph(`${ig}/media`, { media_type: 'CAROUSEL', children: hijos.join(','), caption: datos.textos.instagram })).id;
    }
    await listo(contenedor);
    const { id } = await graph(`${ig}/media_publish`, { creation_id: contenedor });
    return { ok: true, id };
  },
  // Prueba invisible: Instagram descarga y procesa la imagen, pero NO se publica (el borrador caduca solo en 24 h)
  async probar({ urls, datos }) {
    const ig = process.env.IG_USER_ID;
    const { username } = await graph(ig, { fields: 'username' }, 'GET');
    const contenedor = (await graph(`${ig}/media`, { image_url: urls[0], caption: datos.textos.instagram })).id;
    await listo(contenedor);
    return { ok: true, cuenta: '@' + username, imagen: 'descargada y procesada por Instagram (sin publicar)' };
  },
};

const facebook = {
  nombre: 'facebook',
  activo: () => !!(process.env.META_TOKEN && process.env.FB_PAGE_ID),
  async publicar({ urls, datos }) {
    const page = process.env.FB_PAGE_ID;
    if (urls.length === 1) {
      const r = await graph(`${page}/photos`, { url: urls[0], message: datos.textos.facebook, alt_text_custom: datos.textos.alt });
      return { ok: true, id: r.post_id || r.id };
    }
    const fotos = [];
    for (const u of urls) fotos.push((await graph(`${page}/photos`, { url: u, published: 'false' })).id);
    const r = await graph(`${page}/feed`, {
      message: datos.textos.facebook,
      attached_media: JSON.stringify(fotos.map(id => ({ media_fbid: id }))),
    });
    return { ok: true, id: r.id };
  },
  // Prueba invisible: sube la foto SIN publicar (nadie la ve) y la borra enseguida
  async probar({ urls }) {
    const page = process.env.FB_PAGE_ID;
    const { name } = await graph(page, { fields: 'name' }, 'GET');
    const { id } = await graph(`${page}/photos`, { url: urls[0], published: 'false' });
    let borrada = true;
    try { await graph(id, {}, 'DELETE'); } catch { borrada = false; }
    return { ok: true, pagina: name, imagen: borrada ? 'subida sin publicar y borrada' : `subida sin publicar (id ${id}, no se pudo borrar; no es visible)` };
  },
};

module.exports = { instagram, facebook };
