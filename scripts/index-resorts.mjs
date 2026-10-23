// Indexes Europe's big ski resorts from skiresort.com into src/data/resorts-europe.json.
//
//   node scripts/index-resorts.mjs              (rating ≥ 3 stars, more than 140 km of slopes)
//   MIN_KM=100 MIN_RATING=4 node scripts/index-resorts.mjs
//
// It reads the "biggest ski resorts" list, then each resort's test report (ratings incl. snow
// reliability), arrival page (airports, train), trail map and slope offering. Requests are
// sequential with a pause, to be gentle on the site. Re-run each season to refresh.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MIN_KM = Number(process.env.MIN_KM ?? 140);
const MIN_RATING = Number(process.env.MIN_RATING ?? 3);
const SITE = 'https://www.skiresort.com';
const LIST = `${SITE}/en/ski-resorts/europe/sorted/slope-length/`;
const OUT = fileURLToPath(new URL('../src/data/resorts-europe.json', import.meta.url));
const PAUSE_MS = 600;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) =>
  s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/​/g, '');
const text = (html) => decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const num = (s) => (s == null ? null : Number(String(s).replace(/,/g, '').replace(/[^\d.]/g, '')) || null);

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'SomeGoodSki resort indexer (personal trip planning)' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return { html: await res.text(), url: res.url };
}

/** Resort entries on the size-sorted list page. */
function parseList(html) {
  const blocks = html.split('<div class="panel-body middle-padding">').slice(1).filter((b) => b.includes('info-table'));
  return blocks.map((b) => {
    const a = b.match(/<a class="h3" href="([^"]+)">\s*([\s\S]*?)<\/a>/);
    const crumbs = [...(b.match(/<div class="sub-breadcrumb">([\s\S]*?)<\/div>/)?.[1] ?? '').matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((m) => decode(m[1]).trim());
    const elev = text(b.match(/icon-uE002-height[\s\S]*?<\/tr>/)?.[0] ?? '').match(/(\d+) m \(\s*(\d+) m - (\d+) m\s*\)/) ?? [];
    const km = Object.fromEntries([...b.matchAll(/class="slopeinfoitem ?([a-z]*)">([^<]+)</g)].map((m) => [m[1] || 'total', num(m[2])]));
    return {
      name: decode(a[2]).replace(/^\d+\.\s*/, '').replace(/\s+/g, ' ').trim(),
      url: a[1],
      rating: num(b.match(/data-rank="([\d.]+)"/)?.[1]),
      country: crumbs[1] ?? '',
      region: crumbs.slice(2).join(' / '),
      elevation: { diff: num(elev[1]), base: num(elev[2]), top: num(elev[3]) },
      km: { total: km.active ?? km.total ?? null, easy: km.blue ?? null, intermediate: km.red ?? null, difficult: km.black ?? null },
      lifts: num(b.match(/([\d,]+)&nbsp;ski lifts/)?.[1]),
    };
  });
}

function parseRatings(html) {
  return Object.fromEntries(
    [...html.matchAll(/<div class="stars-link-element"[^>]*>([\s\S]*?)<i class="fa fa-chevron-right/g)]
      .map((m) => [text(m[1].match(/<span>([\s\S]*?)<\/span>/)?.[1] ?? m[1]), num(m[1].match(/data-rank="([\d.]+)"/)?.[1])])
      .filter(([label, v]) => label && v),
  );
}

function parseArrival(html) {
  const t = text(html);
  const airports = [...t.matchAll(/Airport ([^()]+?) \(([A-Z]{3})\), ([A-Za-z ]+?) Approx\. ([\d.,]+) km distance to the ski resort Approx\. (?:(\d+) hours? )?(?:(\d+) minutes? )?driving time/g)]
    .map((m) => ({ iata: m[2], name: m[1].trim(), country: m[3].trim(), km: num(m[4]), driveMin: Number(m[5] ?? 0) * 60 + Number(m[6] ?? 0) }));
  let train = null;
  const sec = html.match(/icon-train[\s\S]*?Train connection[\s\S]*?<\/h2>([\s\S]*?)(?:<input|<div class|<h2)/);
  if (sec) {
    // "Train connection available" is a plain <li>; "No direct train connection" has class "no"
    const lines = [...sec[1].matchAll(/<li(?: class="([^"]*)")?>([\s\S]*?)<\/li>/g)].map((m) => ({ ok: !/\bno\b/.test(m[1] ?? ''), text: text(m[2]) }));
    train = { direct: lines.some((l) => l.ok), lines: lines.map((l) => l.text), info: text(sec[1].replace(/<ul[\s\S]*?<\/ul>/g, '')) };
  }
  const townsHtml = html.match(/<span class="js-more-text[^"]*">([\s\S]*?)<\/span>/)?.[1] ?? html.match(/<span class="croped">([\s\S]*?)<\/span>/)?.[1] ?? '';
  const towns = [...townsHtml.matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((m) => decode(m[1]).trim()).filter(Boolean).slice(0, 12);
  return { airports, train, towns };
}

function parseTrailMap(html, pageUrl) {
  const m = html.match(/<a[^>]+href="([^"]*fileadmin\/_processed_[^"]+\.(?:jpe?g|png))"[^>]*>\s*<img[^>]+src="([^"]+)"/i);
  return m ? { full: new URL(m[1], SITE + '/').href, thumb: new URL(m[2], SITE + '/').href, page: pageUrl } : null;
}

function parseSlopes(html) {
  const t = text(html);
  const run = t.match(/Longest run (.+?) · Length ([\d.,]+) ?km/);
  return {
    snowmakingPct: num(t.match(/(\d+) ?% of the slopes have snow-making/)?.[1]),
    longestRun: run ? { name: run[1].trim(), km: Number(run[2].replace(',', '.')) } : null,
  };
}

async function main() {
  console.log(`Reading ${LIST}`);
  const { html } = await get(LIST);
  const resorts = parseList(html).filter((r) => (r.km.total ?? 0) > MIN_KM && (r.rating ?? 0) >= MIN_RATING);
  console.log(`${resorts.length} resorts with rating ≥ ${MIN_RATING} and more than ${MIN_KM} km\n`);

  const out = [];
  for (const [i, r] of resorts.entries()) {
    const base = r.url.endsWith('/') ? r.url : r.url + '/';
    const page = async (p) => { await sleep(PAUSE_MS); try { return await get(base + p); } catch { return null; } };
    const report = await page('test-report/');
    const arrival = await page('arrival-plane-train/');
    const map = await page('trail-map/');
    const slopes = await page('slope-offering/');

    const ratings = report ? parseRatings(report.html) : {};
    // resorts without an arrival page redirect to their overview
    const arr = arrival && arrival.url.includes('arrival') ? parseArrival(arrival.html) : { airports: [], train: null, towns: [] };
    out.push({
      ...r,
      slug: base.split('/ski-resort/')[1].replace(/\/$/, ''),
      source: base,
      snowReliability: ratings['Snow reliability'] ?? null,
      ratings,
      ...arr,
      map: map ? parseTrailMap(map.html, base + 'trail-map/') : null,
      ...(slopes ? parseSlopes(slopes.html) : { snowmakingPct: null, longestRun: null }),
    });
    const last = out[out.length - 1];
    console.log(`${String(i + 1).padStart(2)}. ${r.name} · ${r.km.total} km · ${r.rating}★ · snow ${last.snowReliability ?? '–'} · ${last.airports.map((a) => a.iata).join('/') || 'no airports'}`);
  }

  writeFileSync(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), source: LIST, filter: { minRating: MIN_RATING, minKm: MIN_KM }, resorts: out }, null, 2) + '\n');
  console.log(`\nSaved ${out.length} resorts to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
