import { create } from 'zustand';
import type { Aircraft, SessionStats, CommandResult } from '../types';
import { seedAircraft, updatePosition, detectConflicts, clamp } from '../utils/radarUtils';

interface AircraftStore {
  aircraft: Aircraft[];
  selectedId: string | null;
  stats: SessionStats;
  sweepAngle: number;
  commandHistory: string[];

  // Actions
  tick: () => void;
  selectAircraft: (id: string | null) => void;
  parseCommand: (input: string) => CommandResult;
  setSweepAngle: (angle: number) => void;
  addCommandHistory: (cmd: string) => void;
  resetSession: () => void;
}

function freshStats(): SessionStats {
  return {
    commandsIssued: 0,
    conflictsDetected: 0,
    aircraftLanded: 0,
    sessionStart: Date.now(),
  };
}

export const useAircraftStore = create<AircraftStore>((set, get) => ({
  aircraft: seedAircraft(),
  selectedId: null,
  stats: freshStats(),
  sweepAngle: 0,
  commandHistory: [],

  tick: () => {
    set((state) => {
      let updated = state.aircraft.map(updatePosition);
      const conflictSet = detectConflicts(updated);

      const newConflictCount = conflictSet.size > 0 ? 1 : 0;

      updated = updated.map((ac) => {
        if (ac.status === 'selected') return ac; // preserve selection color
        if (conflictSet.has(ac.id)) return { ...ac, status: 'conflict' as const };
        return { ...ac, status: 'normal' as const };
      });

      return {
        aircraft: updated,
        stats: {
          ...state.stats,
          conflictsDetected: state.stats.conflictsDetected + newConflictCount,
        },
      };
    });
  },

  setSweepAngle: (angle) => set({ sweepAngle: angle }),

  selectAircraft: (id) => {
    set((state) => ({
      selectedId: id,
      aircraft: state.aircraft.map((ac) => {
        if (id === null) return ac.status === 'selected' ? { ...ac, status: 'normal' as const } : ac;
        if (ac.id === id) return { ...ac, status: 'selected' as const };
        if (ac.status === 'selected') return { ...ac, status: 'normal' as const };
        return ac;
      }),
    }));
  },

  addCommandHistory: (cmd) => {
    set((state) => ({
      commandHistory: [...state.commandHistory.slice(-49), cmd],
    }));
  },

  parseCommand: (input: string): CommandResult => {
    const raw = input.trim().toUpperCase();
    const parts = raw.split(/\s+/);
    // Formats: [CALLSIGN_WORD] [CALLSIGN_WORD2?] [ACTION] [VALUE]
    // e.g. "ALPHA-123 TURN 090" or "BRAVO 234 CLIMB 350"
    const { aircraft } = get();

    // Try to match callsign across token variants
    let matchedAc: Aircraft | undefined;
    let actionIndex = -1;

    const ACTIONS = ['TURN', 'CLIMB', 'DESCEND', 'SPEED', 'LAND'];

    for (let i = 1; i < parts.length; i++) {
      if (ACTIONS.includes(parts[i])) {
        const callsignPart = parts.slice(0, i).join(' ');
        matchedAc = aircraft.find(
          (ac) => ac.callsign.replace('-', ' ') === callsignPart ||
                  ac.callsign === parts.slice(0, i).join('-') ||
                  ac.callsign === callsignPart
        );
        actionIndex = i;
        break;
      }
    }

    if (!matchedAc || actionIndex === -1) {
      return { success: false, message: `Unknown callsign or command. Format: [CALLSIGN] [TURN|CLIMB|DESCEND|SPEED|LAND] [VALUE]` };
    }

    const action = parts[actionIndex];
    const valueStr = parts[actionIndex + 1];
    const value = parseInt(valueStr, 10);

    if (isNaN(value)) {
      return { success: false, message: `Invalid value "${valueStr}" for ${action}` };
    }

    const id = matchedAc.id;

    switch (action) {
      case 'TURN': {
        const heading = ((value % 360) + 360) % 360;
        set((state) => ({
          aircraft: state.aircraft.map((ac) => ac.id === id ? { ...ac, heading } : ac),
          stats: { ...state.stats, commandsIssued: state.stats.commandsIssued + 1 },
        }));
        return { success: true, message: `${matchedAc.callsign}: TURN heading ${heading}°` };
      }
      case 'CLIMB':
      case 'DESCEND': {
        const altitude = clamp(value, 10, 450);
        set((state) => ({
          aircraft: state.aircraft.map((ac) => ac.id === id ? { ...ac, altitude } : ac),
          stats: { ...state.stats, commandsIssued: state.stats.commandsIssued + 1 },
        }));
        return { success: true, message: `${matchedAc.callsign}: ${action} to FL${altitude}` };
      }
      case 'SPEED': {
        const speed = clamp(value, 100, 600);
        set((state) => ({
          aircraft: state.aircraft.map((ac) => ac.id === id ? { ...ac, speed } : ac),
          stats: { ...state.stats, commandsIssued: state.stats.commandsIssued + 1 },
        }));
        return { success: true, message: `${matchedAc.callsign}: SPEED set to ${speed}KT` };
      }
      case 'LAND': {
        set((state) => ({
          aircraft: state.aircraft.map((ac) => ac.id === id ? { ...ac, status: 'landing' } : ac),
          stats: {
            ...state.stats,
            commandsIssued: state.stats.commandsIssued + 1,
            aircraftLanded: state.stats.aircraftLanded + 1,
          },
        }));
        return { success: true, message: `${matchedAc.callsign}: CLEARED TO LAND` };
      }
      default:
        return { success: false, message: `Unknown action: ${action}` };
    }
  },

  resetSession: () => {
    set({ aircraft: seedAircraft(), stats: freshStats(), commandHistory: [], selectedId: null });
  },
}));
