// Ajustes generales. Lo secreto (tokens) NO va aquí: va en los "Secrets" de GitHub.
module.exports = {
  // Calendario público de Google (formato iCal)
  ics: 'https://calendar.google.com/calendar/ical/d6f656551ecb2eb3daa6dabb602604972973d30e48b8143ccc379e9657eeb0b7%40group.calendar.google.com/public/basic.ics',

  // true = publica TODO EL AÑO (cualquier día que haya actos; los días sin actos no publica nada).
  // false = solo en temporada (ver abajo).
  todoElAnio: true,

  // Temporada en la que se publica (solo si todoElAnio es false), calculada sola cada año a partir de la Pascua:
  // desde N días antes del Miércoles de Ceniza (5 = viernes de Carnaval) hasta N días después del Domingo de Resurrección.
  diasAntesDeCeniza: 5,
  diasDespuesDePascua: 0,

  // Hora (Madrid) a partir de la cual se publica
  hora: 6,
  // Si por un retraso de GitHub el aviso llega a partir de esta hora, ese día ya no se publica (24 = sin límite)
  horaLimite: 12,

  web: 'www.valladolidcofrade.com',
  hashtags: '#SemanaSantaValladolid #Valladolid #Cuaresma',
};
