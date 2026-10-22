import type { Airport, AppData, Resort } from '../types';

export const SEED_AIRPORTS: Airport[] = [
  { iata: 'GVA', name: 'Geneva Airport', city: 'Geneva', country: 'Switzerland' },
  { iata: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland' },
  { iata: 'LYS', name: 'Lyon–Saint Exupéry', city: 'Lyon', country: 'France' },
  { iata: 'CMF', name: 'Chambéry Savoie Mont Blanc', city: 'Chambéry', country: 'France' },
  { iata: 'GNB', name: 'Grenoble Alpes-Isère', city: 'Grenoble', country: 'France' },
  { iata: 'INN', name: 'Innsbruck Airport', city: 'Innsbruck', country: 'Austria' },
  { iata: 'SZG', name: 'Salzburg Airport', city: 'Salzburg', country: 'Austria' },
  { iata: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'Germany' },
  { iata: 'FDH', name: 'Friedrichshafen Airport', city: 'Friedrichshafen', country: 'Germany' },
  { iata: 'MXP', name: 'Milan Malpensa', city: 'Milan', country: 'Italy' },
  { iata: 'BGY', name: 'Milan Bergamo', city: 'Bergamo', country: 'Italy' },
  { iata: 'TRN', name: 'Turin Airport', city: 'Turin', country: 'Italy' },
  { iata: 'VRN', name: 'Verona Villafranca', city: 'Verona', country: 'Italy' },
  { iata: 'VCE', name: 'Venice Marco Polo', city: 'Venice', country: 'Italy' },
  { iata: 'SOF', name: 'Sofia Airport', city: 'Sofia', country: 'Bulgaria' },
  { iata: 'PDV', name: 'Plovdiv Airport', city: 'Plovdiv', country: 'Bulgaria' },
  { iata: 'BCN', name: 'Barcelona–El Prat', city: 'Barcelona', country: 'Spain' },
  { iata: 'TLS', name: 'Toulouse–Blagnac', city: 'Toulouse', country: 'France' },
  { iata: 'TBS', name: 'Tbilisi International', city: 'Tbilisi', country: 'Georgia' },
];

// Distances and drive times are approximate; resort info is a starting point to refine later.
export const SEED_RESORTS: Resort[] = [
  {
    id: 'val-thorens',
    name: 'Val Thorens',
    country: 'France',
    region: 'Savoie',
    info: { altitudeBase: 2300, altitudeTop: 3230, pisteKm: 600, skiArea: 'Les 3 Vallées' },
    airports: [
      { iata: 'CMF', distanceKm: 115, driveTimeMin: 105 },
      { iata: 'GVA', distanceKm: 160, driveTimeMin: 150 },
      { iata: 'LYS', distanceKm: 190, driveTimeMin: 150 },
    ],
  },
  {
    id: 'courchevel',
    name: 'Courchevel',
    country: 'France',
    region: 'Savoie',
    info: { altitudeBase: 1300, altitudeTop: 2738, pisteKm: 600, skiArea: 'Les 3 Vallées' },
    airports: [
      { iata: 'CMF', distanceKm: 110, driveTimeMin: 105 },
      { iata: 'GVA', distanceKm: 150, driveTimeMin: 135 },
      { iata: 'LYS', distanceKm: 185, driveTimeMin: 150 },
    ],
  },
  {
    id: 'chamonix',
    name: 'Chamonix',
    country: 'France',
    region: 'Haute-Savoie',
    info: { altitudeBase: 1035, altitudeTop: 3842, pisteKm: 150, skiArea: 'Chamonix Mont-Blanc' },
    airports: [
      { iata: 'GVA', distanceKm: 88, driveTimeMin: 75 },
      { iata: 'LYS', distanceKm: 220, driveTimeMin: 150 },
    ],
  },
  {
    id: 'st-anton',
    name: 'St. Anton am Arlberg',
    country: 'Austria',
    region: 'Tyrol',
    info: { altitudeBase: 1304, altitudeTop: 2811, pisteKm: 305, skiArea: 'Ski Arlberg' },
    airports: [
      { iata: 'INN', distanceKm: 100, driveTimeMin: 75 },
      { iata: 'FDH', distanceKm: 130, driveTimeMin: 105 },
      { iata: 'ZRH', distanceKm: 200, driveTimeMin: 150 },
    ],
  },
  {
    id: 'ischgl',
    name: 'Ischgl',
    country: 'Austria',
    region: 'Tyrol',
    info: { altitudeBase: 1377, altitudeTop: 2872, pisteKm: 239, skiArea: 'Silvretta Arena' },
    airports: [
      { iata: 'INN', distanceKm: 100, driveTimeMin: 80 },
      { iata: 'ZRH', distanceKm: 220, driveTimeMin: 165 },
      { iata: 'MUC', distanceKm: 290, driveTimeMin: 195 },
    ],
  },
  {
    id: 'kitzbuehel',
    name: 'Kitzbühel',
    country: 'Austria',
    region: 'Tyrol',
    info: { altitudeBase: 800, altitudeTop: 2000, pisteKm: 233, skiArea: 'KitzSki' },
    airports: [
      { iata: 'SZG', distanceKm: 80, driveTimeMin: 75 },
      { iata: 'INN', distanceKm: 100, driveTimeMin: 75 },
      { iata: 'MUC', distanceKm: 160, driveTimeMin: 120 },
    ],
  },
  {
    id: 'zermatt',
    name: 'Zermatt',
    country: 'Switzerland',
    region: 'Valais',
    info: { altitudeBase: 1620, altitudeTop: 3883, pisteKm: 360, skiArea: 'Matterhorn Ski Paradise' },
    airports: [
      { iata: 'GVA', distanceKm: 240, driveTimeMin: 210 },
      { iata: 'ZRH', distanceKm: 240, driveTimeMin: 210 },
      { iata: 'MXP', distanceKm: 180, driveTimeMin: 165 },
    ],
  },
  {
    id: 'cervinia',
    name: 'Cervinia',
    country: 'Italy',
    region: "Valle d'Aosta",
    info: { altitudeBase: 2050, altitudeTop: 3480, pisteKm: 360, skiArea: 'Matterhorn Ski Paradise' },
    airports: [
      { iata: 'TRN', distanceKm: 120, driveTimeMin: 105 },
      { iata: 'MXP', distanceKm: 180, driveTimeMin: 135 },
      { iata: 'GVA', distanceKm: 175, driveTimeMin: 150 },
    ],
  },
  {
    id: 'val-gardena',
    name: 'Val Gardena',
    country: 'Italy',
    region: 'South Tyrol',
    info: { altitudeBase: 1236, altitudeTop: 2518, pisteKm: 175, skiArea: 'Dolomiti Superski / Sella Ronda' },
    airports: [
      { iata: 'INN', distanceKm: 120, driveTimeMin: 105 },
      { iata: 'VRN', distanceKm: 200, driveTimeMin: 150 },
      { iata: 'VCE', distanceKm: 230, driveTimeMin: 165 },
    ],
  },
  {
    id: 'livigno',
    name: 'Livigno',
    country: 'Italy',
    region: 'Lombardy',
    info: { altitudeBase: 1816, altitudeTop: 2798, pisteKm: 115 },
    airports: [
      { iata: 'BGY', distanceKm: 200, driveTimeMin: 210 },
      { iata: 'MXP', distanceKm: 230, driveTimeMin: 225 },
      { iata: 'INN', distanceKm: 180, driveTimeMin: 165 },
    ],
  },
  {
    id: 'bansko',
    name: 'Bansko',
    country: 'Bulgaria',
    region: 'Blagoevgrad',
    info: { altitudeBase: 990, altitudeTop: 2600, pisteKm: 75 },
    airports: [
      { iata: 'SOF', distanceKm: 160, driveTimeMin: 120 },
      { iata: 'PDV', distanceKm: 190, driveTimeMin: 165 },
    ],
  },
  {
    id: 'grandvalira',
    name: 'Grandvalira',
    country: 'Andorra',
    region: 'Andorra',
    info: { altitudeBase: 1710, altitudeTop: 2640, pisteKm: 210 },
    airports: [
      { iata: 'TLS', distanceKm: 190, driveTimeMin: 180 },
      { iata: 'BCN', distanceKm: 200, driveTimeMin: 180 },
    ],
  },
  {
    id: 'gudauri',
    name: 'Gudauri',
    country: 'Georgia',
    region: 'Mtskheta-Mtianeti',
    info: { altitudeBase: 1990, altitudeTop: 3276, pisteKm: 75 },
    airports: [{ iata: 'TBS', distanceKm: 120, driveTimeMin: 120 }],
  },
];

/** Season ending in `year`: 1 Dec of the previous year to 30 Apr. */
export const defaultSeason = (year: number) => ({ start: `${year - 1}-12-01`, end: `${year}-04-30` });

/** The winter worth planning now: from June onward it's next winter, Jan–May it's the current one. */
export const upcomingWinterYear = (today = new Date()) => (today.getMonth() >= 5 ? today.getFullYear() + 1 : today.getFullYear());

export function createInitialData(): AppData {
  return {
    version: 2,
    settings: { currency: 'EUR', activeWinterId: null },
    friends: [],
    winters: [],
    vacations: [],
    airports: SEED_AIRPORTS,
    resorts: SEED_RESORTS,
    trips: [],
  };
}
