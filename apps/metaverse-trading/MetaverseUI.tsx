// AI-Driven Financial Metaverse Frontend UI (React)
import React, { useState } from 'react';

type User = { id: string; name: string };
type MetaverseState = {
  tradingFloor: any[];
  simulators: any[];
  users: User[];
};

export default function MetaverseUI() {
  const [state, setState] = useState<MetaverseState>({ tradingFloor: [], simulators: [], users: [] });
  const [loading, setLoading] = useState(false);

  // Fetch users from backend
  React.useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setState(s => ({ ...s, users: data })));
  }, []);

  // Join trading floor via backend
  const joinTradingFloor = async () => {
    setLoading(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User' }),
    });
    const newUser = await res.json();
    setState(s => ({ ...s, users: [...s.users, newUser] }));
    setLoading(false);
  };

  return (
    <div>
      <h2>3D Financial Metaverse</h2>
      <p>Trading Floor Users: {state.users.length}</p>
      <button onClick={joinTradingFloor} disabled={loading}>Join Trading Floor</button>
      <ul>
        {state.users.map(u => (
          <li key={u.id}>{u.name}</li>
        ))}
      </ul>
      {/* TODO: Render 3D/AR components here */}
    </div>
  );
}
