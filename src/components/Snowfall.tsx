import { useEffect, useRef } from 'react';

/** Gentle canvas snowfall. Respects prefers-reduced-motion. */
export default function Snowfall({ count = 120, className }: { count?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d')!;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const flakes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.8 + Math.random() * 2.6,
      vy: 0.3 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    const tick = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.vy * (0.6 + f.r / 3);
        f.x += Math.sin(t / 1800 + f.phase) * 0.35;
        if (f.y > h + 5) { f.y = -5; f.x = Math.random() * w; }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.7 + f.r / 10})`;
        ctx.shadowColor = 'rgba(56,104,160,0.45)';
        ctx.shadowBlur = 4;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [count]);

  return <canvas ref={ref} className={className} aria-hidden />;
}
