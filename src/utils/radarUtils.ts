import type { Aircraft } from '../types';

const RAD = Math.PI / 180;
export const CONFLICT_THRESHOLD = 0.05; // normalized units
export const SPEED_SCALE = 0.000002;

/** Move an aircraft one tick along its heading */
export function updatePosition(aircraft: Aircraft): Aircraft {
  const vx = Math.sin(aircraft.heading * RAD) * aircraft.speed * SPEED_SCALE;
  const vy = -Math.cos(aircraft.heading * RAD) * aircraft.speed * SPEED_SCALE;

  let nx = aircraft.x + vx;
  let ny = aircraft.y + vy;

  // Boundary wrapping
  if (nx < 0) nx = 1 + nx;
  if (nx > 1) nx = nx - 1;
  if (ny < 0) ny = 1 + ny;
  if (ny > 1) ny = ny - 1;

  return { ...aircraft, x: nx, y: ny };
}

/** Euclidean distance between two aircraft in normalized coords */
export function distance(a: Aircraft, b: Aircraft): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Check all pairs for conflicts, returns set of conflicting IDs */
export function detectConflicts(aircraft: Aircraft[]): Set<string> {
  const conflicting = new Set<string>();
  for (let i = 0; i < aircraft.length; i++) {
    for (let j = i + 1; j < aircraft.length; j++) {
      if (distance(aircraft[i], aircraft[j]) < CONFLICT_THRESHOLD) {
        // Altitude separation check (FL < 1000ft = 10 units)
        const altSep = Math.abs(aircraft[i].altitude - aircraft[j].altitude);
        if (altSep < 10) {
          conflicting.add(aircraft[i].id);
          conflicting.add(aircraft[j].id);
        }
      }
    }
  }
  return conflicting;
}

/** Generate a random NATO-style callsign */
const NATO = ['ALPHA','BRAVO','CHARLIE','DELTA','ECHO','FOXTROT','GOLF','HOTEL','INDIA','JULIET','KILO','LIMA','MIKE'];
export function randomCallsign(): string {
  const a = NATO[Math.floor(Math.random() * NATO.length)];
  const b = Math.floor(Math.random() * 900 + 100);
  return `${a}-${b}`;
}

/** Seed 5 random aircraft */
export function seedAircraft(): Aircraft[] {
  return Array.from({ length: 5 }, () => ({
    id: crypto.randomUUID(),
    callsign: randomCallsign(),
    x: 0.1 + Math.random() * 0.8,
    y: 0.1 + Math.random() * 0.8,
    altitude: Math.floor(Math.random() * 30 + 60) * 10, // FL060–FL390
    heading: Math.floor(Math.random() * 360),
    speed: Math.floor(Math.random() * 200 + 250), // 250–450 knots
    status: 'normal',
  }));
}

/** Clamp a number between min and max */
export function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}
