import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialData } from '../data/seed';
import { newFriend, useStore } from '../store/useStore';
import type { AppData, HotelOption, Trip } from '../types';
import { applyShared, extractShared, makeFile, type SharedVacationFile } from './bundle';
import { canonical, syncNow } from './engine';
import { linkFriend, reIdFriend, unlinkFriend } from './friends';
import { decodeBase64, encodeBase64, getJson, GitHubError, putJson } from './github';
import { merge3, type Conflict } from './merge';
import { useCollab } from './useCollab';

const hotel = (id: string, price: number, name = id): HotelOption => ({
  id, name, currency: 'EUR', price, per: 'night', pricing: 'per-room', roomCapacity: 2, type: 'hotel', rating: null, skiInOut: false, walkable: true, liftMin: 5, link: '', notes: '',
});
const trip = (patch: Partial<Trip> = {}): Trip => ({
  id: 't1', vacationId: 'v1', resortId: 'tignes-val-disere', name: 'Tignes', flights: [], transfers: [], hotels: [], skiPasses: [], shops: [], expenses: [],
  flightChoice: {}, passChoice: {}, shopChoice: {}, selectedComboId: null, createdAt: '2026-10-01T00:00:00Z', ...patch,
});

/** A planner's data: one winter, two friends, one vacation with one trip. */
function planner(): AppData {
  const d = createInitialData();
  const ben = newFriend(0, { id: 'ben', name: 'Ben' });
  const noa = newFriend(1, { id: 'noa', name: 'Noa' });
  return {
    ...d,
    friends: [ben, noa],
    winters: [{ id: 'w-a', year: 2027, start: '2026-12-01', end: '2027-04-15', createdAt: '', participants: [
      { friendId: 'ben', availability: ['2027-01-10', '2027-01-11'], budget: 5000, budgetCurrency: 'ILS' },
      { friendId: 'noa', availability: [], budget: 0, budgetCurrency: 'ILS' },
    ] }],
    vacations: [{ id: 'v1', winterId: 'w-a', name: 'January', dates: { start: '2027-01-09', end: '2027-01-16' }, attendeeIds: ['ben'], status: 'planning', selectedTripId: null, luggage: [], createdAt: '' }],
    trips: [trip({ hotels: [hotel('h1', 200, 'Old Chalet')] })],
  };
}

describe('three-way merge', () => {
  const base = trip({ hotels: [hotel('h1', 200)] });

  it('keeps disjoint edits from both sides', () => {
    const local = { ...base, hotels: [...base.hotels, hotel('h2', 150)] };
    const remote = { ...base, flights: [{ id: 'f1' } as never] };
    const conflicts: Conflict[] = [];
    const m = merge3(base, local, remote, conflicts);
    expect(m.hotels.map((h) => h.id)).toEqual(['h1', 'h2']);
    expect(m.flights).toHaveLength(1);
    expect(conflicts).toEqual([]);
  });

  it('lets the local edit win a same-field conflict and reports it', () => {
    const local = { ...base, hotels: [hotel('h1', 220)] };
    const remote = { ...base, hotels: [hotel('h1', 180)] };
    const conflicts: Conflict[] = [];
    expect(merge3(base, local, remote, conflicts).hotels[0].price).toBe(220);
    expect(conflicts).toMatchObject([{ path: ['hotels', 'h1', 'price'], kept: 220, replaced: 180, kind: 'value' }]);
  });

  it('merges different fields of the same record', () => {
    const local = { ...base, hotels: [{ ...hotel('h1', 220) }] };
    const remote = { ...base, hotels: [{ ...hotel('h1', 200), rating: 4 }] };
    expect(merge3(base, local, remote).hotels[0]).toMatchObject({ price: 220, rating: 4 });
  });

  it('deletes a record only when the other side left it alone', () => {
    expect(merge3(base, { ...base, hotels: [] }, base).hotels).toEqual([]);
    const conflicts: Conflict[] = [];
    const kept = merge3(base, { ...base, hotels: [] }, { ...base, hotels: [hotel('h1', 250)] }, conflicts);
    expect(kept.hotels[0].price).toBe(250);
    expect(conflicts[0].kind).toBe('kept-deleted');
  });

  it('merges string lists as sets and maps key by key', () => {
    const b = { days: ['a', 'b', 'c'], pass: { ben: 'p1', noa: 'p1' } as Record<string, string> };
    const l = { days: ['a', 'b', 'c', 'd'], pass: { ben: 'p2', noa: 'p1' } };
    const r = { days: ['a', 'c'], pass: { noa: 'p1', dana: 'p1' } as Record<string, string> };
    expect(merge3(b, l, r)).toEqual({ days: ['a', 'c', 'd'], pass: { ben: 'p2', noa: 'p1', dana: 'p1' } });
  });
});

describe('shared bundle', () => {
  it('round-trips into another planner, filing it under their winter of the same year', () => {
    const a = planner();
    const ex = extractShared(a, 'v1')!;
    expect(ex.data.friends.map((f) => f.id)).toEqual(['ben']); // only attendees
    expect(ex.data.vacation.winterId).toBe('');

    const fresh = createInitialData();
    const b = applyShared(fresh, makeFile(ex.winter, ex.data, 'Gur').winter, ex.data);
    expect(b.winters).toHaveLength(1);
    expect(b.winters[0]).toMatchObject({ year: 2027, participants: [{ friendId: 'ben', availability: ['2027-01-10', '2027-01-11'] }] });
    expect(canonical(extractShared(b, 'v1')!.data)).toEqual(canonical(ex.data));

    const withWinter = { ...fresh, winters: [{ id: 'w-b', year: 2027, start: '2026-12-15', end: '2027-04-01', createdAt: '', participants: [] }] };
    const c = applyShared(withWinter, { year: 2027, start: '2026-12-01', end: '2027-04-15' }, ex.data);
    expect(c.winters).toHaveLength(1);
    expect(c.vacations[0].winterId).toBe('w-b');
  });
});

describe('friend identity', () => {
  it('rewrites a friend id everywhere', () => {
    const a = planner();
    a.vacations[0].luggage = [{ id: 'l', type: 'checked', friendIds: ['ben', 'noa'] }];
    a.trips[0] = {
      ...a.trips[0],
      flightChoice: { ben: { outbound: 'none' } }, passChoice: { ben: 'p' }, shopChoice: { ben: 's' },
      shops: [{ id: 's', name: 'S', basis: 'per-day', currency: 'EUR', prices: {}, link: '', notes: '', lessons: [{ id: 'x', type: 'group', dates: [], people: 0, pricePerPerson: 1, level: null, friendIds: ['ben'], notes: '' }] }],
      expenses: [{ id: 'e', name: 'Food', split: 'individual', currency: 'EUR', amount: { min: 1, max: 1 }, per: 'day', friendIds: ['ben'], notes: '' }],
    };
    const d = reIdFriend(a, 'ben', 'shared-ben');
    expect(JSON.stringify(d.friends.concat() as unknown)).toContain('shared-ben');
    const t = d.trips[0];
    expect(Object.keys(t.flightChoice)).toEqual(['shared-ben']);
    expect(t.passChoice).toEqual({ 'shared-ben': 'p' });
    expect(t.shopChoice).toEqual({ 'shared-ben': 's' });
    expect(t.shops[0].lessons[0].friendIds).toEqual(['shared-ben']);
    expect(t.expenses[0].friendIds).toEqual(['shared-ben']);
    expect(d.vacations[0].attendeeIds).toEqual(['shared-ben']);
    expect(d.vacations[0].luggage[0].friendIds).toEqual(['shared-ben', 'noa']);
    expect(d.winters[0].participants.map((p) => p.friendId)).toEqual(['shared-ben', 'noa']);
    expect(JSON.stringify(d)).not.toContain('"ben"');
  });

  it('links a local friend to the shared one and can split them again', () => {
    const a = planner();
    // the partner's Ben arrived with his own id and availability
    a.friends.push(newFriend(2, { id: 'their-ben', name: 'Ben', skillLevel: 'expert' }));
    a.winters[0].participants.push({ friendId: 'their-ben', availability: ['2027-01-12'], budget: 0, budgetCurrency: 'ILS' });
    a.vacations.push({ ...a.vacations[0], id: 'v-shared', attendeeIds: ['their-ben'] });

    const linked = linkFriend(a, 'ben', 'their-ben', { ...a.friends[0], skillLevel: 'expert' });
    expect(linked.friends.filter((f) => f.name === 'Ben')).toHaveLength(1);
    expect(linked.friends.find((f) => f.id === 'their-ben')!.skillLevel).toBe('expert');
    expect(linked.vacations[0].attendeeIds).toEqual(['their-ben']); // your own vacation follows the link
    expect(linked.winters[0].participants.find((p) => p.friendId === 'their-ben')!.availability).toEqual(['2027-01-10', '2027-01-11', '2027-01-12']);

    const { data: split, id } = unlinkFriend(linked, 'their-ben', ['v-shared']);
    expect(split.vacations.find((v) => v.id === 'v-shared')!.attendeeIds).toEqual(['their-ben']);
    expect(split.vacations.find((v) => v.id === 'v1')!.attendeeIds).toEqual([id]);
    expect(split.friends.map((f) => f.id)).toContain(id);
  });
});

describe('GitHub client', () => {
  afterEach(() => vi.unstubAllGlobals());
  const conn = { repo: 'gur/ski-plans', token: 't' };

  it('encodes UTF-8 (Hebrew, emoji) to base64 and back', () => {
    const s = 'שלום ⛷️ Val d’Isère';
    expect(decodeBase64(encodeBase64(s))).toBe(s);
  });

  it('returns notModified on 304 and sends the ETag', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 304 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getJson(conn, 'vacations/v1.json', '"abc"')).toEqual({ notModified: true });
    expect(fetchMock.mock.calls[0][1].headers['If-None-Match']).toBe('"abc"');
  });

  it('reports a stale sha as a 409', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 409 })));
    await expect(putJson(conn, 'vacations/v1.json', {}, 'msg', 'old')).rejects.toMatchObject({ status: 409 });
    expect(new GitHubError('x', 409)).toBeInstanceOf(Error);
  });
});

describe('sync cycle', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('pulls the partner’s edit, merges it with yours and pushes the result', async () => {
    const a = planner();
    useStore.setState(a);
    const base = canonical(extractShared(a, 'v1')!.data);
    useCollab.setState({ repo: 'gur/ski-plans', token: 't', displayName: 'Gur', shared: { v1: { sha: 's1', etag: null, base, lastSyncAt: '' } }, notices: [], pendingMatches: [] });

    // you added a hotel; your partner added a flight and changed the vacation name
    useStore.getState().saveOption('t1', 'hotels', hotel('h2', 120, 'Budget Inn'));
    const remoteData = { ...base, vacation: { ...base.vacation, name: 'January ski week' }, trips: [{ ...base.trips[0], flights: [{ id: 'f1', direction: 'outbound', airport: 'GVA', airline: 'El Al', homeCity: 'TLV', when: '', currency: 'EUR', pricePerPerson: 300, trolleyPrice: 0, checkedPrice: 0, link: '', notes: '' } as const] }] };
    const remoteFile: SharedVacationFile = { ...makeFile(a.winters[0], remoteData, 'Dana') };

    let pushed: SharedVacationFile | null = null;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        const body = JSON.parse(init.body as string);
        pushed = JSON.parse(decodeBase64(body.content));
        expect(body.sha).toBe('s2');
        return new Response(JSON.stringify({ content: { sha: 's3' } }), { status: 200 });
      }
      return new Response(JSON.stringify({ content: encodeBase64(JSON.stringify(remoteFile)), sha: 's2' }), { status: 200, headers: { etag: '"e2"' } });
    }));

    await syncNow('v1');
    const s = useStore.getState();
    expect(s.vacations[0].name).toBe('January ski week');
    expect(s.trips[0].hotels.map((h) => h.id)).toEqual(['h1', 'h2']);
    expect(s.trips[0].flights).toHaveLength(1);
    expect(pushed!.data.trips[0].hotels).toHaveLength(2);
    expect(pushed!.updatedBy).toBe('Gur');
    expect(useCollab.getState().shared.v1.sha).toBe('s3');
    expect(useCollab.getState().notices.some((n) => n.text.includes('Dana updated'))).toBe(true);
  });

  it('pulls and merges again when the partner pushed in between (409)', async () => {
    const a = planner();
    useStore.setState(a);
    const base = canonical(extractShared(a, 'v1')!.data);
    useCollab.setState({ repo: 'gur/ski-plans', token: 't', displayName: 'Gur', shared: { v1: { sha: 's1', etag: '"e1"', base, lastSyncAt: '' } }, notices: [], pendingMatches: [] });
    useStore.getState().updateVacation('v1', { status: 'decided' });

    const later = makeFile(a.winters[0], { ...base, vacation: { ...base.vacation, name: 'Renamed by Dana' } }, 'Dana');
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      calls.push(method);
      if (method === 'GET' && calls.length === 1) return new Response(null, { status: 304 }); // nothing new yet
      if (method === 'PUT' && calls.filter((c) => c === 'PUT').length === 1) return new Response('{}', { status: 409 }); // Dana pushed first
      if (method === 'GET') return new Response(JSON.stringify({ content: encodeBase64(JSON.stringify(later)), sha: 's2' }), { status: 200 });
      return new Response(JSON.stringify({ content: { sha: 's3' } }), { status: 200 });
    }));

    await syncNow('v1');
    expect(calls).toEqual(['GET', 'PUT', 'GET', 'PUT']);
    expect(useStore.getState().vacations[0]).toMatchObject({ name: 'Renamed by Dana', status: 'decided' });
    expect(useCollab.getState().shared.v1.sha).toBe('s3');
  });
});
