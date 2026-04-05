import { RadarCanvas } from './components/RadarCanvas';
import { CommandCLI } from './components/CommandCLI';
import { ShiftReport } from './components/ShiftReport';
import { StatusBar } from './components/StatusBar';
import './App.css';

export default function App() {
  return (
    <div className="app-root">
      <StatusBar />

      <main className="main-layout">
        {/* Radar takes center stage */}
        <section className="radar-section">
          <div className="radar-container">
            <RadarCanvas />
          </div>
        </section>

        {/* Right sidebar: info + blockchain */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title">SECTOR CONTROL</div>
            <div className="sidebar-subtitle">ANTIGRAVITY ATS</div>
          </div>

          <div className="legend">
            <div className="legend-row"><span className="dot normal" />NORMAL</div>
            <div className="legend-row"><span className="dot selected" />SELECTED</div>
            <div className="legend-row"><span className="dot conflict" />CONFLICT</div>
            <div className="legend-row"><span className="dot landing" />LANDING</div>
          </div>

          <div className="nato-ref">
            <div className="nato-title">NATO PHONETIC</div>
            {['ALPHA','BRAVO','CHARLIE','DELTA','ECHO','FOXTROT','GOLF','HOTEL','INDIA','JULIET','KILO','LIMA','MIKE','NOVEMBER','OSCAR','PAPA','QUEBEC','ROMEO','SIERRA','TANGO','UNIFORM','VICTOR','WHISKEY','XRAY','YANKEE','ZULU'].map((w, i) => (
              <div key={w} className="nato-row">
                <span className="nato-letter">{String.fromCharCode(65 + i)}</span>
                <span className="nato-word">{w}</span>
              </div>
            ))}
          </div>

          <ShiftReport />
        </aside>
      </main>

      <CommandCLI />
    </div>
  );
}
