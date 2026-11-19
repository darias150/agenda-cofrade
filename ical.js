// Lector mínimo de iCal (sin dependencias). Devuelve los eventos de un día en hora de Madrid.
const fs = require('fs');

function unfold(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

function unescape(v) {
  return (v || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

// Convierte una fecha iCal a { fecha: 'YYYY-MM-DD', hora: 'HH:MM' | null } en Europe/Madrid
function toMadrid(prop, value) {
  if (/VALUE=DATE/.test(prop) || /^\d{8}$/.test(value)) {
    return { fecha: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`, hora: null };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, , z] = m;
  if (!z) return { fecha: `${y}-${mo}-${d}`, hora: `${h}:${mi}` }; // ya viene en hora local (TZID=Europe/Madrid)
  const date = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi));
  const parts = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date).reduce((o, p) => ((o[p.type] = p.value), o), {});
  return { fecha: `${parts.year}-${parts.month}-${parts.day}`, hora: `${parts.hour}:${parts.minute}` };
}

// Busca en la descripción una línea "Cartel: https://...jpg" (opcional: "| arriba", "| centro", "| abajo" o "| 30%")
// La descripción puede venir en HTML (Google Calendar lo guarda así), por eso se quitan las etiquetas.
const FOCO = { arriba: '15%', centro: '45%', abajo: '85%' };
function leerCartel(desc) {
  const texto = desc.replace(/<a [^>]*href="([^"]+)"[^>]*>[^<]*<\/a>/gi, '$1').replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;| /g, ' ').replace(/&amp;/g, '&');
  const res = {};
  const m = texto.match(/Cartel:\s*(https?:\/\/[^\s|"<]+)\s*(?:\|\s*(arriba|centro|abajo|\d{1,3}%))?/i);
  if (m) Object.assign(res, { cartel: m[1], cartelFoco: m[2] ? (FOCO[m[2].toLowerCase()] || m[2]) : '30%' });
  // Línea opcional "X: @cuenta1 @cuenta2": cuentas a etiquetar en la imagen de X (manda sobre la de la cofradía)
  const x = texto.match(/(?:^|\n)\s*X:\s*((?:@\w{1,15}[\s,]*)+)/i);
  if (x) res.x = x[1].match(/@\w{1,15}/g).map(s => s.slice(1));
  return res;
}

function parseICS(text) {
  const events = [];
  let cur = null;
  for (const line of unfold(text).split('\n')) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const prop = line.slice(0, i), value = line.slice(i + 1), name = prop.split(';')[0];
    if (name === 'DTSTART') Object.assign(cur, toMadrid(prop, value));
    else if (name === 'DTEND') {
      const f = toMadrid(prop, value);
      // En eventos de día completo, o que acaban a las 00:00, el DTEND es exclusivo: el último día es el anterior
      if (f) cur.fechaFin = (f.hora === null || f.hora === '00:00') ? sumarDias(f.fecha, -1) : f.fecha;
    }
    else if (name === 'SUMMARY') cur.titulo = unescape(value).trim();
    else if (name === 'LOCATION') cur.lugar = unescape(value).trim();
    else if (name === 'DESCRIPTION') Object.assign(cur, leerCartel(unescape(value)));
    else if (name === 'STATUS') cur.estado = value;
    else if (name === 'RRULE') cur.rrule = value;
  }
  return events.filter(e => e.estado !== 'CANCELLED');
}

const numDia = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
const deNumDia = n => new Date(n * 864e5).toISOString().slice(0, 10);
function sumarDias(fecha, n) { return deNumDia(numDia(fecha) + n); }

// ¿Cae el evento en la fecha pedida? Devuelve null si no, o { dia, total } (total null si no se sabe).
// Cubre tres casos: evento de varios días (DTSTART→DTEND), evento repetitivo (RRULE) y evento de un día.
function ocurrencia(e, fecha) {
  if (fecha < e.fecha) return null;
  const n = numDia(fecha) - numDia(e.fecha);

  if (e.rrule) {
    const r = Object.fromEntries(e.rrule.split(';').map(p => p.split('=')));
    const interval = +(r.INTERVAL || 1);
    let hasta = null;
    if (r.UNTIL) hasta = `${r.UNTIL.slice(0, 4)}-${r.UNTIL.slice(4, 6)}-${r.UNTIL.slice(6, 8)}`;
    if (hasta && fecha > hasta) return null;
    if (r.FREQ === 'DAILY') {
      if (n % interval) return null;
      const idx = n / interval;
      if (r.COUNT && idx >= +r.COUNT) return null;
      const total = r.COUNT ? +r.COUNT : hasta ? Math.floor((numDia(hasta) - numDia(e.fecha)) / interval) + 1 : null;
      return { dia: idx + 1, total };
    }
    if (r.FREQ === 'WEEKLY') {
      const dias = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      const wd = dias[new Date(numDia(fecha) * 864e5).getUTCDay()];
      const byday = r.BYDAY ? r.BYDAY.split(',') : [dias[new Date(numDia(e.fecha) * 864e5).getUTCDay()]];
      if (!byday.includes(wd) || Math.floor(n / 7) % interval) return null;
      if (r.COUNT && Math.floor(n / 7) / interval >= Math.ceil(+r.COUNT / byday.length)) return null;
      return { dia: null, total: null }; // semanales (El Hachón, Jueves de Adoración): sin "día X de N"
    }
    return n === 0 ? { dia: null, total: null } : null;
  }

  const fin = e.fechaFin && e.fechaFin > e.fecha ? e.fechaFin : e.fecha;
  if (fecha > fin) return null;
  const total = numDia(fin) - numDia(e.fecha) + 1;
  return total > 1 ? { dia: n + 1, total } : { dia: null, total: null };
}

// Días que dura cada tipo de culto según su nombre
const TIPOS = [
  [/TRIDUO/, 'Triduo', 3], [/QUINARIO/, 'Quinario', 5], [/SEPTENARIO/, 'Septenario', 7],
  [/OCTAVARIO/, 'Octavario', 8], [/NOVENA/, 'Novena', 9],
];
const norm = t => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

function eventosDelDia(icsPath, fecha) {
  const todos = parseICS(fs.readFileSync(icsPath, 'utf8'));
  return todos
    .map(e => ({ e, o: ocurrencia(e, fecha) }))
    .filter(x => x.o)
    .map(({ e, o }) => {
      let { dia, total } = o;
      // Caso 3: el culto se metió como eventos sueltos con el mismo título en días seguidos
      if (dia === null && !e.rrule) {
        const mismos = todos.filter(x => !x.rrule && norm(x.titulo) === norm(e.titulo)).map(x => x.fecha).sort();
        const serie = [fecha];
        for (let f = sumarDias(fecha, -1); mismos.includes(f) || mismos.includes(sumarDias(f, -1)); f = sumarDias(f, -1))
          if (mismos.includes(f)) serie.unshift(f);
        for (let f = sumarDias(fecha, 1); mismos.includes(f) || mismos.includes(sumarDias(f, 1)); f = sumarDias(f, 1))
          if (mismos.includes(f)) serie.push(f);
        if (serie.length > 1) { dia = serie.indexOf(fecha) + 1; total = serie.length; }
      }
      const tipo = TIPOS.find(([re]) => re.test(norm(e.titulo)));
      return { ...e, fecha, culto: tipo ? tipo[1] : null, dia, total: total || (dia && tipo ? tipo[2] : null) };
    })
    .sort((a, b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));
}

module.exports = { parseICS, eventosDelDia };

if (require.main === module) {
  const all = parseICS(fs.readFileSync(process.argv[2], 'utf8'));
  const desde = process.argv[3] || '2026-11-15';
  console.log('Con RRULE:', all.filter(e => e.rrule).length);
  all.filter(e => e.fecha >= desde).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    .forEach(e => console.log(e.fecha, e.hora, '|', e.titulo, '|', e.lugar));
}
