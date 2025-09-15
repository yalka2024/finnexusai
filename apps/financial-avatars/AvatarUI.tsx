// Synthetic Financial Avatars Frontend UI (React)
import React, { useState } from 'react';

type Avatar = {
  id: string;
  personality: string;
  tokens: number;
};

export default function AvatarUI() {
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch avatars from backend
  React.useEffect(() => {
    fetch('/api/avatars')
      .then(res => res.json())
      .then(data => setAvatars(data));
  }, []);

  // Create avatar via backend
  const createAvatar = async () => {
    setLoading(true);
    const res = await fetch('/api/avatars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personality: 'Conservative', tokens: 100 }),
    });
    const newAvatar = await res.json();
    setAvatar(newAvatar);
    setAvatars(prev => [...prev, newAvatar]);
    setLoading(false);
  };

  return (
    <div>
      <h2>Financial Avatar Mentor</h2>
      <button onClick={createAvatar} disabled={loading}>Create Avatar</button>
      {avatar && (
        <div>
          <p>Personality: {avatar.personality}</p>
          <p>Tokens: {avatar.tokens}</p>
        </div>
      )}
      <h3>All Avatars</h3>
      <ul>
        {avatars.map(a => (
          <li key={a.id}>{a.personality} - {a.tokens} tokens</li>
        ))}
      </ul>
    </div>
  );
}
