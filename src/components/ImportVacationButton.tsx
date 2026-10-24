import { FileUp } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { importKind, importVacationFile, readVacationFile } from '../collab/fileShare';
import { Button } from './ui';

/** Imports a vacation file a partner sent (merging into your copy if you already have it). */
export default function ImportVacationButton({ size = 'sm', variant = 'secondary' }: { size?: 'sm' | 'md'; variant?: 'secondary' | 'ghost' }) {
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const f = await readVacationFile(file);
      let mode: 'merge' | 'replace' = 'merge';
      if (importKind(f) === 'ask') {
        if (!confirm(`You already have “${f.data.vacation.name}”.\n\nOK: merge ${f.updatedBy}’s changes in (where you both changed the same thing, yours is kept).\nCancel: more options.`)) {
          if (!confirm(`Replace your copy of “${f.data.vacation.name}” with ${f.updatedBy}’s?`)) return;
          mode = 'replace';
        }
      }
      const { vacationId, winterId, conflicts } = importVacationFile(f, mode);
      if (conflicts.length) alert(`Imported. ${conflicts.length} thing${conflicts.length > 1 ? 's were' : ' was'} changed on both sides; your version was kept.`);
      navigate(`/w/${winterId}/v/${vacationId}`);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <Button size={size} variant={variant} onClick={() => input.current?.click()} title="Import a vacation file a partner sent you">
        <FileUp size={15} /> Import vacation file
      </Button>
      <input ref={input} type="file" accept=".json,application/json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
    </>
  );
}
