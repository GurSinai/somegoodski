import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialData } from '../data/seed';
import { migrate } from '../store/migrate';
import { newFriend, useStore, vacationPeople } from '../store/useStore';
import type { AppData, HotelOption, Trip, VacationGuest } from '../types';
import { applyShared, extractShared, makeFile, type Me, type SharedVacationFile } from './bundle';
import { canonical, ConflictError, localShared, setBackend, shareVacation, syncNow, type Backend } from './engine';
import { exportVacationFile, importKind, importVacationFile } from './fileShare';
import { deepEqual, merge3, type Conflict } from './merge';
import { useCollab } from './useCollab';

const GUR: Me = { id: 'gur', name: 'Gur', ids: ['gur'] };
const DANA: Me = { id: 'dana', name: 'Dana', ids: ['dana'] };

const hotel = (id: string, price: number, name = id): HotelOption => ({
  id, name, currency: 'EUR', price, per: 'night', pricing: 'per-room', roomCapacity: 2, type: 'hotel', rating: null, skiInOut: false, walkable: true, liftMin: 5, link: '', notes: '',
});
const trip = (patch: Partial<Trip> = {}): Trip => ({
  id: 't1', vacationId: 'v1', resortId: 'tignes-val-disere', name: 'Tignes', flights: [], transfers: [], hotels: [], skiPasses: [], shops: [], expenses: [],
  flightChoice: {}, passChoice: {}, shopChoice: {}, selectedComboId: null, createdAt: '2026-10-01T00:00:00Z', ...patch,
});
const guest = (id: string, name: string, by: Me, availability: string[] = []): VacationGuest => ({
  id, profile: { ...newFriend(3, { name }), id: undefined } as never, availability, budget: 4000, budgetCurrency: 'ILS', addedBy: by.id, addedByName: by.name,
});

/** Gur's data: one winter, Ben (going) and Noa (not going), one vacation with one trip. */
function gurData(): AppData {
  const d = createInitialData();
  return {
    ...d,
    friends: [newFriend(0, { id: 'ben', name: 'Ben' }), newFriend(1, { id: 'noa', name: 'Noa' })],
    winters: [{ id: 'w-gur', year: 2027, start: '2026-12-01', end: '2027-04-15', createdAt: '', participants: [
      { friendId: 'ben', availability: ['2027-01-10', '2027-01-11'], budget: 5000, budgetCurrency: 'ILS' },
      { friendId: 'noa', availability: [], budget: 0, budgetCurrency: 'ILS' },
    ] }],
    vacations: [{ id: 'v1', winterId: 'w-gur', name: 'January', dates: { start: '2027-01-09', end: '2027-01-16' }, attendeeIds: ['ben'], status: 'planning', selectedTripId: null, luggage: [], guests: [], createdAt: '' }],
    trips: [trip({ hotels: [hotel('h1', 200, 'Old Chalet')] })],
  };
}

describe('three-way merge', () => {
  const base = trip({ hotels: [hotel('h1', 200)] });

  it('keeps disjoint edits from both sides', () => {
    const conflicts: Conflict[] = [];
    const m = merge3(base, { ...base, hotels: [...base.hotels, hotel('h2', 150)] }, { ...base, flights: [{ id: 'f1' } as never] }, conflicts);
    expect(m.hotels.map((h) => h.id)).toEqual(['h1', 'h2']);
    expect(m.flights).toHaveLength(1);
    expect(conflicts).toEqual([]);
  });

  it('lets the local edit win a same-field conflict and reports it', () => {
    const conflicts: Conflict[] = [];
    expect(merge3(base, { ...base, hotels: [hotel('h1', 220)] }, { ...base, hotels: [hotel('h1', 180)] }, conflicts).hotels[0].price).toBe(220);
    expect(conflicts).toMatchObject([{ path: ['hotels', 'h1', 'price'], kept: 220, replaced: 180, kind: 'value' }]);
  });

  it('deletes a record only when the other side left it alone', () => {
    expect(merge3(base, { ...base, hotels: [] }, base).hotels).toEqual([]);
    const conflicts: Conflict[] = [];
    expect(merge3(base, { ...base, hotels: [] }, { ...base, hotels: [hotel('h1', 250)] }, conflicts).hotels[0].price).toBe(250);
    expect(conflicts[0].kind).toBe('kept-deleted');
  });

  it('merges string lists as sets and maps key by key', () => {
    const b = { days: ['a', 'b', 'c'], pass: { ben: 'p1', noa: 'p1' } as Record<string, string> };
    expect(merge3(b, { days: ['a', 'b', 'c', 'd'], pass: { ben: 'p2', noa: 'p1' } }, { days: ['a', 'c'], pass: { noa: 'p1', dana: 'p1' } as Record<string, string> }))
      .toEqual({ days: ['a', 'c', 'd'], pass: { ben: 'p2', noa: 'p1', dana: 'p1' } });
  });
});

describe('people in a vacation', () => {
  it('lists your attendees and the guests, with owners', () => {
    const d = gurData();
    d.vacations[0].guests = [guest('omer', 'Omer', DANA, ['2027-01-12'])];
    d.vacations[0].attendeeIds.push('omer');
    const people = vacationPeople(d.friends, d.winters[0], d.vacations[0], (a) => a);
    expect(people.map((p) => [p.name, p.guest?.addedByName ?? 'me'])).toEqual([['Ben', 'me'], ['Omer', 'Dana']]);
    expect(people[1].availability).toEqual(['2027-01-12']);
  });

  it('routes edits to your roster or to the guest', () => {
    const d = gurData();
    d.vacations[0].guests = [guest('omer', 'Omer', DANA)];
    d.vacations[0].attendeeIds.push('omer');
    useStore.setState(d);
    const s = useStore.getState();
    s.setVacationAvailability('v1', 'ben', ['2027-01-12'], true);
    s.setVacationAvailability('v1', 'omer', ['2027-01-13'], true);
    s.updateVacationPerson('v1', 'omer', { skillLevel: 'expert' });
    s.setVacationBudget('v1', 'ben', 6000, 'EUR');
    const after = useStore.getState();
    expect(after.winters[0].participants[0]).toMatchObject({ availability: ['2027-01-10', '2027-01-11', '2027-01-12'], budget: 6000, budgetCurrency: 'EUR' });
    expect(after.vacations[0].guests[0]).toMatchObject({ availability: ['2027-01-13'], profile: { skillLevel: 'expert' } });
    expect(after.friends.some((f) => f.id === 'omer')).toBe(false); // guests never enter your roster
    after.removeFromVacation('v1', 'ben');
    expect(useStore.getState().friends.some((f) => f.id === 'ben')).toBe(true); // removing keeps the profile
  });

  it('migrates v7 data by giving vacations an empty guest list', () => {
    const d = gurData() as unknown as { vacations: { guests?: unknown }[] };
    delete d.vacations[0].guests;
    expect(migrate({ ...d, version: 7 }, 7).vacations[0].guests).toEqual([]);
  });
});

describe('shared bundle', () => {
  it('tags your people and turns the partner’s into guests on their side', () => {
    const ex = extractShared(gurData(), 'v1', GUR)!;
    expect(ex.data.people).toMatchObject([{ id: 'ben', addedBy: 'gur', addedByName: 'Gur', availability: ['2027-01-10', '2027-01-11'] }]);

    // Dana has no Ben: he arrives as a guest, filed under her own winter of the same year
    const dana = applyShared(createInitialData(), makeFile(ex.winter, ex.data, 'Gur').winter, ex.data, DANA);
    expect(dana.friends).toEqual([]);
    expect(dana.winters).toHaveLength(1);
    expect(dana.vacations[0].guests).toMatchObject([{ id: 'ben', addedByName: 'Gur' }]);
    expect(canonical(extractShared(dana, 'v1', DANA)!.data)).toEqual(canonical(ex.data));
  });

  it('brings the partner’s edits to your friend back into your roster', () => {
    const d = gurData();
    const ex = extractShared(d, 'v1', GUR)!;
    const edited = { ...ex.data, people: [{ ...ex.data.people[0], profile: { ...ex.data.people[0].profile, skillLevel: 'expert' as const }, availability: ['2027-01-14'] }] };
    const back = applyShared(d, { year: 2027, start: '', end: '' }, edited, GUR);
    expect(back.friends.find((f) => f.id === 'ben')!.skillLevel).toBe('expert');
    expect(back.winters[0].participants.find((p) => p.friendId === 'ben')!.availability).toEqual(['2027-01-14']);
    expect(back.vacations[0].guests).toEqual([]);
  });

  it('two of your devices with different display names settle instead of relabelling forever', () => {
    const laptop: Me = { id: 'gur', name: 'Gur', ids: ['gur'] };
    const phone: Me = { id: 'gur', name: 'גור', ids: ['gur', 'local-phone'] };
    const W = { year: 2027, start: '2026-12-01', end: '2027-04-15' };
    type Device = { me: Me; data: AppData; base: ReturnType<typeof canonical>; version: number };
    let remote = { data: canonical(extractShared(gurData(), 'v1', laptop)!.data), version: 1 };
    const open = (me: Me): Device => {
      const data = applyShared(createInitialData(), W, remote.data, me);
      return { me, data, base: canonical(extractShared(data, 'v1', me, remote.data)!.data), version: 1 };
    };
    // one sync cycle, as engine.cycle runs it
    const sync = (d: Device) => {
      const r = remote.version !== d.version ? remote.data : d.base;
      const local = canonical(extractShared(d.data, 'v1', d.me, d.base)!.data);
      const merged = canonical(merge3(d.base, local, r));
      d.data = applyShared(d.data, W, merged, d.me);
      const final = canonical(extractShared(d.data, 'v1', d.me, merged)!.data);
      d.base = final;
      if (deepEqual(final, r)) return void (d.version = remote.version);
      remote = { data: final, version: remote.version + 1 };
      d.version = remote.version;
      saves++;
    };
    let saves = 0;
    const devices = [open(laptop), open(phone)];
    devices[1].data = { ...devices[1].data, trips: devices[1].data.trips.map((t) => ({ ...t, name: 'Edited on phone' })) };
    for (let round = 0; round < 10; round++) devices.forEach(sync);
    expect(saves).toBe(1); // the phone's edit, and nothing after it
    expect(remote.data.people[0].addedByName).toBe('Gur'); // the existing label stays
    expect(remote.data.trips[0].name).toBe('Edited on phone');
  });

  it('keeps your roster when the partner removes your friend from the vacation', () => {
    const d = gurData();
    const ex = extractShared(d, 'v1', GUR)!;
    const back = applyShared(d, { year: 2027, start: '', end: '' }, { ...ex.data, people: [], vacation: { ...ex.data.vacation, attendeeIds: [] } }, GUR);
    expect(back.vacations[0].attendeeIds).toEqual([]);
    expect(back.friends.map((f) => f.id)).toEqual(['ben', 'noa']);
  });
});

/** An in-memory backend standing in for Firestore. */
function fakeBackend() {
  const docs = new Map<string, { file: SharedVacationFile; version: number }>();
  const calls: string[] = [];
  let failNextSave = false;
  const b: Backend & { docs: typeof docs; calls: string[]; failNextSave: () => void } = {
    docs, calls,
    failNextSave: () => (failNextSave = true),
    async get(id) { calls.push('get'); return docs.get(id) ?? null; },
    async save(id, file, expected) {
      calls.push('save');
      const cur = docs.get(id)!;
      if (failNextSave || cur.version !== expected) {
        failNextSave = false;
        // someone else saved first
        docs.set(id, { ...cur, version: cur.version + 1 });
        throw new ConflictError();
      }
      docs.set(id, { file, version: expected + 1 });
      return expected + 1;
    },
    async create(id, file) { docs.set(id, { file, version: 1 }); },
    async remove(id) { docs.delete(id); },
    watch() { return () => {}; },
  };
  return b;
}

describe('sync engine', () => {
  beforeEach(() => {
    useCollab.setState({ displayName: 'Gur', plannerId: 'gur', myIds: ['gur'], shared: {}, fileBases: {}, notices: [] });
    useStore.setState(gurData());
  });

  it('shares, merges the partner’s live change with yours and saves version + 1', async () => {
    const be = fakeBackend();
    setBackend(be);
    await shareVacation('v1');
    expect(be.docs.get('v1')!.version).toBe(1);

    // Dana renames the vacation and adds her friend Omer (her save is version 2)
    const doc = be.docs.get('v1')!;
    const danaData = { ...doc.file.data, vacation: { ...doc.file.data.vacation, name: 'January ski week', attendeeIds: ['ben', 'omer'] }, people: [...doc.file.data.people, guest('omer', 'Omer', DANA)] };
    be.docs.set('v1', { file: { ...doc.file, updatedBy: 'Dana', data: danaData }, version: 2 });

    // meanwhile you added a hotel
    useStore.getState().saveOption('t1', 'hotels', hotel('h2', 120, 'Budget Inn'));
    await syncNow('v1');

    const s = useStore.getState();
    expect(s.vacations[0].name).toBe('January ski week');
    expect(s.vacations[0].guests.map((g) => g.profile.name)).toEqual(['Omer']);
    expect(s.trips[0].hotels.map((h) => h.id)).toEqual(['h1', 'h2']);
    expect(be.docs.get('v1')!.version).toBe(3);
    expect(be.docs.get('v1')!.file.data.trips[0].hotels).toHaveLength(2);
    expect(useCollab.getState().notices.some((n) => n.text === 'Dana added Omer to “January ski week”.')).toBe(true);
    setBackend(null);
  });

  it('fetches, merges and retries when someone saved first', async () => {
    const be = fakeBackend();
    setBackend(be);
    await shareVacation('v1');
    useStore.getState().updateVacation('v1', { status: 'decided' });
    be.failNextSave();
    be.calls.length = 0;
    await syncNow('v1');
    expect(be.calls).toEqual(['get', 'save', 'get', 'save']);
    expect(useCollab.getState().shared.v1.version).toBe(3);
    expect(useCollab.getState().status).not.toBe('error');
    setBackend(null);
  });

  it('keeps an edit made while a sync is waiting for the server', async () => {
    const be = fakeBackend();
    setBackend(be);
    await shareVacation('v1');
    // the partner saved something, so this sync will merge and write back
    const doc = be.docs.get('v1')!;
    be.docs.set('v1', { file: { ...doc.file, updatedBy: 'Dana', data: { ...doc.file.data, vacation: { ...doc.file.data.vacation, status: 'decided' } } }, version: 2 });
    // you rename the vacation while the request is in flight
    const realGet = be.get;
    be.get = async (id) => {
      const r = await realGet(id);
      useStore.getState().updateVacation('v1', { name: 'Renamed mid-sync' });
      return r;
    };
    await syncNow('v1');
    expect(useStore.getState().vacations[0]).toMatchObject({ name: 'Renamed mid-sync', status: 'decided' });
    expect(be.docs.get('v1')!.file.data.vacation).toMatchObject({ name: 'Renamed mid-sync', status: 'decided' });
    setBackend(null);
  });

  it('pauses instead of saving over and over when copies keep disagreeing', async () => {
    const be = fakeBackend();
    setBackend(be);
    await shareVacation('v1');
    // another copy keeps saving a different name, and ours keeps saving it back
    let n = 0;
    const realGet = be.get;
    be.get = async (id) => {
      const r = (await realGet(id))!;
      const flipped = { ...r.file, updatedBy: 'Other', data: { ...r.file.data, trips: r.file.data.trips.map((t) => ({ ...t, name: `Other ${n++}` })) } };
      useStore.getState().updateTrip('t1', { name: `Mine ${n}` }); // local copy disagrees again
      return { file: flipped, version: r.version + 1 };
    };
    for (let i = 0; i < 12; i++) await syncNow('v1');
    expect(be.calls.filter((c) => c === 'save').length).toBeLessThanOrEqual(8);
    expect(useCollab.getState().shared.v1.paused).toMatch(/paused/);
    setBackend(null);
  });

  it('keeps offline edits waiting and saves them once back online', async () => {
    const be = fakeBackend();
    setBackend(be);
    await shareVacation('v1');
    const realGet = be.get;
    be.get = async () => { throw Object.assign(new Error('offline'), { code: 'unavailable' }); };
    useStore.getState().updateVacation('v1', { name: 'Offline edit' });
    await syncNow('v1');
    expect(useCollab.getState().status).toBe('offline');
    expect(useCollab.getState().waiting).toBe(1);

    be.get = realGet;
    await syncNow('v1');
    expect(be.docs.get('v1')!.file.data.vacation.name).toBe('Offline edit');
    expect(useCollab.getState().waiting).toBe(0);
    setBackend(null);
  });
});

describe('vacation files', () => {
  beforeEach(() => {
    useCollab.setState({ displayName: 'Gur', plannerId: 'gur', myIds: ['gur'], shared: {}, fileBases: {}, notices: [] });
  });

  const fileFrom = (d: AppData, me: Me) => {
    const ex = extractShared(d, 'v1', me)!;
    return makeFile(ex.winter, ex.data, me.name);
  };

  it('imports a new vacation into a fresh profile', () => {
    useStore.setState(createInitialData());
    const f = fileFrom(gurData(), GUR);
    useCollab.setState({ plannerId: 'dana', myIds: ['dana'] });
    expect(importKind(f)).toBe('new');
    const r = importVacationFile(f);
    const s = useStore.getState();
    expect(s.vacations[0]).toMatchObject({ id: 'v1', winterId: r.winterId });
    expect(s.vacations[0].guests.map((g) => g.addedByName)).toEqual(['Gur']);
    expect(s.trips).toHaveLength(1);
  });

  it('merges a returned file three-way with the one you sent', () => {
    useStore.setState(gurData());
    globalThis.URL.createObjectURL ??= () => 'blob:';
    globalThis.URL.revokeObjectURL ??= () => {};
    (globalThis as { document?: unknown }).document ??= { createElement: () => ({ click() {} }) };
    exportVacationFile('v1'); // remembers what you sent as the base
    const sent = useCollab.getState().fileBases.v1;

    // Dana changed the hotel price; you renamed the vacation meanwhile
    const theirs = { ...sent, trips: [{ ...sent.trips[0], hotels: [hotel('h1', 180, 'Old Chalet')] }] };
    useStore.getState().updateVacation('v1', { name: 'Renamed here' });
    expect(importKind(makeFile(gurData().winters[0], theirs, 'Dana'))).toBe('merge');
    const { conflicts } = importVacationFile(makeFile(gurData().winters[0], theirs, 'Dana'));
    expect(conflicts).toEqual([]);
    expect(useStore.getState().vacations[0].name).toBe('Renamed here');
    expect(useStore.getState().trips[0].hotels[0].price).toBe(180);
  });

  it('without a common base, merging keeps yours on conflicts and replace takes theirs', () => {
    useStore.setState(gurData());
    const theirs = fileFrom({ ...gurData(), vacations: [{ ...gurData().vacations[0], name: 'Their name' }] }, GUR);
    useStore.getState().updateVacation('v1', { name: 'My name' });
    expect(importKind(theirs)).toBe('ask');
    expect(importVacationFile(theirs, 'merge').conflicts.length).toBeGreaterThan(0);
    expect(localShared('v1')!.data.vacation.name).toBe('My name');
    importVacationFile(theirs, 'replace');
    expect(localShared('v1')!.data.vacation.name).toBe('Their name');
  });
});
