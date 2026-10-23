import indexFile from './resorts-europe.json';
import { RESORT_RESEARCH, type ResortResearch } from './resorts-europe-research';
import type { Airport, Resort } from '../types';

/** One resort as indexed from skiresort.com by scripts/index-resorts.mjs. */
export interface IndexedResort {
  name: string;
  slug: string;
  source: string; // skiresort.com page
  country: string;
  region: string;
  rating: number | null; // test result, out of 5
  elevation: { diff: number | null; base: number | null; top: number | null };
  km: { total: number | null; easy: number | null; intermediate: number | null; difficult: number | null };
  lifts: number | null;
  snowReliability: number | null; // out of 5
  ratings: Record<string, number>; // every test category, out of 5
  airports: { iata: string; name: string; country: string; km: number; driveMin: number }[];
  train: { direct: boolean; lines: string[]; info: string } | null;
  towns: string[];
  map: { full: string; thumb: string; page: string } | null;
  snowmakingPct: number | null;
  longestRun: { name: string; km: number } | null;
}

export type ResortIndexEntry = IndexedResort & { research?: ResortResearch };

export const INDEX_FETCHED_AT: string = indexFile.fetchedAt;
export const INDEX_SOURCE: string = indexFile.source;

export const RESORT_INDEX: Record<string, ResortIndexEntry> = Object.fromEntries(
  (indexFile.resorts as IndexedResort[]).map((r) => [r.slug, { ...r, research: RESORT_RESEARCH[r.slug] }]),
);

/** Airports straight from skiresort, else the researched estimates. */
export const indexAirports = (r: ResortIndexEntry) => (r.airports.length ? r.airports : r.research?.airports ?? []);

const pct = (part: number | null, total: number | null) => (part && total ? Math.round((part / total) * 100) : undefined);

/** A catalog entry for an indexed resort (id = its skiresort slug). */
export function resortFromIndex(r: ResortIndexEntry): Resort {
  return {
    id: r.slug,
    indexSlug: r.slug,
    name: r.name,
    country: r.country,
    region: r.region,
    info: {
      altitudeBase: r.elevation.base ?? undefined,
      altitudeTop: r.elevation.top ?? undefined,
      pisteKm: r.km.total ?? undefined,
      lifts: r.lifts ?? undefined,
      levels: { beginner: pct(r.km.easy, r.km.total), intermediate: pct(r.km.intermediate, r.km.total), advanced: pct(r.km.difficult, r.km.total) },
      website: r.source,
    },
    airports: indexAirports(r).map((a) => ({ iata: a.iata, distanceKm: a.km, driveTimeMin: a.driveMin })),
  };
}

export const INDEXED_RESORTS: Resort[] = Object.values(RESORT_INDEX).map(resortFromIndex);

/** Every airport the index mentions, for the airport catalog. */
export const INDEX_AIRPORT_LIST: Airport[] = Object.values(
  Object.fromEntries(
    Object.values(RESORT_INDEX)
      .flatMap(indexAirports)
      .map((a) => [a.iata, { iata: a.iata, name: `${a.name} Airport`, city: a.name, country: a.country }]),
  ),
);

/**
 * Starter resorts that are part of an indexed ski area: their trips move to the indexed entry.
 * (Val Thorens and Courchevel are both in Les 3 Vallées; Cervinia is in the Matterhorn area.)
 */
export const SEED_TO_INDEX: Record<string, string> = {
  'val-thorens': 'les-3-vallees-val-thorens-les-menuires-meribel-courchevel',
  courchevel: 'les-3-vallees-val-thorens-les-menuires-meribel-courchevel',
  'st-anton': 'st-anton-st-christoph-stuben-lech-zuers-warth-schroecken-ski-arlberg',
  ischgl: 'ischgl-samnaun-silvretta-arena',
  kitzbuehel: 'kitzski-kitzbuehel-kirchberg',
  zermatt: 'zermatt-breuil-cervinia-valtournenche-matterhorn',
  cervinia: 'zermatt-breuil-cervinia-valtournenche-matterhorn',
  'val-gardena': 'val-gardena-groeden',
  grandvalira: 'grandvalira-pas-de-la-casa-grau-roig-soldeu-el-tarter-canillo-encamp',
};

/** Friendly labels for the test categories worth showing. */
export const RATING_LABELS: [string, string][] = [
  ['Beginners', 'Beginners'],
  ['Families and children', 'Families'],
  ['Advanced skiers, freeriders', 'Advanced & freeride'],
  ['Slope preparation', 'Slope grooming'],
  ['Lifts and cable cars', 'Lifts'],
  ['Snow parks', 'Snow parks'],
  ['Après-ski', 'Après-ski'],
  ['Mountain restaurants, ski huts, gastronomy', 'Mountain food'],
  ['Accommodation offering directly at the slopes and lifts', 'Ski-in lodging'],
  ['Access, on-site parking', 'Access & parking'],
];
