import { useState } from 'react';
import { useAircraftStore } from '../store/useAircraftStore';
import { BrowserProvider, parseEther } from 'ethers';


export function ShiftReport() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'pending' | 'done' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const stats = useAircraftStore((s) => s.stats);
  const resetSession = useAircraftStore((s) => s.resetSession);

  const handleShiftReport = async () => {
    setStatus('connecting');
    try {
      const win = window as Window & { ethereum?: { request: (r: { method: string; params?: unknown[] }) => Promise<unknown> } };
      if (!win.ethereum) {
        alert('Please install MetaMask to submit a Shift Report on-chain.');
        setStatus('idle');
        return;
      }

      const provider = new BrowserProvider(win.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setStatus('pending');

      // Encode session data as tx calldata (simulated — sends 0 ETH to self)
      const sessionData = JSON.stringify({
        commands: stats.commandsIssued,
        conflicts: stats.conflictsDetected,
        landed: stats.aircraftLanded,
        duration: Math.floor((Date.now() - stats.sessionStart) / 1000),
      });

      const tx = await signer.sendTransaction({
        to: address,
        value: parseEther('0'),
        data: '0x' + Buffer.from(sessionData).toString('hex'),
      });
      setTxHash(tx.hash);
      setStatus('done');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const sessionDuration = Math.floor((Date.now() - stats.sessionStart) / 1000);
  const mins = Math.floor(sessionDuration / 60).toString().padStart(2, '0');
  const secs = (sessionDuration % 60).toString().padStart(2, '0');

  return (
    <div className="shift-report-panel">
      <div className="shift-stats">
        <div className="stat-item">
          <span className="stat-label">SESSION</span>
          <span className="stat-value">{mins}:{secs}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">COMMANDS</span>
          <span className="stat-value">{stats.commandsIssued}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">CONFLICTS</span>
          <span className="stat-value conflict">{stats.conflictsDetected}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">LANDED</span>
          <span className="stat-value landed">{stats.aircraftLanded}</span>
        </div>
      </div>

      <div className="shift-actions">
        <button
          className={`shift-btn ${status}`}
          onClick={handleShiftReport}
          disabled={status === 'connecting' || status === 'pending'}
        >
          {status === 'idle' && '⛓ SUBMIT SHIFT REPORT'}
          {status === 'connecting' && '🔌 CONNECTING...'}
          {status === 'pending' && '⏳ BROADCASTING TX...'}
          {status === 'done' && '✓ REPORT SAVED ON-CHAIN'}
          {status === 'error' && '✗ TX FAILED'}
        </button>
        <button className="reset-btn" onClick={resetSession}>↺ NEW SESSION</button>
      </div>

      {txHash && (
        <div className="tx-hash" title={txHash}>
          TX: {txHash.slice(0, 20)}...{txHash.slice(-6)}
        </div>
      )}
    </div>
  );
}
