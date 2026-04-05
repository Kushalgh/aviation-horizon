import { useAircraftStore } from '../store/useAircraftStore';

export function StatusBar() {
  const aircraft = useAircraftStore((s) => s.aircraft);
  const selectedId = useAircraftStore((s) => s.selectedId);
  const sweepAngle = useAircraftStore((s) => s.sweepAngle);

  const selected = aircraft.find((a) => a.id === selectedId);
  const conflicts = aircraft.filter((a) => a.status === 'conflict').length;

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-logo">✈ AVIATION HORIZON</span>
        <span className="status-badge">ATS SIM v1.0</span>
      </div>

      <div className="status-center">
        {selected ? (
          <>
            <span className="sel-callsign">{selected.callsign}</span>
            <span className="sel-detail">HDG {selected.heading.toString().padStart(3,'0')}°</span>
            <span className="sel-detail">FL{selected.altitude}</span>
            <span className="sel-detail">{selected.speed}KT</span>
            <span className={`sel-status status-${selected.status}`}>{selected.status.toUpperCase()}</span>
          </>
        ) : (
          <span className="status-hint">Click an aircraft to select it</span>
        )}
      </div>

      <div className="status-right">
        {conflicts > 0 && (
          <span className="conflict-alert animate-pulse">⚠ {conflicts} CONFLICT{conflicts > 1 ? 'S' : ''}</span>
        )}
        <span className="sweep-deg">
          SWEEP {Math.round(sweepAngle).toString().padStart(3, '0')}°
        </span>
        <span className="active-count">{aircraft.length} ACTIVE</span>
      </div>
    </div>
  );
}
