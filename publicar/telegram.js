// Telegram: te manda las imágenes con el texto a un chat (tú, un grupo o un canal).
// Desde ahí se reenvían al canal de WhatsApp en un momento.
// Secrets: TELEGRAM_TOKEN (de @BotFather) y TELEGRAM_CHAT_ID
const fs = require('fs');
const path = require('path');

const activo = () => !!(process.env.TELEGRAM_TOKEN && process.env.TELEGRAM_CHAT_ID);

async function publicar({ carpeta, datos }) {
  const api = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;
  const form = new FormData();
  form.append('chat_id', process.env.TELEGRAM_CHAT_ID);
  const archivo = n => new Blob([fs.readFileSync(path.join(carpeta, n))], { type: 'image/jpeg' });

  let metodo;
  if (datos.imagenes.length === 1) {
    metodo = 'sendPhoto';
    form.append('photo', archivo(datos.imagenes[0]), datos.imagenes[0]);
    form.append('caption', datos.textos.telegram);
  } else {
    metodo = 'sendMediaGroup';
    form.append('media', JSON.stringify(datos.imagenes.map((n, i) => ({
      type: 'photo', media: `attach://f${i}`, ...(i === 0 ? { caption: datos.textos.telegram } : {}),
    }))));
    datos.imagenes.forEach((n, i) => form.append(`f${i}`, archivo(n), n));
  }
  const r = await (await fetch(`${api}/${metodo}`, { method: 'POST', body: form })).json();
  if (!r.ok) throw new Error(`Telegram: ${r.description}`);
  return { ok: true };
}

// Prueba invisible: solo comprueba que el bot existe (no manda nada)
async function probar() {
  const r = await (await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/getMe`)).json();
  if (!r.ok) throw new Error(`Telegram: ${r.description}`);
  return { ok: true, bot: '@' + r.result.username };
}

module.exports = { nombre: 'telegram', activo, publicar, probar };
