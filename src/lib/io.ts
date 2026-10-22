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
  const required = ['friends', 'season', 'airports', 'resorts', 'trips', 'settings'] as const;
  for (const k of required) if (!(k in data)) throw new Error(`Missing "${k}" in file`);
  return { ...data, version: 1 } as AppData;
}
