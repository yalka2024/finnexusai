import React, { useState } from 'react';
import { useAuth } from '../components/AuthProvider';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    login(username, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded shadow-lg">
        <h2 className="text-2xl text-neon mb-4">Sign In</h2>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="block w-full mb-4 p-2 rounded bg-gray-700 text-white"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="block w-full mb-4 p-2 rounded bg-gray-700 text-white"
        />
        <button type="submit" className="w-full bg-neon text-black py-2 rounded font-bold">Login</button>
      </form>
    </div>
  );
}
