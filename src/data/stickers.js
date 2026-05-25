// Álbum DIGITAL oficial FIFA Panini Collection by Coca-Cola.
// Orden de equipos = orden del álbum = orden por grupos del Mundial 2026.
// iso2 = código ISO 3166-1 alpha-2 para flagcdn.com

export const TEAMS = [
  // Grupo A
  { code: 'MEX', name: 'México',               iso2: 'mx', group: 'A' },
  { code: 'RSA', name: 'Sudáfrica',             iso2: 'za', group: 'A' },
  { code: 'KOR', name: 'Corea del Sur',         iso2: 'kr', group: 'A' },
  { code: 'CZE', name: 'República Checa',       iso2: 'cz', group: 'A' },
  // Grupo B
  { code: 'CAN', name: 'Canadá',                iso2: 'ca', group: 'B' },
  { code: 'BIH', name: 'Bosnia y Herzegovina',  iso2: 'ba', group: 'B' },
  { code: 'QAT', name: 'Qatar',                 iso2: 'qa', group: 'B' },
  { code: 'SUI', name: 'Suiza',                 iso2: 'ch', group: 'B' },
  // Grupo C
  { code: 'BRA', name: 'Brasil',                iso2: 'br', group: 'C' },
  { code: 'MAR', name: 'Marruecos',             iso2: 'ma', group: 'C' },
  { code: 'HAI', name: 'Haití',                 iso2: 'ht', group: 'C' },
  { code: 'SCO', name: 'Escocia',               iso2: 'gb-sct', group: 'C' },
  // Grupo D
  { code: 'USA', name: 'Estados Unidos',        iso2: 'us', group: 'D' },
  { code: 'PAR', name: 'Paraguay',              iso2: 'py', group: 'D' },
  { code: 'AUS', name: 'Australia',             iso2: 'au', group: 'D' },
  { code: 'TUR', name: 'Turquía',               iso2: 'tr', group: 'D' },
  // Grupo E
  { code: 'GER', name: 'Alemania',              iso2: 'de', group: 'E' },
  { code: 'CUW', name: 'Curazao',               iso2: 'cw', group: 'E' },
  { code: 'CIV', name: 'Costa de Marfil',       iso2: 'ci', group: 'E' },
  { code: 'ECU', name: 'Ecuador',               iso2: 'ec', group: 'E' },
  // Grupo F
  { code: 'NED', name: 'Países Bajos',          iso2: 'nl', group: 'F' },
  { code: 'JPN', name: 'Japón',                 iso2: 'jp', group: 'F' },
  { code: 'SWE', name: 'Suecia',                iso2: 'se', group: 'F' },
  { code: 'TUN', name: 'Túnez',                 iso2: 'tn', group: 'F' },
  // Grupo G
  { code: 'BEL', name: 'Bélgica',              iso2: 'be', group: 'G' },
  { code: 'EGY', name: 'Egipto',               iso2: 'eg', group: 'G' },
  { code: 'IRN', name: 'Irán',                 iso2: 'ir', group: 'G' },
  { code: 'NZL', name: 'Nueva Zelanda',         iso2: 'nz', group: 'G' },
  // Grupo H
  { code: 'ESP', name: 'España',               iso2: 'es', group: 'H' },
  { code: 'CPV', name: 'Cabo Verde',            iso2: 'cv', group: 'H' },
  { code: 'KSA', name: 'Arabia Saudita',        iso2: 'sa', group: 'H' },
  { code: 'URU', name: 'Uruguay',              iso2: 'uy', group: 'H' },
  // Grupo I
  { code: 'FRA', name: 'Francia',              iso2: 'fr', group: 'I' },
  { code: 'SEN', name: 'Senegal',              iso2: 'sn', group: 'I' },
  { code: 'IRQ', name: 'Iraq',                 iso2: 'iq', group: 'I' },
  { code: 'NOR', name: 'Noruega',              iso2: 'no', group: 'I' },
  // Grupo J
  { code: 'ARG', name: 'Argentina',            iso2: 'ar', group: 'J' },
  { code: 'ALG', name: 'Argelia',              iso2: 'dz', group: 'J' },
  { code: 'AUT', name: 'Austria',              iso2: 'at', group: 'J' },
  { code: 'JOR', name: 'Jordania',             iso2: 'jo', group: 'J' },
  // Grupo K
  { code: 'POR', name: 'Portugal',             iso2: 'pt', group: 'K' },
  { code: 'COD', name: 'RD Congo',             iso2: 'cd', group: 'K' },
  { code: 'UZB', name: 'Uzbekistán',           iso2: 'uz', group: 'K' },
  { code: 'COL', name: 'Colombia',             iso2: 'co', group: 'K' },
  // Grupo L
  { code: 'ENG', name: 'Inglaterra',           iso2: 'gb-eng', group: 'L' },
  { code: 'CRO', name: 'Croacia',              iso2: 'hr', group: 'L' },
  { code: 'GHA', name: 'Ghana',                iso2: 'gh', group: 'L' },
  { code: 'PAN', name: 'Panamá',               iso2: 'pa', group: 'L' },
]

export const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

// 1 escudo + 11 jugadores = 12 figuritas por equipo (576 totales)
const PLAYERS_PER_TEAM = 11

function buildTeamStickers() {
  const list = []
  for (const team of TEAMS) {
    list.push({
      code: `${team.code}00`,
      section: team.name,
      sectionCode: team.code,
      label: 'Escudo',
    })
    for (let i = 1; i <= PLAYERS_PER_TEAM; i++) {
      const num = String(i).padStart(2, '0')
      list.push({
        code: `${team.code}${num}`,
        section: team.name,
        sectionCode: team.code,
        label: `Jugador ${i}`,
      })
    }
  }
  return list
}

// Sección de introducción
const INTRO = [
  { code: '00',    section: 'Introducción', sectionCode: 'INTRO', label: 'Logo Panini (We Are Panini)' },
  { code: 'FWC01', section: 'Introducción', sectionCode: 'INTRO', label: 'Trofeo 1' },
  { code: 'FWC02', section: 'Introducción', sectionCode: 'INTRO', label: 'Trofeo 2' },
  { code: 'FWC03', section: 'Introducción', sectionCode: 'INTRO', label: 'Mascotas (Maple, Zavu, Clutch)' },
  { code: 'FWC04', section: 'Introducción', sectionCode: 'INTRO', label: 'We Are FIFA' },
  { code: 'FWC05', section: 'Introducción', sectionCode: 'INTRO', label: 'Pelota oficial' },
  { code: 'FWC06', section: 'Introducción', sectionCode: 'INTRO', label: 'Logo FIFA WC 26 — rojo' },
  { code: 'FWC07', section: 'Introducción', sectionCode: 'INTRO', label: 'Logo FIFA WC 26 — verde' },
  { code: 'FWC08', section: 'Introducción', sectionCode: 'INTRO', label: 'Logo FIFA WC 26 — azul' },
]

// Estadios
const STADIUMS = [
  { city: 'Atlanta',              stadium: 'Mercedes-Benz Stadium' },
  { city: 'Boston',               stadium: 'Gillette Stadium' },
  { city: 'Dallas',               stadium: 'AT&T Stadium' },
  { city: 'Guadalajara',          stadium: 'Estadio Akron' },
  { city: 'Houston',              stadium: 'NRG Stadium' },
  { city: 'Kansas City',          stadium: 'Arrowhead Stadium' },
  { city: 'Los Angeles',          stadium: 'SoFi Stadium' },
  { city: 'Ciudad de México',     stadium: 'Estadio Azteca' },
  { city: 'Miami',                stadium: 'Hard Rock Stadium' },
  { city: 'Monterrey',            stadium: 'Estadio BBVA' },
  { city: 'Nueva York/NJ',        stadium: 'MetLife Stadium' },
  { city: 'Filadelfia',           stadium: 'Lincoln Financial Field' },
  { city: 'San Francisco Bay',    stadium: "Levi's Stadium" },
  { city: 'Seattle',              stadium: 'Lumen Field' },
  { city: 'Toronto',              stadium: 'BMO Field' },
  { city: 'Vancouver',            stadium: 'BC Place' },
].map((s, i) => ({
  code: `EST${String(i + 1).padStart(2, '0')}`,
  section: 'Estadios',
  sectionCode: 'EST',
  label: `${s.city} — ${s.stadium}`,
}))

// Coca-Cola Special
const COCA_COLA = Array.from({ length: 14 }, (_, i) => ({
  code: `CC${String(i + 1).padStart(2, '0')}`,
  section: 'Coca-Cola Special',
  sectionCode: 'CC',
  label: `Coca-Cola Star ${i + 1}`,
}))

export const STICKERS = [
  ...INTRO,
  ...STADIUMS,
  ...COCA_COLA,
  ...buildTeamStickers(),
]

export const SECTIONS = [
  { code: 'INTRO', name: 'Introducción' },
  { code: 'EST',   name: 'Estadios' },
  { code: 'CC',    name: 'Coca-Cola Special' },
  ...TEAMS.map((t) => ({ code: t.code, name: t.name })),
]

export const TOTAL_STICKERS = STICKERS.length
