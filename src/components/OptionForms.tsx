import { Fuel } from 'lucide-react';
import { useEffect, useState } from 'react';
import { vehiclesNeeded } from '../lib/combinations';
import { GEAR_PRICE_ROWS, STAY_TYPES, TRANSFER_TYPES } from '../lib/labels';
import { nightsOf } from '../lib/dates';
import { cx, money, uid } from '../lib/util';
import { useConverter, useStore, type OptionKind } from '../store/useStore';
import type {
  Currency, Expense, FlightOption, GasEstimate, Range, GearPriceKey, HotelOption, Leg, PricedTrip, RentalShop, SkiPassOption, TransferOption, WinterFriend,
} from '../types';
import CurrencyPicker from './CurrencyPicker';
import LessonEditor from './LessonEditor';
import { Avatar, Button, Drawer, Field, NumberInput, Segmented, Toggle } from './ui';

export type { OptionKind };

export const blankFlight = (airport: string, direction: Leg, currency: Currency): FlightOption => ({
  id: uid(), direction, airport, airline: '', homeCity: '', when: '', currency, pricePerPerson: 0, trolleyPrice: 0, checkedPrice: 0, link: '', notes: '',
});
export const blankTransfer = (airport: string, currency: Currency): TransferOption => ({
  id: uid(), airport, type: 'shuttle', provider: '', pricing: 'per-person', currency, price: 0, vehicleCapacity: 8, link: '', notes: '',
});
export const blankHotel = (currency: Currency): HotelOption => ({
  id: uid(), name: '', currency, price: 0, per: 'night', pricing: 'per-room', roomCapacity: 2, type: 'hotel', rating: null, skiInOut: false, walkable: true, liftMin: 0, link: '', notes: '',
});
export const blankPass = (currency: Currency): SkiPassOption => ({ id: uid(), name: '', basis: 'whole-stay', currency, price: 0, notes: '' });
export const blankShop = (currency: Currency): RentalShop => ({
  id: uid(), name: '', basis: 'whole-stay', currency, prices: {}, lessons: [], link: '', notes: '',
});
export const blankExpense = (currency: Currency): Expense => ({
  id: uid(), name: '', split: 'shared', currency, amount: { min: 0, max: 0 }, per: 'trip', friendIds: null, notes: '',
});

export type AnyOption = FlightOption | TransferOption | HotelOption | SkiPassOption | RentalShop | Expense;

interface Props {
  trip: PricedTrip;
  kind: OptionKind;
  option: AnyOption;
  isNew: boolean;
  friends: WinterFriend[];
  onClose: () => void;
}

const TITLES: Record<OptionKind, string> = {
  flights: 'flight', transfers: 'transfer', hotels: 'hotel', skiPasses: 'ski pass', shops: 'ski store', expenses: 'expense',
};

export default function OptionDrawer({ trip, kind, option, isNew, friends, onClose }: Props) {
  const saveOption = useStore((s) => s.saveOption);
  const removeOption = useStore((s) => s.removeOption);
  const updateSettings = useStore((s) => s.updateSettings);
  const resort = useStore((s) => s.resorts.find((r) => r.id === trip.resortId));
  const airports = useStore((s) => s.airports);
  const [draft, setDraft] = useState<AnyOption>(option);

  useEffect(() => setDraft(option), [option]);

  const set = (patch: Partial<AnyOption>) => setDraft((d) => ({ ...d, ...patch }) as AnyOption);
  const currency = draft.currency; // prices in this form are entered in the option's own currency
  const needsAirport = kind === 'flights' || kind === 'transfers';
  const needsName = kind === 'skiPasses' || kind === 'shops' || kind === 'expenses';
  const valid = (!needsAirport || !!(draft as FlightOption).airport) && (!needsName || !!(draft as SkiPassOption).name.trim());

  const airportPicker = (value: string, label = 'Airport') => (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5">
        {(resort?.airports ?? []).map((a) => (
          <button
            key={a.iata}
            type="button"
            onClick={() => set({ airport: a.iata } as Partial<FlightOption>)}
            className={cx(
              'rounded-full border px-3 py-1.5 text-sm font-semibold transition',
              value === a.iata ? 'border-sky-400 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-600 hover:border-slate-300',
            )}
          >
            {a.iata}
            <span className="ml-1 text-xs font-normal text-slate-400">{airports.find((x) => x.iata === a.iata)?.city}</span>
          </button>
        ))}
        {!resort?.airports.length && <span className="text-sm text-slate-500">Add airports on the resort page first.</span>}
      </div>
    </Field>
  );

  return (
    <Drawer
      open
      onClose={onClose}
      title={`${isNew ? 'Add' : 'Edit'} ${kind === 'flights' ? ((draft as FlightOption).direction === 'outbound' ? 'departure flight' : 'return flight') : TITLES[kind]}`}
      footer={
        <>
          {!isNew && (
            <Button variant="danger" className="mr-auto" onClick={() => { removeOption(trip.id, kind, draft.id); onClose(); }}>
              Delete
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!valid}
            onClick={() => {
              // a range typed high-to-low is still a range
              const amount = kind === 'expenses' ? (draft as Expense).amount : null;
              const toSave = amount && amount.max < amount.min ? { ...draft, amount: { min: amount.max, max: amount.min } } : draft;
              saveOption(trip.id, kind, toSave as never);
              updateSettings({ entryCurrency: draft.currency }); // next new price starts in the same currency
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="-mt-2 flex items-center justify-between rounded-2xl bg-sky-50/60 px-3 py-2">
        <span className="text-xs font-semibold text-slate-500">Prices entered in</span>
        <CurrencyPicker value={draft.currency} onChange={(c) => set({ currency: c })} />
      </div>
      {kind === 'flights' && (() => {
        const f = draft as FlightOption;
        const out = f.direction === 'outbound';
        return (
          <>
            <Segmented
              value={f.direction}
              onChange={(direction) => set({ direction })}
              options={[{ value: 'outbound', label: '🛫 Departure' }, { value: 'return', label: '🛬 Return' }]}
            />
            {airportPicker(f.airport, out ? 'Lands at' : 'Departs from')}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Airline"><input className="input" autoFocus value={f.airline} onChange={(e) => set({ airline: e.target.value })} placeholder="e.g. EasyJet" /></Field>
              <Field label={out ? 'Flying from' : 'Flying to'}><input className="input" value={f.homeCity} onChange={(e) => set({ homeCity: e.target.value })} placeholder="e.g. TLV" /></Field>
            </div>
            <Field label="When"><input className="input" value={f.when} onChange={(e) => set({ when: e.target.value })} placeholder="Sat 9 Jan 06:10 → 09:45" /></Field>
            <div className="rounded-2xl bg-slate-50/80 p-4">
              <span className="label">Price per person, one way ({currency})</span>
              <div className="grid grid-cols-3 gap-3">
                <Field label="🎒 Backpack only"><NumberInput value={f.pricePerPerson} onChange={(pricePerPerson) => set({ pricePerPerson })} min={0} /></Field>
                <Field label="🧳 + per trolley"><NumberInput value={f.trolleyPrice} onChange={(trolleyPrice) => set({ trolleyPrice })} min={0} /></Field>
                <Field label="🛄 + per checked"><NumberInput value={f.checkedPrice} onChange={(checkedPrice) => set({ checkedPrice })} min={0} /></Field>
              </div>
              <p className="mt-2 text-xs text-slate-400">Who carries which bags is set on the vacation page. Ski / board bags count as checked luggage.</p>
            </div>
          </>
        );
      })()}

      {kind === 'transfers' && (() => {
        const t = draft as TransferOption;
        const roundTripKm = 2 * (resort?.airports.find((a) => a.iata === t.airport)?.distanceKm ?? 0);
        const setType = (type: TransferOption['type']) =>
          set(type === 'rental-car'
            ? { type, pricing: 'per-vehicle', vehicleCapacity: t.type === 'rental-car' ? t.vehicleCapacity : 5, gas: t.gas ?? defaultGas(roundTripKm, t.currency) }
            : { type, gas: undefined });
        return (
          <>
            {airportPicker(t.airport)}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className="input" value={t.type} onChange={(e) => setType(e.target.value as TransferOption['type'])}>
                  {TRANSFER_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
              </Field>
              <Field label="Provider"><input className="input" value={t.provider} onChange={(e) => set({ provider: e.target.value })} placeholder="e.g. Ben's Bus" /></Field>
            </div>
            <div>
              <span className="label">Pricing</span>
              <Segmented value={t.pricing} onChange={(pricing) => set({ pricing })} options={[{ value: 'per-person', label: 'Per person' }, { value: 'per-vehicle', label: 'Per vehicle / group' }]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Round trip ${t.pricing === 'per-person' ? 'per person' : 'per vehicle'} (${currency})`}>
                <NumberInput value={t.price} onChange={(price) => set({ price })} min={0} />
              </Field>
              {(t.pricing === 'per-vehicle' || t.type === 'rental-car') && (
                <Field label="Seats per vehicle"><NumberInput value={t.vehicleCapacity} onChange={(vehicleCapacity) => set({ vehicleCapacity })} min={1} /></Field>
              )}
            </div>
            {t.type === 'rental-car' && (
              <GasEstimator
                gas={t.gas}
                onChange={(gas) => set({ gas })}
                currency={currency}
                roundTripKm={roundTripKm}
                vehicles={vehiclesNeeded(t, Math.max(1, trip.attendeeIds.length))}
                people={Math.max(1, trip.attendeeIds.length)}
              />
            )}
          </>
        );
      })()}

      {kind === 'hotels' && (() => {
        const h = draft as HotelOption;
        const nights = nightsOf(trip.dates);
        const unit = h.pricing === 'per-room' ? 'per room' : 'per person';
        return (
          <>
            <Field label="Name"><input className="input" autoFocus value={h.name} onChange={(e) => set({ name: e.target.value })} placeholder="Hotel / chalet / apartment" /></Field>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <div>
                <span className="label">Priced</span>
                <Segmented value={h.pricing} onChange={(pricing) => set({ pricing })} options={[{ value: 'per-room', label: 'Per room / unit' }, { value: 'per-person', label: 'Per person' }]} />
              </div>
              <div>
                <span className="label">For</span>
                <Segmented value={h.per} onChange={(per) => set({ per })} options={[{ value: 'night', label: 'One night' }, { value: 'stay', label: 'The whole stay' }]} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label={`${h.per === 'stay' ? 'Total for the stay' : 'Per night'} ${unit} (${currency})`}
                hint={nights && h.price ? (h.per === 'stay' ? `= ${money(h.price / nights, currency)} per night over ${nights} nights` : `= ${money(h.price * nights, currency)} for ${nights} nights`) : undefined}
              >
                <NumberInput value={h.price} onChange={(price) => set({ price })} min={0} />
              </Field>
              {h.pricing === 'per-room' && (
                <Field label="People per room / unit"><NumberInput value={h.roomCapacity} onChange={(roomCapacity) => set({ roomCapacity })} min={1} /></Field>
              )}
            </div>
            <HotelSummary hotel={h} people={Math.max(1, trip.attendeeIds.length)} nights={nights} />
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <div>
                <span className="label">Type</span>
                <Segmented value={h.type} onChange={(type) => set({ type })} options={STAY_TYPES} />
              </div>
              <div>
                <span className="label">Rating</span>
                <RatingInput value={h.rating} onChange={(rating) => set({ rating })} />
              </div>
            </div>
            <div className="space-y-3 rounded-2xl bg-slate-50/80 p-3">
              <Toggle checked={h.skiInOut} onChange={(skiInOut) => set({ skiInOut, liftMin: skiInOut ? 0 : h.liftMin, walkable: skiInOut || h.walkable })} label="Ski-in / ski-out" />
              {!h.skiInOut && (
                <>
                  <Toggle checked={h.walkable} onChange={(walkable) => set({ walkable })} label="Is walking distance from a lift?" />
                  <Field label={h.walkable ? 'Walk to the lift (minutes)' : 'Drive to the lift (minutes)'} hint={h.walkable ? undefined : 'Staying outside the resort: driving or ski-bus time to the nearest lift.'}>
                    <NumberInput value={h.liftMin} onChange={(liftMin) => set({ liftMin })} min={0} />
                  </Field>
                </>
              )}
            </div>
          </>
        );
      })()}

      {kind === 'skiPasses' && (() => {
        const p = draft as SkiPassOption;
        return (
          <>
            <Field label="Pass name"><input className="input" autoFocus value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Val Thorens only / 3 Vallées incl. glacier" /></Field>
            <div>
              <span className="label">Priced</span>
              <Segmented value={p.basis} onChange={(basis) => set({ basis })} options={[{ value: 'whole-stay', label: 'For the whole stay' }, { value: 'per-day', label: 'Per ski day' }]} />
            </div>
            <Field label={`Price per person ${p.basis === 'per-day' ? 'per day' : 'for the stay'} (${currency})`}>
              <NumberInput value={p.price} onChange={(price) => set({ price })} min={0} />
            </Field>
          </>
        );
      })()}

      {kind === 'shops' && (() => {
        const s = draft as RentalShop;
        const setPrice = (key: GearPriceKey, value: string) => {
          const prices = { ...s.prices };
          if (value === '') delete prices[key];
          else prices[key] = Number(value);
          set({ prices });
        };
        return (
          <>
            <Field label="Store name"><input className="input" autoFocus value={s.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Intersport Val Thorens" /></Field>
            <div>
              <span className="label">Rental prices are</span>
              <Segmented value={s.basis} onChange={(basis) => set({ basis })} options={[{ value: 'whole-stay', label: 'For the whole rental' }, { value: 'per-day', label: 'Per day' }]} />
            </div>
            <div className="rounded-2xl bg-slate-50/80 p-4">
              <span className="label">Item prices ({currency}{s.basis === 'per-day' ? ' / day' : ', whole rental'}) · leave empty if not offered</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {GEAR_PRICE_ROWS.map((row) => (
                  <label key={row.key} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-600">{row.label}</span>
                    <input
                      type="number"
                      min={0}
                      className="input w-24 py-1.5 text-right"
                      value={s.prices[row.key] ?? ''}
                      placeholder="–"
                      onChange={(e) => setPrice(row.key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
            <LessonEditor lessons={s.lessons} onChange={(lessons) => set({ lessons })} currency={currency} trip={trip} friends={friends} />
          </>
        );
      })()}

      {kind === 'expenses' && (() => {
        const e = draft as Expense;
        const going = friends.filter((f) => trip.attendeeIds.includes(f.id));
        const who = e.friendIds ?? going.map((f) => f.id);
        const toggleWho = (id: string) => {
          const next = who.includes(id) ? who.filter((x) => x !== id) : [...who, id];
          set({ friendIds: next.length === going.length ? null : next });
        };
        return (
          <>
            <Field label="What"><input className="input" autoFocus value={e.name} onChange={(ev) => set({ name: ev.target.value })} placeholder="e.g. Gas, Food, Car rental, Parking" /></Field>
            <div>
              <span className="label">Paid how</span>
              <Segmented value={e.split} onChange={(split) => set({ split })} options={[{ value: 'shared', label: 'Shared, split evenly' }, { value: 'individual', label: 'Each person pays' }]} />
            </div>
            <div>
              <span className="label">Amount</span>
              <AmountInput
                value={e.amount}
                onChange={(amount) => set({ amount })}
                unit={
                  <select className="input w-auto" value={e.per} onChange={(ev) => set({ per: ev.target.value as Expense['per'] })}>
                    <option value="trip">{currency} total</option>
                    <option value="day">{currency} per day</option>
                  </select>
                }
              />
              <p className="mt-1.5 text-xs text-slate-400">
                {e.split === 'shared' ? 'The total is split between the people below.' : 'Each person below pays this amount.'}
                {e.per === 'day' && ' Per day = every day of the vacation, arrival and departure included.'}
              </p>
            </div>
            <div>
              <span className="label">Who’s in ({who.length}/{going.length})</span>
              <div className="flex flex-wrap gap-1.5">
                {going.map((f) => (
                  <button key={f.id} type="button" onClick={() => toggleWho(f.id)}
                    className={cx('flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs font-semibold transition', who.includes(f.id) ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-400')}>
                    <Avatar name={f.name} color={f.color} size={20} /> {f.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        );
      })()}

      {'link' in draft && <Field label="Link"><input className="input" value={draft.link} onChange={(e) => set({ link: e.target.value } as Partial<FlightOption>)} placeholder="https://…" /></Field>}
      <Field label="Notes"><textarea className="input min-h-20" value={draft.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
    </Drawer>
  );
}

/** What a hotel works out to for this group: nightly room rate, rooms needed, totals. */
function HotelSummary({ hotel: h, people, nights }: { hotel: HotelOption; people: number; nights: number }) {
  const display = useStore((s) => s.settings.currency);
  const cv = useConverter();
  if (!h.price) return null;
  if (!nights) return <p className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">Set the vacation dates to see the totals.</p>;

  const perNight = h.per === 'stay' ? h.price / nights : h.price; // per room or per person
  const perRoom = h.pricing === 'per-room';
  const rooms = perRoom ? Math.ceil(people / Math.max(1, h.roomCapacity)) : 0;
  const total = perRoom ? rooms * perNight * nights : perNight * nights * people;
  // amounts in the hotel's own currency, with the display currency alongside when they differ
  const show = (n: number) => (h.currency === display ? money(n, h.currency) : `${money(n, h.currency)} · ${money(cv(n, h.currency), display)}`);

  const rows: [string, string][] = [
    [perRoom ? 'Per room per night' : 'Per person per night', show(perNight)],
    ...(perRoom ? [['Rooms needed', `${rooms} × ${h.roomCapacity}-person room${rooms > 1 ? 's' : ''} for ${people} riders`] as [string, string]] : []),
    [`Total payment, ${nights} nights`, show(total)],
    ['Total per person', show(total / people)],
  ];
  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
      <span className="label">For this group</span>
      <dl className="space-y-1.5 text-sm">
        {rows.map(([k, v], i) => (
          <div key={k} className={cx('flex justify-between gap-3', i === rows.length - 1 && 'border-t border-sky-100 pt-1.5 font-bold')}>
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-right font-semibold text-slate-800">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A fixed amount, or a min–max estimate. The range switch is its own state, so typing never flips it. */
function AmountInput({ value, onChange, unit }: { value: Range; onChange: (r: Range) => void; unit: React.ReactNode }) {
  const [ranged, setRanged] = useState(value.max !== value.min);
  return (
    <>
      <div className="mb-2">
        <Toggle checked={ranged} onChange={(on) => { setRanged(on); if (!on) onChange({ min: value.min, max: value.min }); }} label="Price range (estimate)" />
      </div>
      <div className="flex items-center gap-2">
        <NumberInput value={value.min} onChange={(min) => onChange({ min, max: ranged ? value.max : min })} min={0} placeholder={ranged ? 'From' : '0'} />
        {ranged && (
          <>
            <span className="text-slate-300">–</span>
            <NumberInput value={value.max} onChange={(max) => onChange({ ...value, max })} min={0} placeholder="To" />
          </>
        )}
        {unit}
      </div>
      {ranged && value.max > 0 && value.max < value.min && <p className="mt-1 text-xs text-amber-600">The “to” amount is lower than “from”; they’ll be swapped when you save.</p>}
    </>
  );
}

/** Rough pump prices per litre, as a starting point for the estimate. */
const FUEL_PRICE: Record<Currency, number> = { EUR: 1.85, USD: 2.0, ILS: 7.3 };

const defaultGas = (km: number, currency: Currency): GasEstimate => ({ km, litersPer100: 7, pricePerLiter: FUEL_PRICE[currency] });

/** Fuel estimate for a rental car: distance × consumption × price, per car, split over everyone. */
function GasEstimator({ gas, onChange, currency, roundTripKm, vehicles, people }: {
  gas: GasEstimate | undefined;
  onChange: (g: GasEstimate | undefined) => void;
  currency: Currency;
  roundTripKm: number;
  vehicles: number;
  people: number;
}) {
  if (!gas) {
    return (
      <Button size="sm" onClick={() => onChange(defaultGas(roundTripKm, currency))}>
        <Fuel size={14} /> Add gas estimate
      </Button>
    );
  }
  const set = (patch: Partial<GasEstimate>) => onChange({ ...gas, ...patch });
  const liters = (gas.km * gas.litersPer100) / 100;
  const perCar = liters * gas.pricePerLiter;
  const m = (n: number) => money(n, currency);

  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="label mb-0 flex items-center gap-1.5"><Fuel size={12} /> Gas estimate, per vehicle</span>
        <button type="button" className="text-xs font-semibold text-slate-400 hover:text-rose-500" onClick={() => onChange(undefined)}>Remove</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Driving (km)" hint={roundTripKm && gas.km !== roundTripKm ? `Airport round trip: ${roundTripKm} km` : 'Include drives to other resorts'}>
          <NumberInput value={gas.km} onChange={(km) => set({ km })} min={0} />
        </Field>
        <Field label="Litres / 100 km">
          <NumberInput value={gas.litersPer100} onChange={(litersPer100) => set({ litersPer100 })} min={0} step={0.1} />
        </Field>
        <Field label={`Fuel / litre (${currency})`}>
          <NumberInput value={gas.pricePerLiter} onChange={(pricePerLiter) => set({ pricePerLiter })} min={0} step={0.01} />
        </Field>
      </div>
      {perCar > 0 && (
        <p className="mt-3 text-sm text-slate-600">
          ≈ {Math.round(liters)} L = <b>{m(perCar)}</b> per car
          {' · '}{vehicles} car{vehicles > 1 ? 's' : ''} for {people} rider{people > 1 ? 's' : ''}
          {' → '}<b>{m((perCar * vehicles) / people)}</b> each
        </p>
      )}
    </div>
  );
}

/** 1–5 stars; clicking the current rating clears it. */
function RatingInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-0.5 text-2xl leading-none">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" title={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(value === n ? null : n)}
          className={cx('transition hover:scale-110', value && n <= value ? 'text-amber-400' : 'text-slate-200 hover:text-amber-200')}>
          ★
        </button>
      ))}
      {!value && <span className="ml-1.5 text-xs text-slate-400">not rated</span>}
    </div>
  );
}
