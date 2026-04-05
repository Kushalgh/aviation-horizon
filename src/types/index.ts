export type AircraftStatus = 'normal' | 'conflict' | 'selected' | 'landing';

export interface Aircraft {
  id: string;
  callsign: string;
  x: number;        // 0–1 normalized canvas coordinate
  y: number;        // 0–1 normalized canvas coordinate
  altitude: number; // Flight Level (e.g. 320 = FL320 = 32,000ft)
  heading: number;  // 0–359 degrees
  speed: number;    // knots (scaled for simulation)
  status: AircraftStatus;
}

export interface CommandResult {
  success: boolean;
  message: string;
}

export interface SessionStats {
  commandsIssued: number;
  conflictsDetected: number;
  aircraftLanded: number;
  sessionStart: number; // timestamp
}
