// Estructura basada en el FIFA Panini Collection (álbum DIGITAL oficial,
// by Coca-Cola). Distinto del álbum físico.
//
// Datos confirmados (fuente: FIFA, App Store, descripción oficial):
// - 48 selecciones nacionales
// - 528 figuritas de jugadores (= 11 por equipo)
// - Logos (escudos), mascotas, trofeos, posters
// - "Roll of Honour" (campeones históricos del Mundial)
// - Secciones específicas del Mundial 2026 (estadios, etc.)
// - 12 figuritas exclusivas de Coca-Cola
// - Cosmic stickers (en sobres deluxe)
//
// Los nombres exactos de los 11 jugadores por equipo NO los publica Panini —
// completalos vos en este archivo viendo la app oficial.

// Las 48 selecciones realmente clasificadas al Mundial 2026
// Fuente: clasificación oficial FIFA (cerró el 31/03/2026)
export const TEAMS = [
  { code: 'GER', name: 'Alemania' },
  { code: 'KSA', name: 'Arabia Saudita' },
  { code: 'ALG', name: 'Argelia' },
  { code: 'ARG', name: 'Argentina' },
  { code: 'AUS', name: 'Australia' },
  { code: 'AUT', name: 'Austria' },
  { code: 'BEL', name: 'Bélgica' },
  { code: 'BIH', name: 'Bosnia y Herzegovina' },
  { code: 'BRA', name: 'Brasil' },
  { code: 'CPV', name: 'Cabo Verde' },
  { code: 'CAN', name: 'Canadá' },
  { code: 'COL', name: 'Colombia' },
  { code: 'KOR', name: 'Corea del Sur' },
  { code: 'CIV', name: 'Costa de Marfil' },
  { code: 'CRO', name: 'Croacia' },
  { code: 'CUW', name: 'Curazao' },
  { code: 'ECU', name: 'Ecuador' },
  { code: 'EGY', name: 'Egipto' },
  { code: 'SCO', name: 'Escocia' },
  { code: 'ESP', name: 'España' },
  { code: 'USA', name: 'Estados Unidos' },
  { code: 'FRA', name: 'Francia' },
  { code: 'GHA', name: 'Ghana' },
  { code: 'HAI', name: 'Haití' },
  { code: 'ENG', name: 'Inglaterra' },
  { code: 'IRN', name: 'Irán' },
  { code: 'IRQ', name: 'Iraq' },
  { code: 'JPN', name: 'Japón' },
  { code: 'JOR', name: 'Jordania' },
  { code: 'MAR', name: 'Marruecos' },
  { code: 'MEX', name: 'México' },
  { code: 'NOR', name: 'Noruega' },
  { code: 'NZL', name: 'Nueva Zelanda' },
  { code: 'NED', name: 'Países Bajos' },
  { code: 'PAN', name: 'Panamá' },
  { code: 'PAR', name: 'Paraguay' },
  { code: 'POR', name: 'Portugal' },
  { code: 'QAT', name: 'Qatar' },
  { code: 'COD', name: 'RD Congo' },
  { code: 'CZE', name: 'República Checa' },
  { code: 'SEN', name: 'Senegal' },
  { code: 'RSA', name: 'Sudáfrica' },
  { code: 'SWE', name: 'Suecia' },
  { code: 'SUI', name: 'Suiza' },
  { code: 'TUN', name: 'Túnez' },
  { code: 'TUR', name: 'Turquía' },
  { code: 'URU', name: 'Uruguay' },
  { code: 'UZB', name: 'Uzbekistán' },
]

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
        label: `Jugador ${i}`, // reemplazar con el nombre real desde la app
      })
    }
  }
  return list
}

// Sección de introducción del Mundial 2026
// El "Roll of Honour" (campeones 1930-2022) es solo información del álbum,
// no son figuritas coleccionables — por eso no aparece acá.
const INTRO = [
  { code: '00', section: 'Introducción', sectionCode: 'INTRO', label: 'Logo Panini' },
  { code: 'FWC01', section: 'Introducción', sectionCode: 'INTRO', label: 'Logo FIFA World Cup 26' },
  { code: 'FWC02', section: 'Introducción', sectionCode: 'INTRO', label: 'Trofeo' },
  { code: 'FWC03', section: 'Introducción', sectionCode: 'INTRO', label: 'Pelota oficial' },
  { code: 'FWC04', section: 'Introducción', sectionCode: 'INTRO', label: 'Póster oficial' },
  { code: 'FWC05', section: 'Introducción', sectionCode: 'INTRO', label: 'Maple (mascota Canadá)' },
  { code: 'FWC06', section: 'Introducción', sectionCode: 'INTRO', label: 'Zayu (mascota México)' },
  { code: 'FWC07', section: 'Introducción', sectionCode: 'INTRO', label: 'Clutch (mascota EE.UU.)' },
]

// Sedes/estadios del Mundial 2026 (16 ciudades)
const STADIUMS = [
  { city: 'Atlanta', stadium: 'Mercedes-Benz Stadium' },
  { city: 'Boston', stadium: 'Gillette Stadium' },
  { city: 'Dallas', stadium: 'AT&T Stadium' },
  { city: 'Guadalajara', stadium: 'Estadio Akron' },
  { city: 'Houston', stadium: 'NRG Stadium' },
  { city: 'Kansas City', stadium: 'Arrowhead Stadium' },
  { city: 'Los Angeles', stadium: 'SoFi Stadium' },
  { city: 'Ciudad de México', stadium: 'Estadio Azteca' },
  { city: 'Miami', stadium: 'Hard Rock Stadium' },
  { city: 'Monterrey', stadium: 'Estadio BBVA' },
  { city: 'Nueva York/Nueva Jersey', stadium: 'MetLife Stadium' },
  { city: 'Filadelfia', stadium: 'Lincoln Financial Field' },
  { city: 'San Francisco Bay', stadium: 'Levi’s Stadium' },
  { city: 'Seattle', stadium: 'Lumen Field' },
  { city: 'Toronto', stadium: 'BMO Field' },
  { city: 'Vancouver', stadium: 'BC Place' },
].map((s, i) => ({
  code: `EST${String(i + 1).padStart(2, '0')}`,
  section: 'Estadios',
  sectionCode: 'EST',
  label: `${s.city} — ${s.stadium}`,
}))

// Coca-Cola Special — 12 figuritas exclusivas
const COCA_COLA = Array.from({ length: 12 }, (_, i) => ({
  code: `CC${String(i + 1).padStart(2, '0')}`,
  section: 'Coca-Cola Special',
  sectionCode: 'CC',
  label: `Coca-Cola Star ${i + 1}`, // reemplazar con el nombre real
}))

export const STICKERS = [
  ...INTRO,
  ...STADIUMS,
  ...COCA_COLA,
  ...buildTeamStickers(),
]

export const SECTIONS = [
  { code: 'INTRO', name: 'Introducción' },
  { code: 'EST', name: 'Estadios' },
  { code: 'CC', name: 'Coca-Cola Special' },
  ...TEAMS.map((t) => ({ code: t.code, name: t.name })),
]

export const TOTAL_STICKERS = STICKERS.length
