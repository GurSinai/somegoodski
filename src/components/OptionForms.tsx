import { useEffect, useState } from 'react';
import { BOARDS, GEAR_PRICE_ROWS, TRANSFER_TYPES } from '../lib/labels';
import { cx, uid } from '../lib/util';
import { useStore, type OptionKind } from '../store/useStore';
import type {
  Expense, FlightOption, GearPriceKey, HotelOption, Leg, PricedTrip, RentalShop, SkiPassOption, TransferOption, WinterFriend,
} from '../types';
import { Avatar, Button, Drawer, Field, NumberInput, Segmented, Toggle } from './ui';

export type { OptionKind };

export const blankFlight = (airport: string, direction: Leg): FlightOption => ({
  id: uid(), direction, airport, airline: '', homeCity: '', when: '', pricePerPerson: 0, trolleyPrice: 0, checkedPrice: 0, link: '', notes: '',
});
export const blankTransfer = (airport: string): TransferOption => ({
  id: uid(), airport, type: 'shuttle', provider: '', pricing: 'per-person', price: 0, vehicleCapacity: 8, link: '', notes: '',
});
export const blankHotel = (): HotelOption => ({
  id: uid(), name: '', pricePerNight: 0, pricing: 'per-room', roomCapacity: 2, board: 'BB', skiInOut: false, walkToLiftMin: 0, link: '', notes: '',
});
export const blankPass = (): SkiPassOption => ({ id: uid(), name: '', basis: 'whole-stay', price: 0, notes: '' });
export const blankShop = (): RentalShop => ({
  id: uid(), name: '', basis: 'whole-stay', prices: {}, groupLessonPerDay: 0, privateLessonPerDay: 0, link: '', notes: '',
});
export const blankExpense = (): Expense => ({
  id: uid(), name: '', split: 'shared', amount: { min: 0, max: 0 }, per: 'trip', friendIds: null, notes: '',
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
  flights: 'flight', transfers: 'transfer', hotels: 'hotel', skiPasses: 'ski pass', shops: 'rental shop', expenses: 'expense',
};

export default function OptionDrawer({ trip, kind, option, isNew, friends, onClose }: Props) {
  const saveOption = useStore((s) => s.saveOption);
  const removeOption = useStore((s) => s.removeOption);
  const currency = useStore((s) => s.settings.currency);
  const resort = useStore((s) => s.resorts.find((r) => r.id === trip.resortId));
  const airports = useStore((s) => s.airports);
  const [draft, setDraft] = useState<AnyOption>(option);

  useEffect(() => setDraft(option), [option]);

  const set = (patch: Partial<AnyOption>) => setDraft((d) => ({ ...d, ...patch }) as AnyOption);
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
          <Button variant="primary" disabled={!valid} onClick={() => { saveOption(trip.id, kind, draft as never); onClose(); }}>
            Save
          </Button>
        </>
      }
    >
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
        return (
          <>
            {airportPicker(t.airport)}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className="input" value={t.type} onChange={(e) => set({ type: e.target.value as TransferOption['type'] })}>
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
              {t.pricing === 'per-vehicle' && (
                <Field label="Seats per vehicle"><NumberInput value={t.vehicleCapacity} onChange={(vehicleCapacity) => set({ vehicleCapacity })} min={1} /></Field>
              )}
            </div>
          </>
        );
      })()}

      {kind === 'hotels' && (() => {
        const h = draft as HotelOption;
        return (
          <>
            <Field label="Name"><input className="input" autoFocus value={h.name} onChange={(e) => set({ name: e.target.value })} placeholder="Hotel / chalet / apartment" /></Field>
            <div>
              <span className="label">Pricing</span>
              <Segmented value={h.pricing} onChange={(pricing) => set({ pricing })} options={[{ value: 'per-room', label: 'Per room / unit' }, { value: 'per-person', label: 'Per person' }]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Per night ${h.pricing === 'per-room' ? 'per room' : 'per person'} (${currency})`}>
                <NumberInput value={h.pricePerNight} onChange={(pricePerNight) => set({ pricePerNight })} min={0} />
              </Field>
              {h.pricing === 'per-room' && (
                <Field label="People per room / unit"><NumberInput value={h.roomCapacity} onChange={(roomCapacity) => set({ roomCapacity })} min={1} /></Field>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Board">
                <select className="input" value={h.board} onChange={(e) => set({ board: e.target.value as HotelOption['board'] })}>
                  {BOARDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </Field>
              <Field label="Walk to the lift (minutes)">
                <NumberInput value={h.walkToLiftMin} onChange={(walkToLiftMin) => set({ walkToLiftMin })} min={0} disabled={h.skiInOut} />
              </Field>
            </div>
            <Toggle checked={h.skiInOut} onChange={(skiInOut) => set({ skiInOut, walkToLiftMin: skiInOut ? 0 : h.walkToLiftMin })} label="Ski-in / ski-out" />
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
            <Field label="Shop name"><input className="input" autoFocus value={s.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Intersport Val Thorens" /></Field>
            <div>
              <span className="label">Prices are</span>
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
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Group lesson / day (${currency})`} hint="0 = not offered"><NumberInput value={s.groupLessonPerDay} onChange={(groupLessonPerDay) => set({ groupLessonPerDay })} min={0} /></Field>
              <Field label={`Private lesson / day (${currency})`} hint="0 = not offered"><NumberInput value={s.privateLessonPerDay} onChange={(privateLessonPerDay) => set({ privateLessonPerDay })} min={0} /></Field>
            </div>
          </>
        );
      })()}

      {kind === 'expenses' && (() => {
        const e = draft as Expense;
        const ranged = e.amount.max !== e.amount.min;
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
              <div className="mb-2"><Toggle checked={ranged} onChange={(v) => set({ amount: v ? { min: e.amount.min, max: e.amount.min * 1.5 || 0 } : { min: e.amount.min, max: e.amount.min } })} label="Price range (estimate)" /></div>
              <div className="flex items-center gap-2">
                <NumberInput value={e.amount.min} onChange={(min) => set({ amount: { min, max: ranged ? Math.max(min, e.amount.max) : min } })} min={0} />
                {ranged && <><span className="text-slate-300">–</span><NumberInput value={e.amount.max} onChange={(max) => set({ amount: { ...e.amount, max } })} min={e.amount.min} /></>}
                <select className="input w-auto" value={e.per} onChange={(ev) => set({ per: ev.target.value as Expense['per'] })}>
                  <option value="trip">{currency} total</option>
                  <option value="day">{currency} per day</option>
                </select>
              </div>
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
