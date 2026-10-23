import { Check, ExternalLink, GraduationCap, Pencil, Plus, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { expenseShare, gasPerVehicle, gearKeys, lessonRiders, lessonShare, hotelPerPerson, passFor, passPrice, quoteFor, shopQuote, transferPerPerson, vacationDaysOf, vehiclesNeeded } from '../lib/combinations';
import { nightsOf, skiDaysOf } from '../lib/dates';
import { gearLabel, liftLabel, stayLabel, transferLabel } from '../lib/labels';
import { cx, money, moneyRange } from '../lib/util';
import { useResort, useStore } from '../store/useStore';
import { symbolOf } from '../lib/fx';
import type { Currency, Expense, Leg, PricedTrip, WinterFriend } from '../types';
import { blankExpense, blankFlight, blankHotel, blankPass, blankShop, blankTransfer, type AnyOption, type OptionKind } from './OptionForms';
import { lessonDaysLabel, lessonTitle } from './LessonEditor';
import { Avatar, Badge } from './ui';

export type EditFn = (kind: OptionKind, option: AnyOption, isNew: boolean) => void;
interface TabProps {
  trip: PricedTrip;
  friends: WinterFriend[]; // everyone going
  edit: EditFn;
}

const driveTime = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}` : `${min}m`);

/* ───────────────────────── Flights ───────────────────────── */

export function FlightsTab({ trip, friends, edit }: TabProps) {
  const resort = useResort(trip.resortId);
  const currency = useStore((s) => s.settings.currency);
  const ec = useStore((s) => s.settings.entryCurrency);
  const airports = useStore((s) => s.airports);
  const setFlightChoice = useStore((s) => s.setFlightChoice);
  const m = (n: number) => money(n, currency);
  const resortAirports = resort?.airports ?? [];

  const column = (leg: Leg) => {
    const list = trip.flights.filter((f) => f.direction === leg);
    return (
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
          {leg === 'outbound' ? '🛫 Departure' : '🛬 Return'} <span className="text-sm font-medium text-slate-400">{list.length}</span>
        </h3>
        <div className="space-y-5">
          {resortAirports.map((ra) => (
            <div key={ra.iata}>
              <div className="mb-2 flex items-center gap-2 text-sm">
                <span className="rounded-lg bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">{ra.iata}</span>
                <span className="font-semibold text-slate-600">{airports.find((a) => a.iata === ra.iata)?.city}</span>
                <span className="text-xs text-slate-400">{driveTime(ra.driveTimeMin)} to resort</span>
              </div>
              <div className="space-y-2">
                {list.filter((f) => f.airport === ra.iata).map((f) => (
                  <OptionCard key={f.id} origin={f.currency} onClick={() => edit('flights', f, false)} link={f.link} notes={f.notes}
                    title={`${f.airline || 'Flight'}${f.homeCity ? (leg === 'outbound' ? ` from ${f.homeCity}` : ` to ${f.homeCity}`) : ''}`}
                    detail={f.when}
                    price={m(f.pricePerPerson)}
                    priceSub={`🎒 one way${f.trolleyPrice ? ` · 🧳 +${m(f.trolleyPrice)}` : ''}${f.checkedPrice ? ` · 🛄 +${m(f.checkedPrice)}` : ''}`}
                  />
                ))}
                <AddTile compact onClick={() => edit('flights', blankFlight(ra.iata, leg, ec), true)} label={`Add ${leg === 'outbound' ? 'departure' : 'return'} via ${ra.iata}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const choiceSelect = (f: WinterFriend, leg: Leg) => {
    const value = trip.flightChoice[f.id]?.[leg] ?? '';
    return (
      <select
        className={cx('input py-1.5 text-xs', value && 'border-sky-300 bg-sky-50/60 font-semibold text-sky-800')}
        value={value}
        onChange={(e) => setFlightChoice(trip.id, f.id, leg, e.target.value || null)}
      >
        <option value="">Group’s flight</option>
        {trip.flights.filter((x) => x.direction === leg).map((x) => (
          <option key={x.id} value={x.id}>{x.airline || 'Flight'} · {x.airport} · {m(x.pricePerPerson)}</option>
        ))}
        <option value="none">Not flying with us</option>
      </select>
    );
  };

  return (
    <div className="space-y-8">
      {resortAirports.length === 0 && <div className="card p-6 text-center text-sm text-slate-500">This resort has no airports yet. Add them on the resort page.</div>}
      <div className="grid gap-8 lg:grid-cols-2">
        {column('outbound')}
        {column('return')}
      </div>

      <section className="card p-6">
        <h3 className="text-lg font-bold">Who flies what</h3>
        <p className="mb-4 text-sm text-slate-500">
          By default everyone takes the group’s flights, which the Trip comparison varies. Pick a specific flight for someone, or mark them as not flying with the group (driving, already there, one-way).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr><th className="pb-2">Rider</th><th className="pb-2 pl-3">🛫 Departure</th><th className="pb-2 pl-3">🛬 Return</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {friends.map((f) => (
                <tr key={f.id}>
                  <td className="py-2"><span className="flex items-center gap-2 font-semibold"><Avatar name={f.name} color={f.color} size={26} /> {f.name}</span></td>
                  <td className="py-2 pl-3">{choiceSelect(f, 'outbound')}</td>
                  <td className="py-2 pl-3">{choiceSelect(f, 'return')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ───────────────────────── Transfers & hotels ───────────────────────── */

export function TransfersTab({ trip, edit }: TabProps) {
  const resort = useResort(trip.resortId);
  const airports = useStore((s) => s.airports);
  const currency = useStore((s) => s.settings.currency);
  const ec = useStore((s) => s.settings.entryCurrency);
  const m = (n: number) => money(n, currency);
  const people = Math.max(1, trip.attendeeIds.length);
  return (
    <div className="space-y-7">
      {(resort?.airports ?? []).map((ra) => (
        <div key={ra.iata}>
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-lg bg-slate-900 px-2 py-0.5 text-sm font-bold text-white">{ra.iata}</span>
            <span className="text-sm font-semibold text-slate-700">{airports.find((a) => a.iata === ra.iata)?.name}</span>
            <span className="text-xs text-slate-400">{ra.distanceKm} km · {driveTime(ra.driveTimeMin)} to resort</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {trip.transfers.filter((t) => t.airport === ra.iata).map((t) => (
              <OptionCard key={t.id} origin={t.currency} onClick={() => edit('transfers', t, false)} link={t.link} notes={t.notes}
                title={transferLabel(t.type)}
                tags={<>
                  {t.provider && <Badge>{t.provider}</Badge>}
                  {gasPerVehicle(t) > 0 && <Badge color="amber">⛽ {m(gasPerVehicle(t))} gas / car</Badge>}
                </>}
                price={m(transferPerPerson(t, people))}
                unit={gasPerVehicle(t) > 0 ? 'per person incl. gas' : 'per person'}
                priceSub={`${t.pricing === 'per-vehicle' ? `${m(t.price)} per vehicle` : `${m(t.price)} per person`}${t.pricing === 'per-vehicle' || gasPerVehicle(t) > 0 ? ` · ${vehiclesNeeded(t, people)} × ${t.vehicleCapacity}-seat for ${people}` : ', round trip'}`}
              />
            ))}
            <AddTile onClick={() => edit('transfers', blankTransfer(ra.iata, ec), true)} label={`Add transfer via ${ra.iata}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HotelsTab({ trip, edit }: TabProps) {
  const currency = useStore((s) => s.settings.currency);
  const ec = useStore((s) => s.settings.entryCurrency);
  const m = (n: number) => money(n, currency);
  const people = Math.max(1, trip.attendeeIds.length);
  const nights = nightsOf(trip.dates);
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {trip.hotels.map((h) => (
        <OptionCard key={h.id} origin={h.currency} onClick={() => edit('hotels', h, false)} link={h.link} notes={h.notes}
          title={h.name || 'Unnamed hotel'}
          tags={<>
            <Badge color="violet">{stayLabel(h.type)}</Badge>
            {h.rating ? <Badge color="amber">{'★'.repeat(h.rating)}</Badge> : null}
            {h.skiInOut ? <Badge color="green">Ski-in/out</Badge> : liftLabel(h) ? <Badge>{h.walkable ? '🚶' : '🚗'} {liftLabel(h)}</Badge> : null}
          </>}
          price={m(hotelPerPerson(h, people, nights))}
          unit="total per person"
          priceSub={`${m(h.price)} ${h.per === 'stay' ? 'for the stay' : 'per night'} ${h.pricing === 'per-room' ? `per room (${h.roomCapacity} ppl)` : 'per person'}${h.per === 'night' ? ` × ${nights} nights` : ''}`}
        />
      ))}
      <AddTile onClick={() => edit('hotels', blankHotel(ec), true)} label="Add hotel" />
    </div>
  );
}

/* ───────────────────────── Ski passes ───────────────────────── */

export function PassesTab({ trip, friends, edit }: TabProps) {
  const currency = useStore((s) => s.settings.currency);
  const ec = useStore((s) => s.settings.entryCurrency);
  const setPassChoice = useStore((s) => s.setPassChoice);
  const m = (n: number) => money(n, currency);
  const days = skiDaysOf(trip.dates);
  const cheapest = [...trip.skiPasses].sort((a, b) => passPrice(a, days) - passPrice(b, days))[0];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {trip.skiPasses.map((p) => (
          <OptionCard key={p.id} origin={p.currency} onClick={() => edit('skiPasses', p, false)} notes={p.notes}
            title={p.name}
            tags={<>{p.id === cheapest?.id && <Badge color="green">cheapest</Badge>}<Badge>{trip.skiPasses.length > 1 ? `${friends.filter((f) => passFor(trip, f.id)?.id === p.id).length} riders` : 'everyone'}</Badge></>}
            price={m(passPrice(p, days))}
            priceSub={p.basis === 'per-day' ? `${m(p.price)} × ${days} ski days` : 'per person, whole stay'}
          />
        ))}
        <AddTile onClick={() => edit('skiPasses', blankPass(ec), true)} label="Add ski pass option" />
      </div>

      {trip.skiPasses.length > 0 && (
        <section className="card p-6">
          <h3 className="text-lg font-bold">Who gets which pass</h3>
          <p className="mb-4 text-sm text-slate-500">Everyone gets the cheapest pass unless you pick another, e.g. the full area with expert zones for the strong skiers.</p>
          <div className="space-y-2">
            {friends.map((f) => {
              const current = trip.passChoice[f.id];
              const effective = passFor(trip, f.id);
              return (
                <div key={f.id} className="flex flex-wrap items-center gap-3">
                  <span className="flex w-40 items-center gap-2 text-sm font-semibold"><Avatar name={f.name} color={f.color} size={26} /> {f.name}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {trip.skiPasses.map((p) => (
                      <Chip key={p.id} active={effective?.id === p.id} onClick={() => setPassChoice(trip.id, f.id, p.id === cheapest?.id ? null : p.id)}>
                        {p.name} · {m(passPrice(p, days))}
                      </Chip>
                    ))}
                    <Chip active={current === 'none'} onClick={() => setPassChoice(trip.id, f.id, 'none')}>No pass</Chip>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/* ───────────────────────── Ski stores: rental & lessons ───────────────────────── */

export function RentalTab({ trip, friends, edit }: TabProps) {
  const currency = useStore((s) => s.settings.currency);
  const ec = useStore((s) => s.settings.entryCurrency);
  const setShopChoice = useStore((s) => s.setShopChoice);
  const m = (n: number) => money(n, currency);
  const days = skiDaysOf(trip.dates);
  const renters = friends.filter((f) => gearKeys(f).length > 0);
  const setAll = (shopId: string | null) => renters.forEach((f) => setShopChoice(trip.id, f.id, shopId));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {trip.shops.map((s) => (
          <OptionCard key={s.id} origin={s.currency} onClick={() => edit('shops', s, false)} link={s.link} notes={s.notes}
            title={s.name}
            tags={<>
              <Badge>{Object.keys(s.prices).length} rental items</Badge>
              {s.lessons.length > 0 && <Badge color="amber"><GraduationCap size={11} /> {s.lessons.length} lesson{s.lessons.length > 1 ? 's' : ''}</Badge>}
            </>}
            price={s.basis === 'per-day' ? 'Per day' : 'Whole rental'}
            priceSub="rental pricing"
          />
        ))}
        <AddTile onClick={() => edit('shops', blankShop(ec), true)} label="Add ski store" />
      </div>

      {trip.shops.length > 0 && renters.length > 0 && (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 p-6 pb-3">
            <div>
              <h3 className="text-lg font-bold">Rental comparison</h3>
              <p className="text-sm text-slate-500">
                Gear rental for {days} ski days, per rider. Each rider defaults to the cheapest store with everything they need. Click a cell to choose.
              </p>
            </div>
            <button onClick={() => setAll(null)} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"><RotateCcw size={12} /> Reset to cheapest</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-2.5">Rider needs</th>
                  {trip.shops.map((s) => <th key={s.id} className="px-3 py-2.5 text-right">{s.name}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {renters.map((f) => {
                  const quotes = trip.shops.map((s) => shopQuote(s, f, days));
                  const best = Math.min(...quotes.filter((q) => !q.missing.length).map((q) => q.rental));
                  const chosen = quoteFor(trip, f)?.shop.id;
                  return (
                    <tr key={f.id}>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2 font-semibold"><Avatar name={f.name} color={f.color} size={24} /> {f.name}</div>
                        <div className="mt-0.5 text-xs text-slate-400">{gearKeys(f).map(gearLabel).join(' · ')}</div>
                      </td>
                      {quotes.map((q) => {
                        const isChosen = q.shop.id === chosen;
                        return (
                          <td key={q.shop.id} className="px-2 py-2 text-right">
                            <button
                              onClick={() => setShopChoice(trip.id, f.id, q.shop.id)}
                              className={cx('w-full rounded-xl px-3 py-2 text-right transition', isChosen ? 'bg-sky-50 ring-2 ring-sky-300' : 'hover:bg-slate-50')}
                            >
                              <div className={cx('font-bold', q.rental === best && !q.missing.length && 'text-emerald-600')}>
                                {isChosen && <Check size={13} className="mr-1 inline text-sky-600" />}{m(q.rental)}
                              </div>
                              {q.missing.length > 0 && <div className="text-[10px] text-amber-600">no {q.missing.map(gearLabel).join(', ')}</div>}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50/50">
                <tr>
                  <td className="px-6 py-3 text-xs font-semibold text-slate-500">Everyone at one store</td>
                  {trip.shops.map((s) => {
                    const total = renters.reduce((sum, f) => sum + shopQuote(s, f, days).rental, 0);
                    return (
                      <td key={s.id} className="px-3 py-3 text-right">
                        <button onClick={() => setAll(s.id)} className="rounded-full px-2 py-1 text-xs font-bold text-slate-700 hover:bg-white hover:shadow-sm" title="Send everyone to this store">
                          {m(total)} →
                        </button>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {trip.shops.length > 0 && <LessonsSection trip={trip} friends={friends} edit={edit} />}
      {trip.shops.length === 0 && <p className="text-sm text-slate-500">Add the ski stores near this resort to compare rental prices and set up lessons.</p>}
    </div>
  );
}

/** Every lesson offered by the trip's stores, with rider assignment. */
function LessonsSection({ trip, friends, edit }: TabProps) {
  const currency = useStore((s) => s.settings.currency);
  const saveOption = useStore((s) => s.saveOption);
  const m = (n: number) => money(n, currency);
  const lessons = trip.shops.flatMap((shop) => shop.lessons.map((lesson) => ({ shop, lesson })));
  const assigned = new Set(lessons.flatMap(({ lesson }) => lessonRiders(lesson, trip.attendeeIds)));
  const waiting = friends.filter((f) => f.lessons.wanted && !assigned.has(f.id));

  // assignments are saved on the store as entered (the tab shows converted copies)
  const toggleRider = (shopId: string, lessonId: string, friendId: string) => {
    // read the latest store state so quick successive taps don't overwrite each other
    const shop = useStore.getState().trips.find((t) => t.id === trip.id)?.shops.find((s) => s.id === shopId);
    if (!shop) return;
    const next = shop.lessons.map((l) =>
      l.id !== lessonId ? l : { ...l, friendIds: l.friendIds.includes(friendId) ? l.friendIds.filter((x) => x !== friendId) : [...l.friendIds, friendId] },
    );
    saveOption(trip.id, 'shops', { ...shop, lessons: next });
  };

  return (
    <section className="card p-6">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
        <h3 className="text-lg font-bold">Lessons</h3>
        {waiting.length > 0 && (
          <span className="text-xs text-amber-600">Want lessons but not assigned: {waiting.map((f) => `${f.name} (${f.lessons.type})`).join(', ')}</span>
        )}
      </div>
      <p className="mb-4 text-sm text-slate-500">Tap riders to assign them. A private lesson’s full price is split between the riders sharing it.</p>
      {lessons.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
          No lessons yet. Open a store and use <b>Add lesson</b>.
          {trip.shops.length === 1 && <button className="ml-2 font-semibold text-sky-600" onClick={() => edit('shops', trip.shops[0], false)}>Open {trip.shops[0].name} →</button>}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lessons.map(({ shop, lesson }) => {
            const riders = lessonRiders(lesson, trip.attendeeIds);
            const each = lessonShare(lesson, riders.length || (lesson.type === 'private' ? lesson.people : 1));
            return (
              <div key={lesson.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold"><GraduationCap size={15} className="text-amber-500" /> {lessonTitle(lesson)}</div>
                    <div className="text-xs text-slate-500">{shop.name} · {lessonDaysLabel(lesson)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold">{m(each)}</div>
                    <div className="text-[10px] text-slate-400">per rider{!riders.length && lesson.type === 'private' ? ` if ${lesson.people} share` : ''}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {friends.map((f) => {
                    const on = lesson.friendIds.includes(f.id);
                    return (
                      <button key={f.id} onClick={() => toggleRider(shop.id, lesson.id, f.id)}
                        className={cx('flex items-center gap-1 rounded-full border py-0.5 pl-0.5 pr-2 text-xs font-semibold transition', on ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-400 hover:text-slate-600')}>
                        <Avatar name={f.name} color={f.color} size={18} /> {f.name}
                      </button>
                    );
                  })}
                </div>
                {lesson.type === 'private' && riders.length > 0 && riders.length !== lesson.people && (
                  <div className="mt-2 text-xs text-amber-600">
                    {riders.length < lesson.people
                      ? `Priced for ${lesson.people}: the ${riders.length} assigned split the full price.`
                      : `Priced for ${lesson.people}, ${riders.length} assigned: each pays the per-person price.`}
                  </div>
                )}
                {lesson.notes && <div className="mt-2 text-xs text-slate-400">{lesson.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ───────────────────────── Expenses ───────────────────────── */

export function ExpensesTab({ trip, friends, edit }: TabProps) {
  const currency = useStore((s) => s.settings.currency);
  const ec = useStore((s) => s.settings.entryCurrency);
  const days = vacationDaysOf(trip);
  const describe = (e: Expense) => {
    const who = e.friendIds ? `${e.friendIds.filter((id) => trip.attendeeIds.includes(id)).length} people` : 'everyone';
    return `${e.split === 'shared' ? 'Shared by' : 'Each of'} ${who}${e.per === 'day' ? ` · per day × ${days}` : ''}`;
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Anything else this resort costs: gas, car rental, parking, food, après… Use a price range when it’s an estimate.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {trip.expenses.map((e) => {
          const shares = friends.map((f) => expenseShare(e, f.id, trip.attendeeIds, days)).filter((r) => r.max > 0);
          const perPerson = shares[0];
          return (
            <OptionCard key={e.id} origin={e.currency} onClick={() => edit('expenses', e, false)} notes={e.notes}
              title={e.name}
              tags={<><Badge color={e.split === 'shared' ? 'sky' : 'violet'}>{e.split}</Badge>{e.amount.max !== e.amount.min && <Badge color="amber">estimate</Badge>}</>}
              detail={describe(e)}
              price={perPerson ? moneyRange(perPerson, currency) : '–'}
              priceSub={`per person · ${moneyRange(e.amount, currency)}${e.per === 'day' ? '/day' : ' total'}`}
            />
          );
        })}
        <AddTile onClick={() => edit('expenses', blankExpense(ec), true)} label="Add expense" />
      </div>
    </div>
  );
}

/* ───────────────────────── Shared bits ───────────────────────── */

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={cx('rounded-full border px-3 py-1 text-xs font-semibold transition', active ? 'border-sky-400 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
      {children}
    </button>
  );
}

export function OptionCard({ title, tags, detail, price, unit, priceSub, link, notes, origin, onClick }: {
  title: string; tags?: ReactNode; detail?: string; price: string; unit?: string; priceSub: string; link?: string; notes?: string;
  origin?: Currency; // currency the prices were entered in; flagged when it differs from the display currency
  onClick: () => void;
}) {
  const display = useStore((s) => s.settings.currency);
  return (
    <button onClick={onClick} className="card group flex w-full flex-col p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-2">
        <div className="text-base font-bold">{title}</div>
        <span className="flex shrink-0 items-center gap-1.5">
          {origin && origin !== display && <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500" title={`Entered in ${origin}, shown converted`}>{symbolOf(origin)} {origin}</span>}
          <Pencil size={14} className="text-slate-200 group-hover:text-slate-500" />
        </span>
      </div>
      {tags && <div className="mt-1.5 flex flex-wrap gap-1.5">{tags}</div>}
      {detail && <div className="mt-2 text-xs text-slate-500">{detail}</div>}
      {notes && <div className="mt-1 line-clamp-2 text-xs text-slate-400">{notes}</div>}
      <div className="mt-auto flex items-end justify-between pt-4">
        <div>
          <div className="text-xl font-extrabold">
            {price}
            {unit && <span className="ml-1.5 text-xs font-semibold text-slate-400">{unit}</span>}
          </div>
          <div className="text-xs text-slate-400">{priceSub}</div>
        </div>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-full p-1.5 text-sky-600 hover:bg-sky-50">
            <ExternalLink size={15} />
          </a>
        )}
      </div>
    </button>
  );
}

export function AddTile({ onClick, label, compact }: { onClick: () => void; label: string; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-400 transition hover:border-sky-300 hover:bg-sky-50/40 hover:text-sky-600',
        compact ? 'py-3' : 'min-h-32',
      )}
    >
      <Plus size={16} /> {label}
    </button>
  );
}

