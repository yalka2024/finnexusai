// Autonomous CeDeFi Agents Frontend UI (React)
import React, { useState } from 'react';

type AgentStatus = {
  portfolio: { active?: boolean };
  trade: object;
  compliance: object;
  yield: object;
};

export default function AgentUI() {
  const [status, setStatus] = useState<AgentStatus>({ portfolio: {}, trade: {}, compliance: {}, yield: {} });
  const [executed, setExecuted] = useState(false);

  // Fetch agent status from backend
  React.useEffect(() => {
    fetch('/api/agent-status')
      .then(res => res.json())
      .then(data => setStatus(data));
  }, []);

  // Execute strategy via backend
  const executeStrategy = async () => {
    const res = await fetch('/api/execute-strategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'portfolio' }),
    });
    const data = await res.json();
    setExecuted(data.executed);
    setStatus(s => ({ ...s, portfolio: { active: true } }));
  };

  return (
    <div>
      <h2>Autonomous CeDeFi Agents</h2>
      <button onClick={executeStrategy} disabled={executed}>Activate Portfolio Agent</button>
      <p>Portfolio Agent Active: {status.portfolio.active ? 'Yes' : 'No'}</p>
      {/* TODO: Render agent controls and RL feedback here */}
    </div>
  );
}
