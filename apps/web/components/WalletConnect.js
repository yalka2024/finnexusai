import React, { useState } from 'react';
import Web3 from 'web3';

export default function WalletConnect() {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3.eth.getAccounts();
        setAccount(accounts[0]);
        setError(null);
      } catch (err) {
        setError('Connection failed');
      }
    } else {
      setError('MetaMask not found');
    }
  };

  return (
    <div className="mb-4">
      {account ? (
        <div className="text-accent">Connected: {account}</div>
      ) : (
        <button onClick={connectWallet} className="bg-neon text-black px-4 py-2 rounded font-bold">Connect Wallet</button>
      )}
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  );
}
