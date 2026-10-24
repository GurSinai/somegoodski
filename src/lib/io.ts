import { CURRENT_VERSION, migrate } from '../store/migrate';
import type { AppData } from '../types';

/** Saves a value as a pretty-printed JSON file download. */
export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportData(data: AppData) {
  downloadJson(`ski-planner-${new Date().toISOString().slice(0, 10)}.json`, data);
}

export async function readImportFile(file: File): Promise<AppData> {
  const data = JSON.parse(await file.text());
  // backups from older versions are upgraded on import
  if ((data.version ?? 1) < CURRENT_VERSION) return migrate(data, data.version ?? 1);
  const required = ['friends', 'winters', 'vacations', 'airports', 'resorts', 'trips', 'settings'] as const;
  for (const k of required) if (!(k in data)) throw new Error(`Missing "${k}" in file`);
  return data as AppData;
}
