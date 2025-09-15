// Decentralized AI Oracles Frontend UI (React)
import React, { useState } from 'react';

type OracleStats = {
  staking: number;
  rewards: number;
  chains: number;
};

export default function OracleUI() {
  const [stats, setStats] = useState<OracleStats>({ staking: 0, rewards: 0, chains: 0 });
  const [validation, setValidation] = useState<string>('');

  // Fetch oracle stats from backend
  React.useEffect(() => {
    fetch('/api/oracle-stats')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  // Validate transaction via backend
  const validateTx = async () => {
    const res = await fetch('/api/validate-tx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx: 'sample-tx' }),
    });
    const data = await res.json();
    setValidation(data.details);
  };

  return (
    <div>
      <h2>Decentralized AI Oracles</h2>
      <p>Staking: {stats.staking}</p>
      <p>Rewards: {stats.rewards}</p>
      <p>Supported Chains: {stats.chains}</p>
      <button onClick={validateTx}>Validate Transaction</button>
      {validation && <p>Validation: {validation}</p>}
    </div>
  );
}
