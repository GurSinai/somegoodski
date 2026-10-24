/**
 * Sharing a vacation as a file (no account needed): export it, send it over WhatsApp or email,
 * and the other planner imports it. Importing merges with what's already here, using the last
 * file exchanged for that vacation as the common base when there is one.
 */
import { downloadJson } from '../lib/io';
import { useStore } from '../store/useStore';
import { CURRENT_VERSION } from '../store/migrate';
import { makeFile, type SharedVacationFile } from './bundle';
import { applyLocal, canonical, localShared, upgrade } from './engine';
import { deepEqual, merge3, type Conflict } from './merge';
import { currentMe, useCollab } from './useCollab';

const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'vacation';

export function exportVacationFile(vacationId: string) {
  const local = localShared(vacationId);
  if (!local) return;
  downloadJson(`${slug(local.data.vacation.name)}.somegoodski.json`, makeFile(local.winter, local.data, currentMe().name));
  useCollab.getState().setFileBase(vacationId, local.data);
}

export async function readVacationFile(file: File): Promise<SharedVacationFile> {
  let f: SharedVacationFile;
  try {
    f = JSON.parse(await file.text());
  } catch {
    throw new Error('That file isn’t a SomeGoodSki vacation.');
  }
  if (f?.format !== 2 || !f.data?.vacation?.id) throw new Error('That file isn’t a SomeGoodSki vacation file.');
  if (f.appVersion > CURRENT_VERSION) throw new Error(`${f.updatedBy} is on a newer SomeGoodSki. Reload the page to update first.`);
  return f;
}

/** What importing this file will do: add a new vacation, merge with a common base, or ask. */
export function importKind(f: SharedVacationFile): 'new' | 'merge' | 'ask' {
  const id = f.data.vacation.id;
  if (!useStore.getState().vacations.some((v) => v.id === id)) return 'new';
  const c = useCollab.getState();
  return c.fileBases[id] || c.shared[id] ? 'merge' : 'ask';
}

/**
 * Imports a vacation file. `replace` takes theirs as is; otherwise both sides' changes are kept
 * (three-way with the last exchanged file, or keeping yours on conflicts when there's none).
 */
export function importVacationFile(f: SharedVacationFile, mode: 'merge' | 'replace' = 'merge'): { vacationId: string; winterId: string; conflicts: Conflict[] } {
  const remote = canonical(upgrade(f));
  const id = remote.vacation.id;
  const local = localShared(id);
  const c = useCollab.getState();
  const conflicts: Conflict[] = [];
  let next = remote;
  if (local && mode === 'merge') {
    const base = c.fileBases[id] ?? c.shared[id]?.base;
    next = canonical(merge3(base as typeof remote, local.data, remote, conflicts));
  }
  if (!local || !deepEqual(next, local.data)) applyLocal(f.winter, next);
  const final = localShared(id, next)!;
  c.setFileBase(id, final.data);
  c.addNotice(id, `Imported “${final.data.vacation.name}” from ${f.updatedBy}’s file.`);
  return { vacationId: id, winterId: useStore.getState().vacations.find((v) => v.id === id)!.winterId, conflicts };
}
