import { useState, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useAircraftStore } from '../store/useAircraftStore';
import { initAudio, playSuccess, playFailure } from '../utils/audioUtils';
export function CommandCLI() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState<{ text: string; ok: boolean } | null>(null);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseCommand = useAircraftStore((s) => s.parseCommand);
  const addCommandHistory = useAircraftStore((s) => s.addCommandHistory);
  const commandHistory = useAircraftStore((s) => s.commandHistory);
  const aircraft = useAircraftStore((s) => s.aircraft);

  const submit = () => {
    initAudio();
    const trimmed = input.trim();
    if (!trimmed) return;
    const result = parseCommand(trimmed);
    addCommandHistory(trimmed);
    setResponse({ text: result.message, ok: result.success });
    if (result.success) {
      playSuccess();
    } else {
      playFailure();
    }
    setInput('');
    setHistoryIdx(-1);
    setTimeout(() => setResponse(null), 4000);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(historyIdx + 1, commandHistory.length - 1);
      setHistoryIdx(newIdx);
      setInput(commandHistory[commandHistory.length - 1 - newIdx] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(newIdx);
      setInput(newIdx === -1 ? '' : commandHistory[commandHistory.length - 1 - newIdx] ?? '');
    }
  };

  return (
    <div className="cli-panel">
      {/* Active aircraft list */}
      <div className="aircraft-list">
        {aircraft.map((ac) => (
          <span
            key={ac.id}
            className={`aircraft-chip status-${ac.status}`}
            title={`Heading: ${ac.heading}° | Speed: ${ac.speed}kt`}
          >
            {ac.callsign} FL{ac.altitude}
          </span>
        ))}
      </div>

      {/* Command response */}
      {response && (
        <div className={`cmd-response ${response.ok ? 'ok' : 'err'}`}>
          {response.ok ? '✓' : '✗'} {response.text}
        </div>
      )}

      {/* Input row */}
      <div className="cmd-input-row">
        <span className="cmd-prompt">ATC &gt;</span>
        <input
          ref={inputRef}
          className="cmd-input"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={handleKey}
          placeholder="E.G.  ALPHA-123 TURN 090  |  BRAVO-456 CLIMB 350"
          spellCheck={false}
          autoComplete="off"
        />
        <button className="cmd-send-btn" onClick={submit}>SEND</button>
      </div>

      {/* Help */}
      <div className="cmd-help">
        COMMANDS: [CALLSIGN] TURN [HDG] &nbsp;|&nbsp; CLIMB/DESCEND [FL] &nbsp;|&nbsp; SPEED [KT] &nbsp;|&nbsp; LAND &nbsp; • Arrow keys for history
      </div>
    </div>
  );
}
