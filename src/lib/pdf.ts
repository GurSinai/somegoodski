import type { ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

const A4_WIDTH_PX = 794; // A4 at 96 dpi

/**
 * Renders React pages off-screen and saves them as one PDF (each element starts a new page;
 * a tall element continues onto further pages). Rendering through the browser keeps the
 * app's styling and any script (e.g. Hebrew names) intact.
 */
export async function downloadPdf(pages: ReactElement[], filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${A4_WIDTH_PX}px;background:#fff;`;
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    let first = true;

    for (const page of pages) {
      flushSync(() => root.render(page));
      await document.fonts.ready;
      const canvas = await html2canvas(host, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
      const slicePx = Math.floor((canvas.width * pageH) / pageW);
      // slightly too tall for one page: shrink it to fit rather than spilling a few lines over
      if (canvas.height <= slicePx * 1.25) {
        if (!first) pdf.addPage();
        first = false;
        const scale = Math.min(1, slicePx / canvas.height);
        const w = pageW * scale;
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', (pageW - w) / 2, 0, w, (canvas.height * w) / canvas.width);
        continue;
      }
      // a few px of rounding overflow shouldn't produce an empty extra page
      for (let y = 0; y < canvas.height - slicePx * 0.03; y += slicePx) {
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = Math.min(slicePx, canvas.height - y);
        slice.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
        if (!first) pdf.addPage();
        first = false;
        pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, (slice.height * pageW) / canvas.width);
      }
    }
    pdf.save(filename);
  } finally {
    root.unmount();
    host.remove();
  }
}

export const fileSafe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-');
