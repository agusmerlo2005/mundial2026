// Estructura aproximada al álbum Panini (Mundial 2026 tiene 48 selecciones).
// Cada selección: 1 escudo + 1 foto del equipo + 16 jugadores = 18 figuritas.
// Más secciones especiales (intro, estadios, leyendas).

export const TEAMS = [
  { code: 'ARG', name: 'Argentina' },
  { code: 'AUS', name: 'Australia' },
  { code: 'AUT', name: 'Austria' },
  { code: 'BEL', name: 'Bélgica' },
  { code: 'BOL', name: 'Bolivia' },
  { code: 'BRA', name: 'Brasil' },
  { code: 'CAN', name: 'Canadá' },
  { code: 'CIV', name: 'Costa de Marfil' },
  { code: 'CMR', name: 'Camerún' },
  { code: 'COL', name: 'Colombia' },
  { code: 'CRC', name: 'Costa Rica' },
  { code: 'CRO', name: 'Croacia' },
  { code: 'DEN', name: 'Dinamarca' },
  { code: 'ECU', name: 'Ecuador' },
  { code: 'EGY', name: 'Egipto' },
  { code: 'ENG', name: 'Inglaterra' },
  { code: 'ESP', name: 'España' },
  { code: 'FRA', name: 'Francia' },
  { code: 'GER', name: 'Alemania' },
  { code: 'GHA', name: 'Ghana' },
  { code: 'HON', name: 'Honduras' },
  { code: 'IRN', name: 'Irán' },
  { code: 'IRQ', name: 'Iraq' },
  { code: 'ITA', name: 'Italia' },
  { code: 'JPN', name: 'Japón' },
  { code: 'KOR', name: 'Corea del Sur' },
  { code: 'KSA', name: 'Arabia Saudita' },
  { code: 'MAR', name: 'Marruecos' },
  { code: 'MEX', name: 'México' },
  { code: 'NED', name: 'Países Bajos' },
  { code: 'NGA', name: 'Nigeria' },
  { code: 'NOR', name: 'Noruega' },
  { code: 'NZL', name: 'Nueva Zelanda' },
  { code: 'PAN', name: 'Panamá' },
  { code: 'PAR', name: 'Paraguay' },
  { code: 'PER', name: 'Perú' },
  { code: 'POL', name: 'Polonia' },
  { code: 'POR', name: 'Portugal' },
  { code: 'QAT', name: 'Qatar' },
  { code: 'SEN', name: 'Senegal' },
  { code: 'SUI', name: 'Suiza' },
  { code: 'SVK', name: 'Eslovaquia' },
  { code: 'TUN', name: 'Túnez' },
  { code: 'TUR', name: 'Turquía' },
  { code: 'URU', name: 'Uruguay' },
  { code: 'USA', name: 'Estados Unidos' },
  { code: 'UZB', name: 'Uzbekistán' },
  { code: 'VEN', name: 'Venezuela' },
]

const STICKERS_PER_TEAM = 18

function buildTeamStickers() {
  const list = []
  for (const team of TEAMS) {
    for (let i = 1; i <= STICKERS_PER_TEAM; i++) {
      const num = String(i).padStart(2, '0')
      list.push({
        code: `${team.code}${num}`,
        section: team.name,
        sectionCode: team.code,
        label: i === 1 ? 'Escudo' : i === 2 ? 'Plantel' : `Jugador ${i - 2}`,
      })
    }
  }
  return list
}

const SPECIAL = [
  { code: 'FWC01', section: 'Intro', sectionCode: 'INTRO', label: 'Logo FIFA' },
  { code: 'FWC02', section: 'Intro', sectionCode: 'INTRO', label: 'Trofeo' },
  { code: 'FWC03', section: 'Intro', sectionCode: 'INTRO', label: 'Mascota' },
  { code: 'FWC04', section: 'Intro', sectionCode: 'INTRO', label: 'Pelota oficial' },
  { code: 'FWC05', section: 'Intro', sectionCode: 'INTRO', label: 'Póster' },
]

const STADIUMS = [
  'AT&T Stadium',
  'SoFi Stadium',
  'MetLife Stadium',
  'Mercedes-Benz Stadium',
  'Lincoln Financial Field',
  'Hard Rock Stadium',
  'Lumen Field',
  'Levi’s Stadium',
  'GEHA Field at Arrowhead',
  'NRG Stadium',
  'Gillette Stadium',
  'BMO Field',
  'BC Place',
  'Estadio Azteca',
  'Estadio Akron',
  'Estadio BBVA',
].map((name, i) => ({
  code: `EST${String(i + 1).padStart(2, '0')}`,
  section: 'Estadios',
  sectionCode: 'EST',
  label: name,
}))

const LEGENDS = Array.from({ length: 20 }, (_, i) => ({
  code: `LEG${String(i + 1).padStart(2, '0')}`,
  section: 'Leyendas',
  sectionCode: 'LEG',
  label: `Leyenda ${i + 1}`,
}))

export const STICKERS = [...SPECIAL, ...STADIUMS, ...LEGENDS, ...buildTeamStickers()]

export const SECTIONS = [
  { code: 'INTRO', name: 'Intro' },
  { code: 'EST', name: 'Estadios' },
  { code: 'LEG', name: 'Leyendas' },
  ...TEAMS.map((t) => ({ code: t.code, name: t.name })),
]

export const TOTAL_STICKERS = STICKERS.length
