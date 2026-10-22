import { useEffect, useState } from 'react';
import { BOARDS, TRANSFER_TYPES } from '../lib/labels';
import { uid } from '../lib/util';
import { useStore } from '../store/useStore';
import type { FlightOption, HotelOption, TransferOption, Trip } from '../types';
import { Button, Drawer, Field, NumberInput, Segmented, Toggle } from './ui';

export type OptionKind = 'flights' | 'transfers' | 'hotels';

export const blankFlight = (airport: string): FlightOption => ({
  id: uid(), airport, airline: '', fromCity: '', pricePerPerson: 0, outbound: '', inbound: '', link: '', notes: '',
});
export const blankTransfer = (airport: string): TransferOption => ({
  id: uid(), airport, type: 'shuttle', provider: '', pricing: 'per-person', price: 0, vehicleCapacity: 8, link: '', notes: '',
});
export const blankHotel = (): HotelOption => ({
  id: uid(), name: '', pricePerNight: 0, pricing: 'per-room', roomCapacity: 2, board: 'BB', skiInOut: false, distanceToLiftM: 0, link: '', notes: '',
});

type AnyOption = FlightOption | TransferOption | HotelOption;

interface Props {
  trip: Trip;
  kind: OptionKind;
  option: AnyOption | null; // null = closed
  isNew: boolean;
  onClose: () => void;
}

const TITLES: Record<OptionKind, string> = { flights: 'flight', transfers: 'transfer', hotels: 'hotel' };

export default function OptionDrawer({ trip, kind, option, isNew, onClose }: Props) {
  const saveOption = useStore((s) => s.saveOption);
  const removeOption = useStore((s) => s.removeOption);
  const currency = useStore((s) => s.settings.currency);
  const resort = useStore((s) => s.resorts.find((r) => r.id === trip.resortId));
  const airports = useStore((s) => s.airports);
  const [draft, setDraft] = useState<AnyOption | null>(option);

  useEffect(() => setDraft(option), [option]);
  if (!draft) return null;

  const set = (patch: Partial<AnyOption>) => setDraft((d) => (d ? ({ ...d, ...patch } as AnyOption) : d));
  const airportOptions = resort?.airports ?? [];

  const save = () => {
    saveOption(trip.id, kind, draft as never);
    onClose();
  };

  const airportPicker = (value: string) => (
    <Field label="Airport">
      <div className="flex flex-wrap gap-1.5">
        {airportOptions.map((a) => (
          <button
            key={a.iata}
            type="button"
            onClick={() => set({ airport: a.iata } as Partial<FlightOption>)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${value === a.iata ? 'border-sky-500 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
          >
            {a.iata}
            <span className="ml-1 text-xs font-normal text-slate-400">{airports.find((x) => x.iata === a.iata)?.city}</span>
          </button>
        ))}
        {airportOptions.length === 0 && <span className="text-sm text-slate-500">Add airports on the resort page first.</span>}
      </div>
    </Field>
  );

  return (
    <Drawer
      open
      onClose={onClose}
      title={`${isNew ? 'Add' : 'Edit'} ${TITLES[kind]}`}
      footer={
        <>
          {!isNew && (
            <Button variant="danger" className="mr-auto" onClick={() => { removeOption(trip.id, kind, draft.id); onClose(); }}>
              Delete
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={kind !== 'hotels' && !(draft as FlightOption).airport}>
            Save
          </Button>
        </>
      }
    >
      {kind === 'flights' && (() => {
        const f = draft as FlightOption;
        return (
          <>
            {airportPicker(f.airport)}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Airline"><input className="input" autoFocus value={f.airline} onChange={(e) => set({ airline: e.target.value })} placeholder="e.g. EasyJet" /></Field>
              <Field label="Flying from"><input className="input" value={f.fromCity} onChange={(e) => set({ fromCity: e.target.value })} placeholder="e.g. TLV" /></Field>
            </div>
            <Field label={`Round-trip price per person (${currency})`} hint="Include baggage and ski or board carriage if needed.">
              <NumberInput value={f.pricePerPerson} onChange={(pricePerPerson) => set({ pricePerPerson })} min={0} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Outbound"><input className="input" value={f.outbound} onChange={(e) => set({ outbound: e.target.value })} placeholder="Sat 06:10 → 09:45" /></Field>
              <Field label="Return"><input className="input" value={f.inbound} onChange={(e) => set({ inbound: e.target.value })} placeholder="Sat 18:20 → 23:30" /></Field>
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
              <Segmented
                value={t.pricing}
                onChange={(pricing) => set({ pricing })}
                options={[{ value: 'per-person', label: 'Per person' }, { value: 'per-vehicle', label: 'Per vehicle / group' }]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Round-trip price ${t.pricing === 'per-person' ? 'per person' : 'per vehicle'} (${currency})`}>
                <NumberInput value={t.price} onChange={(price) => set({ price })} min={0} />
              </Field>
              {t.pricing === 'per-vehicle' && (
                <Field label="Seats per vehicle">
                  <NumberInput value={t.vehicleCapacity} onChange={(vehicleCapacity) => set({ vehicleCapacity })} min={1} />
                </Field>
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
              <Segmented
                value={h.pricing}
                onChange={(pricing) => set({ pricing })}
                options={[{ value: 'per-room', label: 'Per room / unit' }, { value: 'per-person', label: 'Per person' }]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Price per night ${h.pricing === 'per-room' ? 'per room' : 'per person'} (${currency})`}>
                <NumberInput value={h.pricePerNight} onChange={(pricePerNight) => set({ pricePerNight })} min={0} />
              </Field>
              {h.pricing === 'per-room' && (
                <Field label="People per room / unit">
                  <NumberInput value={h.roomCapacity} onChange={(roomCapacity) => set({ roomCapacity })} min={1} />
                </Field>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Board">
                <select className="input" value={h.board} onChange={(e) => set({ board: e.target.value as HotelOption['board'] })}>
                  {BOARDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </Field>
              <Field label="Distance to lift (m)">
                <NumberInput value={h.distanceToLiftM} onChange={(distanceToLiftM) => set({ distanceToLiftM })} min={0} />
              </Field>
            </div>
            <Toggle checked={h.skiInOut} onChange={(skiInOut) => set({ skiInOut })} label="Ski-in / ski-out" />
          </>
        );
      })()}

      <Field label="Link"><input className="input" value={draft.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://…" /></Field>
      <Field label="Notes"><textarea className="input min-h-20" value={draft.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
    </Drawer>
  );
}
