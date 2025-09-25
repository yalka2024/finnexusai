const logger = require('../../utils/logger');
import React from 'react';
import { useWeb3 } from './Web3Provider';

export default function WalletConnect() {
  const {
    account,
    chainId,
    isConnected,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    formatAddress,
    getNetworkName,
    clearError
  } = useWeb3();

  const handleConnect = async (walletType) => {
    try {
      await connectWallet(walletType);
    } catch (error) {
      logger.error('Error connecting wallet:', error);
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      // Switch to Ethereum mainnet
      await switchNetwork('0x1');
    } catch (error) {
      logger.error('Error switching network:', error);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg mb-8">
      <h2 className="text-xl text-neon mb-4">Web3 Wallet Connection</h2>
      
      {error && (
        <div className="bg-red-600 text-white p-3 rounded mb-4">
          <p>{error}</p>
          <button 
            onClick={clearError}
            className="text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {isConnected ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-green-400 mb-1">✅ Wallet Connected</p>
              <p className="text-sm text-gray-400">
                Address: {formatAddress(account)}
              </p>
              <p className="text-sm text-gray-400">
                Network: {getNetworkName(chainId)}
              </p>
            </div>
            <button
              onClick={disconnectWallet}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Disconnect
            </button>
          </div>

          {chainId !== '0x1' && (
            <div className="bg-yellow-900/20 border border-yellow-500 rounded p-3 mb-4">
              <p className="text-yellow-400 text-sm mb-2">
                ⚠️ You're on {getNetworkName(chainId)}. Switch to Ethereum Mainnet for full functionality.
              </p>
              <button
                onClick={handleSwitchNetwork}
                className="bg-yellow-600 text-black px-3 py-1 rounded text-sm hover:bg-yellow-500"
              >
                Switch to Ethereum
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button className="bg-neon text-black py-2 px-4 rounded font-bold hover:bg-neon/90">
              📈 Trade
            </button>
            <button className="bg-gray-700 text-white py-2 px-4 rounded font-bold hover:bg-gray-600">
              💼 Portfolio
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-gray-400 mb-4">Connect your wallet to access DeFi features</p>
          
          <div className="space-y-3">
            <button
              onClick={() => handleConnect('metamask')}
              disabled={isConnecting}
              className="w-full bg-orange-500 text-white py-3 px-4 rounded font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isConnecting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <span className="mr-2">🦊</span>
              )}
              Connect MetaMask
            </button>

            <button
              onClick={() => handleConnect('coinbase')}
              disabled={isConnecting}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <span className="mr-2">🔵</span>
              Connect Coinbase Wallet
            </button>

            <button
              onClick={() => handleConnect('walletconnect')}
              disabled={isConnecting}
              className="w-full bg-gray-700 text-white py-3 px-4 rounded font-bold hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <span className="mr-2">🔗</span>
              WalletConnect (Coming Soon)
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>Supported wallets: MetaMask, Coinbase Wallet</p>
            <p>Supported networks: Ethereum, Polygon, Optimism</p>
          </div>
        </div>
      )}
    </div>
  );
}