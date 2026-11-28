// Tabla de cofradías: claves de detección (inicio del título, sin tildes), nombre a mostrar,
// colores (principal y acento, sacados del hábito), número de escudo / figura de cofrade,
// cuenta de X (sin @) que se etiqueta en la imagen y cuenta de Instagram (sin @) que se menciona
// en el texto de Instagram. Sin cuenta: null.
// Las de Instagram salen de los enlaces de cada ficha de cofradía de la web (28-11-2026).
// Ajusta los colores a tu gusto: son una primera propuesta a partir de las figuras.
module.exports = [
  { n: 1,  claves: ['SAGRADA CENA', 'CENA'],                 nombre: 'Sagrada Cena',          color: '#B08A2E', acento: '#F3E3B5', x: 'CSagradaCena',    ig: 'csagradacena' },
  { n: 2,  claves: ['ORACION DEL HUERTO', 'HUERTO'],         nombre: 'Oración del Huerto',    color: '#1F7A3A', acento: '#D7EBDD', x: 'oracionhuertova', ig: 'cofradiaoraciondelhuerto' },
  { n: 3,  claves: ['RESUCITADO'],                           nombre: 'Jesús Resucitado',      color: '#2E2E2E', acento: '#ECECEC', x: 'JResucitado',     ig: 'resucitadovall' },
  { n: 4,  claves: ['ATADO', 'COLUMNA'],                     nombre: 'Atado a la Columna',    color: '#4F86C6', acento: '#DCE8F6', x: 'AtadoValladolid', ig: 'atadovalladolid' },
  { n: 5,  claves: ['ARTILLEROS'],                           nombre: 'Artilleros',            color: '#A3202A', acento: '#F4D9DB', x: 'artillerosva',    ig: 'cristo_de_los_artilleros_va' },
  { n: 6,  claves: ['NAZARENO'],                             nombre: 'Jesús Nazareno',        color: '#5B2A86', acento: '#E6DCF0', x: 'nazarenovall',    ig: 'nazarenovalladolid' },
  { n: 7,  claves: ['DESPOJADO'],                            nombre: 'Despojado',             color: '#B3262E', acento: '#F5E6D3', x: 'despojadova',     ig: 'despojadova' },
  { n: 8,  claves: ['SAGRADA PASION', 'PASION'],             nombre: 'Sagrada Pasión',        color: '#3C3C3C', acento: '#E9E9E9', x: 'SagradaPasion',   ig: 'sagradapasion' },
  { n: 9,  claves: ['EXALTACION'],                           nombre: 'Exaltación',            color: '#C0262D', acento: '#DCE4F2', x: 'ExaltacionVa',    ig: 'exaltacion_valladolid' },
  { n: 10, claves: ['SIETE PALABRAS'],                       nombre: 'Siete Palabras',        color: '#B71C1C', acento: '#F3E7D6', x: 'SietePalabrasVA', ig: 'sietepalabrasva' },
  { n: 11, claves: ['CRISTO DE LA LUZ', 'LUZ'],              nombre: 'Cristo de la Luz',      color: '#D81B60', acento: '#F9DCE8', x: 'cristodelaluzva', ig: 'cristodelaluzva' },
  { n: 12, claves: ['PRECIOSA SANGRE', 'SANGRE'],            nombre: 'Preciosa Sangre',       color: '#B71C1C', acento: '#F2D6D6', x: 'PreciosaSangreV', ig: 'preciosasangrev' },
  { n: 13, claves: ['MEDINACELI'],                           nombre: 'Medinaceli',            color: '#2B2B2B', acento: '#EFEFEF', x: 'medinacelivll',   ig: 'medinacelivll' },
  { n: 14, claves: ['DESCENDIMIENTO'],                       nombre: 'Descendimiento',        color: '#6A1B9A', acento: '#EDE0F3', x: 'Descen_VA',       ig: null },
  { n: 15, claves: ['VERA CRUZ'],                            nombre: 'Vera Cruz',             color: '#1B5E20', acento: '#DCEBDD', x: 'SantaVeraCruz',   ig: 'veracruzvalladolid' },
  { n: 16, claves: ['PIEDAD'],                               nombre: 'Piedad',                color: '#1C1C1C', acento: '#E8E8E8', x: 'PiedadVLL',       ig: 'piedadvall_' },
  { n: 17, claves: ['FRANCISCANOS', 'FRANCISCANA'],          nombre: 'Hermandad Franciscana', color: '#6D4C41', acento: '#EEE3DD', x: 'ofscruzdesnuda',  ig: 'ofs_cruzdesnuda' },
  { n: 18, claves: ['SANTO ENTIERRO'],                       nombre: 'Santo Entierro',        color: '#1A1A1A', acento: '#EADFC4', x: 'SantoEntierroVa', ig: null },
  { n: 19, claves: ['SEPULCRO', 'SANTO SEPULCRO'],           nombre: 'Santo Sepulcro',        color: '#5E2A84', acento: '#F4EDB8', x: 'sepulcrova',      ig: 'sepulcrova' },
  { n: 20, claves: ['ANGUSTIAS'],                            nombre: 'Angustias',             color: '#1A2A6C', acento: '#DDE2F2', x: 'Angustiasva',     ig: 'angustiasva' },
];
