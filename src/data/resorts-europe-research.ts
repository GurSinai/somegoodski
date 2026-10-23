// Hand-curated extras for the indexed resorts (src/data/resorts-europe.json), gathered from
// resort, operator and travel-guide sites in October 2026. Kept apart from the generated file
// so re-running scripts/index-resorts.mjs never overwrites it.
//
// runs: piste counts by colour, where the resort grades green (France, Spain, Andorra).
// Austria, Switzerland and Italy have no green grade: blue is their easiest.
// airports: only for resorts skiresort.com has no arrival data for (road estimates).

export interface ResortResearch {
  arrival: {
    train?: string;
    bus?: string; // buses, airport shuttles, transfers
    car?: string;
    tip?: string;
  };
  runs?: { green: number; blue: number; red: number; black: number; note?: string };
  airports?: { iata: string; name: string; country: string; km: number; driveMin: number }[];
  sources: string[];
}

export const RESORT_RESEARCH: Record<string, ResortResearch> = {
  'les-3-vallees-val-thorens-les-menuires-meribel-courchevel': {
    arrival: {
      train: 'TGV/TER and the Eurostar ski train to Moûtiers-Salins-Brides; every valley is under an hour on by bus or taxi. Saint-Michel-de-Maurienne serves Orelle.',
      bus: 'Altibus and Ben’s Bus from Geneva (≈3½ h to Les Menuires incl. the Moûtiers change) and Lyon; shared and private transfers from Geneva, Lyon and Chambéry.',
      car: 'A43/N90 to Moûtiers, then the valley roads (Courchevel, Méribel, Belleville).',
      tip: 'Book the Moûtiers bus in advance; allow a margin after flights.',
    },
    runs: { green: 53, blue: 136, red: 108, black: 37, note: 'Official press kit; other counts range 330–342 runs.' },
    sources: ['https://www.les3vallees.com/en/guide/travel-to-les-3-vallees/by-plane', 'https://www.altibus.com/en/stations-desservies/les-menuires/', 'https://press.les3vallees.com/media/download/by-the-numbers.pdf'],
  },
  'les-portes-du-soleil-morzine-avoriaz-les-gets-chatel-morgins-champery': {
    arrival: {
      train: 'TGV to Cluses or Thonon-les-Bains (Léman Express from Geneva too), then ~40–45 min by bus or transfer. Champéry (Swiss side) has its own station.',
      bus: 'Scheduled buses from Geneva airport and stations: Altibus, SAT Léman, Swiss Tour, Easybus (Geneva airport ↔ Avoriaz).',
      car: 'About 1h20 from Geneva airport to Morzine/Avoriaz.',
    },
    runs: { green: 39, blue: 131, red: 105, black: 33, note: '2025–26 count (Alti-mag); older sources list ≈286 runs.' },
    sources: ['https://www.avoriaz.com/en/staying/access-and-transport/come-to-avoriaz/', 'https://morznet.com/getting-here', 'https://www.alti-mag.com/en/domaines-skiables/les-portes-du-soleil'],
  },
  '4-vallees-verbier-la-tzoumaz-nendaz-veysonnaz-thyon': {
    arrival: {
      train: 'Direct IR90 from Geneva airport to Martigny (every 30 min, ≈1¾ h), St-Bernard Express to Le Châble, then the gondola into Verbier (≈10 min).',
      bus: 'Buses Le Châble ↔ Verbier (≈25 min, also at night when the gondola is closed). Private transfers from Geneva are quickest.',
      car: 'A9 to Martigny, then up the Val de Bagnes.',
      tip: 'Sion airport is closer but has few flights.',
    },
    sources: ['https://www.powderhounds.com/Europe/Switzerland/Verbier/Getting-There.aspx', 'https://seeverbier.com/transfers/guide'],
  },
  'via-lattea-sestriere-sauze-doulx-san-sicario-claviere-montgenevre': {
    arrival: {
      train: 'Turin Porta Nuova → Oulx (hourly, ≈1h15; the Paris–Milan TGV also stops at Oulx), then bus 285 or taxi up to Sestriere (≈40 min) or Sauze d’Oulx (5 km).',
      bus: 'Sadem bus Turin airport → Turin stations (every 15 min). Extra.To buses Turin → Sestriere via Perosa Argentina (≈2½ h).',
      car: 'About 1h20–1h45 from Turin airport.',
    },
    runs: { green: 9, blue: 22, red: 38, black: 9, note: 'Montgenèvre (French side) only; the Italian resorts mostly grade from blue.' },
    sources: ['https://www.powderhounds.com/Europe/Italy/Sestriere/Getting-There.aspx', 'https://www.rome2rio.com/s/Turin/Sestriere', 'https://montgenevre.com/en/winter/ski/piste-map'],
  },
  'zermatt-breuil-cervinia-valtournenche-matterhorn': {
    arrival: {
      train: 'SBB to Visp, then the Matterhorn Gotthard Bahn straight into Zermatt: ≈3½ h from Zurich airport, ≈4 h from Geneva airport. Glacier Express also arrives here.',
      bus: 'Cervinia (Italian side) by bus from Châtillon station; taxis and Air Zermatt helicopters also run.',
      car: 'Zermatt is car-free: park at the Matterhorn Terminal in Täsch (2,100 spaces) and take the shuttle train (every 20 min, 12 min).',
    },
    sources: ['https://zermatt.ch/en/arrival/Arrival-by-train/Shuttle-MTT/Zermatt-Shuttle-Train', 'https://www.swiss-pass.ch/faq/how-do-you-get-to-zermatt-and-the-gornergrat-railway/'],
  },
  'tignes-val-disere': {
    arrival: {
      train: 'TGV, Eurostar ski train and night trains to Bourg-Saint-Maurice (30 km).',
      bus: 'Altibus S83 to Tignes and S82 to Val d’Isère (≈1 h, skis included); winter coaches from Geneva and Lyon airports. Taxi from Bourg ≈40 min.',
      car: 'N90 to Bourg-Saint-Maurice, then the D902; chains may be needed.',
      tip: 'Train arrivals and buses don’t always connect, so book in advance or plan a taxi.',
    },
    runs: { green: 21, blue: 67, red: 44, black: 30, note: 'Counts vary by source (159–163 runs).' },
    sources: ['https://www.altibus.com/en/arriving-by-train/bus-bourg-saint-maurice-tignes/', 'https://www.snowcarbon.co.uk/ski-resorts/tignes/tignes-transfer-guide', 'https://www.skiworld.co.uk/blog/?p=15128'],
  },
  'st-anton-st-christoph-stuben-lech-zuers-warth-schroecken-ski-arlberg': {
    arrival: {
      train: 'St. Anton station is in the village on the Innsbruck–Bludenz Arlberg line: Railjet and EuroCity trains from Zurich, Innsbruck and Vienna.',
      bus: 'Arlberg Express shuttle from Zurich airport to St. Anton and Lech (book online); bus 760 St. Anton station ↔ Lech/Zürs (≈30 min).',
      car: 'A12/S16 via Landeck; Austrian vignette needed.',
    },
    sources: ['https://www.skiarlberg.at/en/St-Anton-St-Christoph-Stuben/Good-to-know/Getting-here-parking', 'https://www.arlberg.com/en/arrival/st-anton-am-arlberg'],
  },
  'skiwelt-wilder-kaiser-brixental': {
    arrival: {
      train: 'Stations in Hopfgarten, Westendorf and Brixen im Thale are on the ski area; Ellmau, Going, Scheffau and Söll via Wörgl, Kufstein or St. Johann. ÖBB train + ski pass combo tickets in winter.',
      bus: 'Four Seasons Travel 24-hour transfer from Kufstein station to the villages; airport shuttles from Innsbruck, Salzburg (≈80 km each) and Munich (≈120 km); ski buses from Munich.',
      car: '1–1½ h from Innsbruck, Salzburg or Munich.',
    },
    sources: ['https://www.skiwelt.at/en/arrival-skiwelt.html', 'https://www.ellmau-going.at/en/winter/the-skiwelt/facts/arrival/'],
  },
  'les-sybelles-le-corbier-la-toussuire-les-bottieres-st-sorlin-st-jean-darves': {
    arrival: {
      train: 'Saint-Jean-de-Maurienne–Arvan station (TGV at peak times, TER otherwise); Saint-Avre–La Chambre is an alternative.',
      bus: 'Altibus S31 from the station to Le Corbier and La Toussuire, S31 bis to Les Bottières.',
      car: 'A43 exit 27, then the Arvan valley road. The Glandon and Croix de Fer passes are closed in winter.',
      tip: 'Chambéry airport is ≈1h20 away.',
    },
    runs: { green: 30, blue: 60, red: 35, black: 11, note: 'Official Sybelles figures (136 runs).' },
    sources: ['https://www.altibus.com/en/arriving-by-train/saint-jean-de-maurienne/', 'https://www.sybelles.ski/en/discover/access-and-transport/', 'https://sybelles.ski/en/sybelles-ski-area/sporty-ski'],
  },
  'saalbach-hinterglemm-leogang-fieberbrunn-skicircus': {
    arrival: {
      train: 'Leogang and Fieberbrunn stations are at the lifts; for Saalbach go to Zell am See or Maishofen-Saalbach.',
      bus: 'Bus 680 Zell am See → Saalbach–Hinterglemm hourly (≈30 min); shared coaches and private transfers from Salzburg airport (≈1h50).',
      car: '≈1½ h from Salzburg, 2+ h from Innsbruck, 2½ h from Munich.',
    },
    sources: ['https://www.powderhounds.com/europe/austria/skicircus-saalbach/getting-there.aspx', 'https://www.hoppa.com/en/austria/saalbach-hinterglemm'],
  },
  'le-grand-massif-flaine-les-carroz-morillon-samoens-sixt': {
    arrival: {
      train: 'Geneva airport → Geneva Cornavin → Cluses (high-speed station, 30 km from Flaine).',
      bus: 'Eurobus direct Geneva airport → Flaine Forum (winter only); Altibus from Cluses station; transfers ≈1h15 from Geneva.',
      car: 'A40 to Cluses, then up to Flaine (car-free village: drop-off at the Welcome Centre).',
    },
    runs: { green: 20, blue: 64, red: 49, black: 13, note: 'Whole Grand Massif; counts vary 139–148 runs.' },
    sources: ['https://www.flaine.com/en/getting-to-flaine', 'https://en.wikipedia.org/wiki/Grand_Massif'],
  },
  'serre-chevalier-briancon-chantemerle-villeneuve-la-salle-le-monetier-les-bains': {
    arrival: {
      train: 'Briançon station is in the resort; night train from Paris. Paris–Milan TGV to Oulx, then ≈30 min bus to Briançon.',
      bus: 'From Turin airport: bus to Porta Nuova, train to Oulx, ZOU! line 76 (book 48 h ahead). From Grenoble: LER55 to Briançon (≈2 h).',
      car: 'Fastest by car or private transfer: ≈1½ h from Turin, 2½–3 h from Grenoble.',
    },
    runs: { green: 13, blue: 26, red: 29, black: 13, note: '2025–26 count (Alti-mag).' },
    sources: ['https://www.serre-chevalier.com/en/resort/mobility-and-transport/plane', 'https://www.powderhounds.com/Europe/France/Serre-Chevalier/Getting-There.aspx', 'https://www.alti-mag.com/en/domaines-skiables/serre-chevalier'],
  },
  'alpe-dhuez': {
    arrival: {
      train: 'TGV/TER to Grenoble, then bus or taxi (≈1h15).',
      bus: 'Transaltitude express Grenoble → Alpe d’Huez (winter, ≈1h45); Itinisère T75 + T76 via Bourg-d’Oisans all year; Altibus from Geneva airport (<4 h, winter).',
      car: 'Under an hour from Grenoble; the 21 hairpins need winter tyres or chains.',
    },
    runs: { green: 42, blue: 37, red: 39, black: 17, note: 'Snowcarbon (135 runs).' },
    sources: ['https://skipass.alpedhuez.com/hiver/en/getting-to-alpe-dhuez', 'https://snowcarbon.co.uk/ski-resorts/alpe-dhuez/ski-area'],
  },
  'ischgl-samnaun-silvretta-arena': {
    arrival: {
      train: 'Train to Landeck-Zams (from Innsbruck, Zurich or Munich via Innsbruck).',
      bus: 'Bus 260 Landeck-Zams station → Ischgl (≈30 km, ≈30 min); private transfers from Innsbruck airport.',
      car: '≈1½ h from Innsbruck via the A12 and the B188 into the Paznaun; winter tyres/chains.',
    },
    sources: ['https://www.hoppa.com/en/austria/ischgl'],
  },
  'arosa-lenzerheide': {
    arrival: {
      train: 'Zurich → Chur (≈1¼ h, hourly), then the Rhaetian Railway straight into Arosa (≈1 h, scenic).',
      bus: 'PostBus 182 Chur → Lenzerheide every 30 min (free with ski gear and a valid pass).',
      car: 'Arosa road from Chur ≈40 min but narrow; Lenzerheide via Chur or Tiefencastel.',
    },
    sources: ['https://lenzerheide.com/en/region/useful-information/transport', 'https://www.powderhounds.com/Europe/Switzerland/Arosa/Getting-There.aspx'],
  },
  'la-plagne-paradiski': {
    arrival: {
      train: 'Aime-la-Plagne station (TGV, Eurostar ski train outbound; returns leave from Bourg-Saint-Maurice).',
      bus: 'Altibus from Aime: ≈45 min to Plagne Centre, 1 h to Aime 2000; AlpSkiBus Geneva → Aime (≈2h20), Lys-Express from Lyon.',
      car: 'N90 to Aime/Bozel, then the La Plagne road. No bus Bourg-St-Maurice ↔ La Plagne: taxi ≈45 min.',
    },
    runs: { green: 9, blue: 78, red: 33, black: 19, note: 'La Plagne only (official lift status, 139 runs).' },
    sources: ['https://en.la-plagne.com/discover/practical/how-to-get-there/getting-to-la-plagne', 'https://snowcarbon.co.uk/ski-resorts/la-plagne/transfer-guide', 'https://www.seelaplagne.com/lifts/status'],
  },
  'les-2-alpes': {
    arrival: {
      train: 'TGV to Grenoble (≈1h15 from the resort).',
      bus: 'Transaltitude direct ski bus from Grenoble (book online from mid-November); line 3030 all year via Bourg-d’Oisans; shuttles from Grenoble airport timed to flights.',
      car: 'Via Bourg-d’Oisans, winding final climb; free shuttles inside the resort.',
    },
    runs: { green: 18, blue: 47, red: 17, black: 14, note: 'Most cited count (96 runs).' },
    sources: ['https://www.skipass-2alpes.com/en/page/how-to-get-here', 'https://www.alti-mag.com/en/domaines-skiables/les-2-alpes'],
  },
  'grandvalira-pas-de-la-casa-grau-roig-soldeu-el-tarter-canillo-encamp': {
    arrival: {
      train: 'Andorra has no railway: L’Hospitalet-près-l’Andorre (from Toulouse) or Puigcerdà (from Barcelona), then bus.',
      bus: 'Andbus shared shuttles from Barcelona (7–8 a day) and Toulouse; ≈3–4 h.',
      car: '≈3–3½ h from Barcelona or Toulouse airports.',
    },
    runs: { green: 24, blue: 55, red: 41, black: 19, note: 'WeSki (139 runs); other sources 119–139.' },
    sources: ['https://www.skiresort.info/ski-resort/grandvalira-pas-de-la-casa-grau-roig-soldeu-el-tarter-canillo-encamp/arrival-plane-train/', 'https://www.weski.com/guides/pistes-maps/andorra-grandvalira'],
  },
  'les-arcs-peisey-vallandry-paradiski': {
    arrival: {
      train: 'Bourg-Saint-Maurice (TGV, Eurostar ski train, Travelski night train), then the funicular to Arc 1600 in 7 min (free with your train ticket in winter).',
      bus: 'Free buses Arc 1600 → 1800/1950/2000; buses and taxis from Bourg to every village; transfers from Geneva/Lyon ≈2½ h.',
      car: 'N90 to Bourg-Saint-Maurice, then the Les Arcs road.',
      tip: 'The funicular’s last run is around 9 pm.',
    },
    runs: { green: 10, blue: 55, red: 42, black: 16, note: 'Les Arcs (123 runs); Paradiski-wide ≈258.' },
    sources: ['https://www.lesarcs.com/en/practical-guide-les-arcs/getting-les-arcs-train', 'https://www.seat61.com/trains-and-routes/eurostar-ski-train.htm'],
  },
  'espace-diamant-les-saisies-notre-dame-de-bellecombe-praz-sur-arly-flumet-crest-voland': {
    arrival: {
      train: 'TGV to Albertville (≈3h40 from Paris).',
      bus: 'Line 22 Albertville → Hauteluce / Les Saisies (Sept–June, extra in winter); Alpskibus Geneva airport → Albertville; Altibus airport shuttles.',
      car: '≈1h45–2 h from Geneva.',
      tip: 'No shuttle from Sallanches station to Les Saisies.',
    },
    runs: { green: 32, blue: 71, red: 52, black: 12, note: '2025–26 count (Alti-mag).' },
    sources: ['https://en.lessaisies.com/organize-my-stay/how-to-get-to-les-saisies-en', 'https://www.alti-mag.com/en/domaines-skiables/espace-diamant'],
  },
  'kitzski-kitzbuehel-kirchberg': {
    arrival: {
      train: 'Trains stop at the Hahnenkammbahn in Kitzbühel and in Kirchberg (change in Wörgl). Munich airport S8 → Munich East → Wörgl (≈3 h); seasonal direct "Urlaubs Express" from Munich East (≈2½ h). Innsbruck ≈1h10 by train.',
      bus: 'Private transfers from Munich (≈2½ h), Salzburg (≈1½ h), Innsbruck (≈1½ h).',
      car: 'Vignette required on Austrian motorways.',
    },
    sources: ['https://www.kitzbuehel.com/en/holiday/getting-here/flying/', 'https://www.powderhounds.com/europe/austria/kitzbuhel/getting-there.aspx'],
  },
  'serfaus-fiss-ladis': {
    arrival: {
      train: 'Train to Landeck-Zams (≈25 km).',
      bus: 'Buses from Landeck-Zams to Serfaus, Fiss and Ladis; local taxi firms run transfers from Innsbruck, Munich and Zurich airports.',
      car: 'Via the Fernpass or the A12; vignette and winter equipment.',
    },
    sources: ['https://serfaus-fiss-ladis.at/en/service/arrival'],
  },
  'megeve-saint-gervais': {
    arrival: {
      train: 'Saint-Gervais–Le Fayet and Sallanches stations (TGV/TER via Annemasse, Léman Express from Geneva).',
      bus: 'Direct buses Geneva airport ↔ Megève (≈1½ h, several a day; book ahead in season); SAT Y83 Sallanches → Megève (≈25 min).',
      car: '≈1 h from Geneva airport.',
    },
    runs: { green: 43, blue: 63, red: 84, black: 33, note: 'Évasion Mont-Blanc, official tourism count.' },
    sources: ['https://altibus.com/resort/megeve-rs67_en.aspx', 'https://www.megeve-tourisme.fr/en/skier-a-megeve/station-de-ski/domaines-skiables/'],
  },
  'vars-risoul-la-foret-blanche': {
    arrival: {
      train: 'Mont-Dauphin–Guillestre station (≈15 km): night train from Paris Austerlitz; TGV to Marseille/Aix then TER or coach.',
      bus: 'Daily paid shuttles from Mont-Dauphin–Guillestre to Vars (line S23, ≈50 min) and Risoul (ZOU!).',
      car: 'Turin airport ≈130 km via Montgenèvre and Briançon.',
    },
    runs: { green: 21, blue: 45, red: 40, black: 10, note: 'Ski-France (116 runs); counts vary.' },
    sources: ['https://www.vars.com/winter/preparing-my-stay/how-do-i-get-there/', 'https://en.ski-france.com/ski-area-foret-blanche/'],
  },
  'val-gardena-groeden': {
    arrival: {
      train: 'Brenner line to Ponte Gardena/Waidbruck (regional trains) or Bolzano (all trains).',
      bus: 'Bus 350 from Bolzano and Ponte Gardena to Ortisei/Selva (≈1 h from Bolzano); bus 170 via Castelrotto. Free public transport with the Val Gardena Guest Pass.',
      car: '≈1¾ h from Innsbruck, ≈2 h from Verona.',
    },
    sources: ['https://www.valgardena.it/en/holidays-dolomites/arrival/by-train/', 'https://www.powderhounds.com/europe/italy/val-gardena/getting-there.aspx'],
  },
  'espace-lumiere-pra-loup-val-dallos': {
    arrival: {
      train: 'Nearest stations Gap (daily ZOU! buses to Barcelonnette) and Digne-les-Bains (for Val d’Allos).',
      bus: 'ZOU! buses from Marseille and Nice airports to Barcelonnette, then a free shuttle up to Pra Loup.',
      car: 'Easiest by car: ≈2h45 from Marseille, ≈3 h from Nice.',
    },
    runs: { green: 12, blue: 38, red: 35, black: 6, note: 'Ubaye tourism (91 runs).' },
    airports: [
      { iata: 'MRS', name: 'Marseille', country: 'France', km: 210, driveMin: 165 },
      { iata: 'NCE', name: 'Nice', country: 'France', km: 200, driveMin: 180 },
      { iata: 'TRN', name: 'Torino', country: 'Italy', km: 195, driveMin: 180 },
    ],
    sources: ['https://www.praloup.com/getting-there-praloup.html', 'https://www.ubaye.com/en/ski/praloup/'],
  },
  'laax-flims-falera': {
    arrival: {
      train: 'Zurich airport → Chur (<2 h, one change) or the Rhaetian Railway to Ilanz.',
      bus: 'PostBus 81 Chur → Flims/Laax Bergbahnen (≈30–40 min); PostBus from Ilanz (≈30 min); resort shuttle from Zurich airport (book 48 h ahead).',
      car: 'A3/A13 to Reichenau (exit 18), then route 19 (≈20–30 min).',
    },
    sources: ['https://flimslaax.com/en/getting-there', 'https://www.powderhounds.com/Europe/Switzerland/Laax/Getting-There.aspx'],
  },
  'baqueira-beret': {
    arrival: {
      train: 'No railway: train Barcelona → Lleida, then ALSA bus to Vielha (4×/day, ≈2h40).',
      bus: 'Buses Barcelona → Vielha (≈5 h); FlixBus Toulouse → Vielha; taxis or shuttles from Vielha.',
      car: '≈2–2½ h from Toulouse airport; Lleida-Alguaire airport ≈1½ h.',
    },
    runs: { green: 6, blue: 47, red: 56, black: 18, note: 'InTheSnow (127 runs); counts vary 99–127.' },
    sources: ['https://www.hoppa.com/en/spain/baqueira-beret', 'https://www.inthesnow.com/baqueira-beret/resort-stats/'],
  },
  'le-grand-domaine-valmorel-doucy-celliers-st-francois-longchamp': {
    arrival: {
      train: 'Moûtiers (TGV) or Notre-Dame-de-Briançon (TER, the closest station to Valmorel).',
      bus: 'Shuttles from Geneva airport to Moûtiers (≈2 h, on demand); local buses to Valmorel.',
      car: 'A43/N90, exit at Notre-Dame-de-Briançon, then the Valmorel road (≈1¼ h from Chambéry).',
    },
    runs: { green: 27, blue: 48, red: 20, black: 8, note: '103 runs across the Grand Domaine.' },
    airports: [
      { iata: 'CMF', name: 'Chambery', country: 'France', km: 85, driveMin: 75 },
      { iata: 'GVA', name: 'Geneva', country: 'Switzerland', km: 150, driveMin: 120 },
      { iata: 'LYS', name: 'Lyon', country: 'France', km: 160, driveMin: 120 },
      { iata: 'GNB', name: 'Grenoble', country: 'France', km: 160, driveMin: 120 },
    ],
    sources: ['https://www.rome2rio.com/s/Paris/Valmorel', 'https://www.skibound.co.uk/destination/france/doucy-valmorel'],
  },
  'galibier-thabor-valmeinier-valloire': {
    arrival: {
      train: 'Saint-Michel–Valloire station (weekend TGVs from Paris in season); Saint-Jean-de-Maurienne and Modane have daily TGVs.',
      bus: 'Altibus from Saint-Michel to Valloire and Valmeinier.',
      car: 'A43 to Saint-Michel-de-Maurienne, then ≈17 km to Valloire.',
    },
    runs: { green: 17, blue: 32, red: 33, black: 8, note: 'Official Galibier-Thabor count (90 runs).' },
    airports: [
      { iata: 'CMF', name: 'Chambery', country: 'France', km: 105, driveMin: 85 },
      { iata: 'TRN', name: 'Torino', country: 'Italy', km: 125, driveMin: 105 },
      { iata: 'GNB', name: 'Grenoble', country: 'France', km: 150, driveMin: 110 },
      { iata: 'LYS', name: 'Lyon', country: 'France', km: 195, driveMin: 135 },
    ],
    sources: ['https://www.raileurope.com/en/destinations/trains-to-saint-michel-de-maurienne', 'https://www.valmeinier.com/en/discover/downhill-ski-snowboard-destination/'],
  },
  'madonna-di-campiglio-pinzolo-folgarida-marilleva': {
    arrival: {
      train: 'Train to Trento (≈1h20 from Verona); the Dolomiti Express reaches Val di Sole (Folgarida/Marilleva).',
      bus: 'Trentino Trasporti buses from Trento station (bus station 100 m away); Flyski Shuttle from Verona, Bergamo, Milan airports and Trento (weekends in winter).',
      car: 'A22 to Trento Sud, then SS45bis/SS237/SS239.',
    },
    sources: ['https://campigliodolomiti.it/en/how-to-arrive/by-train', 'https://www.ski.it/en/how-to-get-to-campiglio'],
  },
  'st-moritz-corviglia': {
    arrival: {
      train: 'Zurich airport → Chur → Rhaetian Railway to St. Moritz (≈3½ h). From Milan: Tirano, then the Bernina Express (5–6 h, scenic).',
      bus: 'Private transfers from Milan (≈3 h). Engadin Airport in Samedan for private jets.',
      car: '≈3 h from Milan or Zurich over the passes.',
    },
    sources: ['https://www.stmoritz.com/en/arrival', 'https://www.powderhounds.com/Europe/Switzerland/St-Moritz/Getting-There.aspx'],
  },
  'zillertal-arena-zell-am-ziller-gerlos-koenigsleiten-hochkrimml': {
    arrival: {
      train: 'Train to Jenbach, then the Zillertalbahn to Zell am Ziller (≈38 min, hourly or better).',
      bus: 'Christophorus bus Zell am Ziller → Gerlos; airport shuttles from Innsbruck and Munich.',
      car: 'A12 (vignette) to the Zillertal exit, then the B169; Gerlos Alpine Road from Salzburg is tolled.',
    },
    sources: ['https://www.zillertalarena.com/en/zell/winter/anreise.html'],
  },
  'la-molina-masella-alp2500': {
    arrival: {
      train: 'Rodalies R3 from Barcelona Plaça Catalunya to La Molina station (≈3 h), then the resort’s internal bus (just under 5 km). "Skitrain" package bundles train, bus and pass.',
      bus: 'Sagalés ski buses from Barcelona, Sabadell, Terrassa and Manresa to La Molina/Masella.',
      car: '≈2 h from Barcelona.',
    },
    runs: { green: 22, blue: 39, red: 39, black: 16, note: 'Whole Alp 2500 (PGL); counts vary.' },
    sources: ['https://www.lamolina.cat/en/winter/services/transport-slopes/', 'https://pgl.co.uk/en-gb/school-trips/secondary-schools/course-types/skiing-and-snowboarding/resorts/alp-2500'],
  },
  'soelden': {
    arrival: {
      train: 'All regional trains stop at Ötztal-Bahnhof at the valley entrance (Innsbruck airport has a rail link there).',
      bus: 'Buses every 30 min from Ötztal-Bahnhof to Sölden; Ötztal Shuttle door to door from Innsbruck airport.',
      car: 'Via the Inn valley; winter tyres or chains mandatory Nov–Apr.',
    },
    sources: ['https://www.soelden.com/getting-here-by-train-winter', 'https://www.oetztal.at/en/tourism/travel-options/'],
  },
  'espace-san-bernardo-la-rosiere-la-thuile': {
    arrival: {
      train: 'Bourg-Saint-Maurice (20 km): TGV/TER from Paris, Lyon, Chambéry, Grenoble.',
      bus: 'Bus S80 Bourg → La Rosière (30–60 min, Altibus tickets); winter coaches from Geneva airport, direct or via Bourg.',
      car: 'La Thuile (Italian side) via Aosta and the Mont Blanc tunnel; the Petit-Saint-Bernard pass is closed in winter.',
    },
    runs: { green: 8, blue: 25, red: 35, black: 14, note: '82 runs (WeSki/Wikipedia).' },
    sources: ['https://www.larosiere.net/en/getting-here/', 'https://www.weski.com/en-us/ski-resorts/ski-areas/espace-san-bernardo'],
  },
  'formigal': {
    arrival: {
      train: 'AVE to Zaragoza or Huesca; or Zaragoza → Canfranc (twice daily), then taxi.',
      bus: 'Buses from Zaragoza and Huesca stations to Formigal (infrequent, check ALSA); via Jaca.',
      car: 'Zaragoza airport via Huesca and Jaca (≈2½ h).',
    },
    runs: { green: 12, blue: 36, red: 52, black: 42, note: 'Formigal-Panticosa combined (147 runs).' },
    sources: ['https://www.rome2rio.com/s/Barcelona/Formigal', 'https://snowstash.com/europe/spain/formigal-panticosa'],
  },
  'mayrhofen-penken-ahorn-rastkogel-eggalm-mountopolis': {
    arrival: {
      train: 'Train to Jenbach, then the Zillertalbahn every 30 min to Mayrhofen (end of line, lifts within walking distance). ≈1¾ h from Innsbruck.',
      bus: 'Shared shuttles from Innsbruck (≈1¼ h) and Munich (≈2½ h); private transfers ≈1 h from Innsbruck.',
      car: 'A12 then the B169 into the Zillertal.',
    },
    sources: ['https://www.powderhounds.com/europe/austria/mayrhofen/getting-there.aspx', 'https://www.hoppa.com/en/austria/mayrhofen'],
  },
  'silvretta-montafon': {
    arrival: {
      train: 'Direct trains from Zurich to Bludenz, then the Montafonerbahn to Schruns (hourly, often half-hourly).',
      bus: 'Ski buses from Schruns station into the valley (hourly main lines).',
      car: 'Motorway exit Bludenz/Montafon, then the L188.',
    },
    sources: ['https://www.montafon.at/en/service/getting-there'],
  },
};
