import { useEffect, useRef, useCallback } from 'react';
import { useAircraftStore } from '../store/useAircraftStore';
import type { Aircraft } from '../types';
import { initAudio, playSelect, playSweepPing } from '../utils/audioUtils';
const SWEEP_SPEED = 0.8; // degrees per frame
const TRAIL_LENGTH = 6;

// We keep a trail buffer external to React re-renders
const trailMap = new Map<string, { x: number; y: number }[]>();

export function RadarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const sweepRef = useRef(0);

  const aircraft = useAircraftStore((s) => s.aircraft);
  const tick = useAircraftStore((s) => s.tick);
  const setSweepAngle = useAircraftStore((s) => s.setSweepAngle);
  const selectAircraft = useAircraftStore((s) => s.selectAircraft);
  const selectedId = useAircraftStore((s) => s.selectedId);

  const aircraftRef = useRef(aircraft);
  aircraftRef.current = aircraft;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(cx, cy) - 10;

    // ---- Background ----
    ctx.fillStyle = '#001200';
    ctx.fillRect(0, 0, W, H);

    // ---- Circular clip ----
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // ---- Grid rings ----
    const ringCount = 5;
    for (let r = 1; r <= ringCount; r++) {
      const rr = (radius / ringCount) * r;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,255,70,0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // ---- Crosshairs ----
    ctx.strokeStyle = 'rgba(0,255,70,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy); ctx.stroke();

    // ---- Sweep gradient ----
    const sweepDeg = sweepRef.current;
    const sweepRad = (sweepDeg - 90) * (Math.PI / 180);

    // Sweep using arc fill
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sweepRad);
    const sweepGrad = ctx.createLinearGradient(0, 0, radius, 0);
    sweepGrad.addColorStop(0, 'rgba(0,255,70,0.55)');
    sweepGrad.addColorStop(1, 'rgba(0,255,70,0)');
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -Math.PI / 12, 0);
    ctx.closePath();
    ctx.fillStyle = sweepGrad;
    ctx.fill();
    ctx.restore();

    // ---- Aircraft blips ----
    const acs = aircraftRef.current;
    acs.forEach((ac) => {
      const px = ac.x * W;
      const py = ac.y * H;

      // Trail
      const trail = trailMap.get(ac.id) || [];
      trail.push({ x: px, y: py });
      if (trail.length > TRAIL_LENGTH) trail.shift();
      trailMap.set(ac.id, trail);

      trail.forEach((pt, i) => {
        const alpha = (i / trail.length) * 0.4;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,70,${alpha})`;
        ctx.fill();
      });

      // Color by status
      const colors: Record<string, string> = {
        normal: '#00ff46',
        selected: '#00cfff',
        conflict: '#ff3333',
        landing: '#ffcc00',
      };
      const color = colors[ac.status] || '#00ff46';

      // Triangle blip (pointing in heading direction)
      const headRad = (ac.heading - 90) * (Math.PI / 180);
      const size = 7;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(headRad);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.6, size * 0.7);
      ctx.lineTo(-size * 0.6, size * 0.7);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = ac.status === 'conflict' ? 12 : 6;
      ctx.fill();
      ctx.restore();

      // Data tag
      ctx.font = '10px "JetBrains Mono", "Roboto Mono", monospace';
      ctx.fillStyle = color;
      ctx.shadowBlur = 0;
      ctx.fillText(ac.callsign, px + 10, py - 4);
      ctx.fillStyle = 'rgba(0,255,70,0.7)';
      ctx.fillText(`FL${ac.altitude}`, px + 10, py + 8);
      ctx.fillText(`${Math.round(ac.heading).toString().padStart(3,'0')}°`, px + 10, py + 18);
    });

    ctx.restore(); // end clip

    // ---- Outer ring border ----
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,255,70,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, []);

  const loop = useCallback(() => {
    const prevSweep = sweepRef.current;
    sweepRef.current = (sweepRef.current + SWEEP_SPEED) % 360;
    if (prevSweep > sweepRef.current) {
      playSweepPing();
    }
    setSweepAngle(sweepRef.current);
    tick();
    draw();
    animRef.current = requestAnimationFrame(loop);
  }, [draw, tick, setSweepAngle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const size = Math.min(canvas.parentElement?.clientWidth ?? 600, canvas.parentElement?.clientHeight ?? 600);
      canvas.width = size;
      canvas.height = size;
    };
    resize();
    window.addEventListener('resize', resize);
    animRef.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [loop]);

  // Click-to-select aircraft
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    initAudio();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    const acs = aircraftRef.current;
    const hit = acs.find((ac) => {
      const px = ac.x * canvas.width;
      const py = ac.y * canvas.height;
      return Math.sqrt((px - mx) ** 2 + (py - my) ** 2) < 16;
    });
    if (hit) playSelect();
    selectAircraft(hit ? hit.id : null);
  }, [selectAircraft]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ cursor: 'crosshair', display: 'block', borderRadius: '50%' }}
    />
  );
}
