// Gamified Learning System Frontend UI (React)
import React, { useState } from 'react';

type LeaderboardEntry = { name: string; tokens: number };

export default function GamifiedUI() {
  const [tokens, setTokens] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Fetch leaderboard from backend
  React.useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => setLeaderboard(data.leaderboard));
  }, []);

  // Complete challenge via backend
  const completeChallenge = async () => {
    const res = await fetch('/api/complete-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: 'challenge-1' }),
    });
    const data = await res.json();
    setTokens(t => t + data.tokensAwarded);
  };

  return (
    <div>
      <h2>Gamified Financial Learning</h2>
      <button onClick={completeChallenge}>Complete Challenge</button>
      <p>$NEXUS Tokens: {tokens}</p>
      <h3>Leaderboard</h3>
      <ul>
        {leaderboard.map((entry, idx) => (
          <li key={idx}>{entry.name}: {entry.tokens} tokens</li>
        ))}
      </ul>
      {/* TODO: Render achievements here */}
    </div>
  );
}
