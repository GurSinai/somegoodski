import { migrateV1 } from '../store/migrate';
import type { AppData } from '../types';

export function exportData(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ski-planner-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readImportFile(file: File): Promise<AppData> {
  const data = JSON.parse(await file.text());
  // backups made before winters existed are upgraded on import
  if (!data.version || data.version < 2) return migrateV1(data);
  const required = ['friends', 'winters', 'vacations', 'airports', 'resorts', 'trips', 'settings'] as const;
  for (const k of required) if (!(k in data)) throw new Error(`Missing "${k}" in file`);
  return data as AppData;
}
