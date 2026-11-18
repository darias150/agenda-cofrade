# Agenda Cofrade automática

Cada mañana a las 6:00 (Madrid), **todo el año, los días que haya actos** (los días sin actos no publica nada).
Si prefieres que solo publique en temporada (de Carnaval a Domingo de Resurrección, calculada sola cada año), pon `todoElAnio: false` en `config.js`.

1. Descarga tu Google Calendar.
2. Genera la imagen del día (o varias en carrusel si hay más de 8 actos).
3. La publica en **Instagram, Facebook y X**, y te la manda por **Telegram** para reenviarla al canal de **WhatsApp**.

Se ejecuta gratis en **GitHub Actions**, sin que tu PC esté encendido.

| Archivo | Para qué |
|---|---|
| `config.js` | URL del calendario, temporada, hora, hashtags |
| `cofradias.js` | Claves de detección, nombre y colores de cada cofradía |
| `assets/` | Escudos y figuras de cofrade |
| `render.js` | Diseño de la imagen |
| `preparar.js` | Paso 1: imagen y textos del día → `publicadas/AAAA-MM-DD/` |
| `enviar.js` + `publicar/` | Paso 2: publica en cada red |
| `.github/workflows/agenda.yml` | Horario |

---

## 1. Subirlo a GitHub (una vez)

1. Crea una cuenta en github.com si no tienes.
2. **New repository** → nombre `agenda-cofrade` → **Public**. Tiene que ser público para que Instagram pueda descargar las imágenes. No contiene nada secreto: los tokens van aparte.
3. **Add file → Upload files** y arrastra el **contenido** de esta carpeta, **menos** `node_modules`, `out` y `data`. Asegúrate de que se sube la carpeta `.github`.
4. **Settings → Actions → General → Workflow permissions** → marca **Read and write permissions**.

## 2. Configurar las redes (Settings → Secrets and variables → Actions → New repository secret)

Solo se publica en las redes que tengan sus secrets. Puedes empezar por Telegram e ir añadiendo las demás.

### Telegram (para WhatsApp) — 5 minutos
1. En Telegram, habla con **@BotFather** → `/newbot` → te da un token. → secret `TELEGRAM_TOKEN`
2. Escribe cualquier cosa a tu bot y abre en el navegador `https://api.telegram.org/bot<TOKEN>/getUpdates`. El número de `"chat":{"id":...}` → secret `TELEGRAM_CHAT_ID`

### Instagram + Facebook — lo más laborioso, pero se hace una vez
Requisito: la cuenta de Instagram debe ser **profesional** (Empresa o Creador) y estar **vinculada a tu página de Facebook**.
1. developers.facebook.com → **Crear app** (tipo *Empresa*).
2. En **Graph API Explorer** genera un token de usuario con los permisos:
   `pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish, business_management`
3. Cámbialo por uno de larga duración (herramienta **Access Token Debugger → Extend**).
4. Con ese token, consulta `me/accounts`: el `access_token` de tu página **no caduca**. → secret `META_TOKEN`; el `id` de la página → secret `FB_PAGE_ID`
5. Consulta `<FB_PAGE_ID>?fields=instagram_business_account` → el id → secret `IG_USER_ID`

### X (Twitter)
1. developer.x.com → crea un proyecto y una app. Revisa el plan: las condiciones de X cambian a menudo.
2. En **User authentication settings** pon permisos **Read and write**.
3. En **Keys and tokens** genera (después de poner Read and write) las 4 claves → secrets `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`

## 3. Probar

**Actions → Agenda cofrade diaria → Run workflow**:
- Fecha `2026-03-23`, **ensayo ✔**, **forzar ✔** → genera la imagen sin publicar (la verás en `publicadas/2026-03-23/`).
- Quita **ensayo** con solo Telegram configurado → te debería llegar al móvil.

Si algo falla, la ejecución sale en rojo y GitHub te avisa por correo. El detalle queda en `publicadas/<fecha>/resultado.json`. Al día siguiente no se repite en las redes que ya funcionaron.

## ⚠️ Importante cada año
GitHub **desactiva los horarios** de un repositorio tras 60 días sin actividad. Publicando todo el año no debería pasar, pero si en verano hay muchas semanas sin actos, **a finales de enero** entra en **Actions** y, si ves el aviso, pulsa **Enable workflow**.

## Probar en tu PC
```
npm install
node render.js 2026-03-23          (solo la imagen, en out/)
```
