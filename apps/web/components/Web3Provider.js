const logger = require('../../utils/logger');
import React, { createContext, useContext, useState, useEffect } from 'react';

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  // Check if wallet is already connected on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          setChainId(chainId);
        }
      } catch (error) {
        logger.error('Error checking connection:', error);
      }
    }
  };

  const connectWallet = async (walletType = 'metamask') => {
    setIsConnecting(true);
    setError(null);

    try {
      if (walletType === 'metamask') {
        await connectMetaMask();
      } else if (walletType === 'coinbase') {
        await connectCoinbaseWallet();
      } else if (walletType === 'walletconnect') {
        await connectWalletConnect();
      } else {
        throw new Error('Unsupported wallet type');
      }
    } catch (error) {
      setError(error.message);
      logger.error('Error connecting wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const account = accounts[0];
      setAccount(account);
      setIsConnected(true);

      // Get chain ID
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(chainId);

      // Set up event listeners
      setupEventListeners();

      // Store connection in localStorage
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('walletType', 'metamask');
      localStorage.setItem('walletAccount', account);

      return { account, chainId };
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('User rejected the connection request');
      }
      throw error;
    }
  };

  const connectCoinbaseWallet = async () => {
    if (!window.ethereum?.isCoinbaseWallet) {
      throw new Error('Coinbase Wallet is not installed. Please install Coinbase Wallet to continue.');
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const account = accounts[0];
      setAccount(account);
      setIsConnected(true);

      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(chainId);

      setupEventListeners();

      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('walletType', 'coinbase');
      localStorage.setItem('walletAccount', account);

      return { account, chainId };
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('User rejected the connection request');
      }
      throw error;
    }
  };

  const connectWalletConnect = async () => {
    // This would integrate with WalletConnect
    // For now, throw an error as it requires additional setup
    throw new Error('WalletConnect integration coming soon');
  };

  const setupEventListeners = () => {
    if (!window.ethereum) return;

    // Listen for account changes
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
        localStorage.setItem('walletAccount', accounts[0]);
      }
    });

    // Listen for chain changes
    window.ethereum.on('chainChanged', (chainId) => {
      setChainId(chainId);
      // Optionally reload the page or show a notification
      window.location.reload();
    });

    // Listen for disconnect
    window.ethereum.on('disconnect', () => {
      disconnectWallet();
    });
  };

  const disconnectWallet = () => {
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    setProvider(null);
    setSigner(null);
    setError(null);

    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletType');
    localStorage.removeItem('walletAccount');
  };

  const switchNetwork = async (targetChainId) => {
    if (!window.ethereum) {
      throw new Error('No wallet provider found');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }],
      });
    } catch (error) {
      if (error.code === 4902) {
        // Chain not added to wallet, try to add it
        await addNetwork(targetChainId);
      } else {
        throw error;
      }
    }
  };

  const addNetwork = async (chainId) => {
    const networkConfigs = {
      '0x1': {
        chainName: 'Ethereum Mainnet',
        rpcUrls: ['https://mainnet.infura.io/v3/'],
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        blockExplorerUrls: ['https://etherscan.io'],
      },
      '0x89': {
        chainName: 'Polygon Mainnet',
        rpcUrls: ['https://polygon-rpc.com'],
        nativeCurrency: {
          name: 'MATIC',
          symbol: 'MATIC',
          decimals: 18,
        },
        blockExplorerUrls: ['https://polygonscan.com'],
      },
      '0xa': {
        chainName: 'Optimism',
        rpcUrls: ['https://mainnet.optimism.io'],
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        blockExplorerUrls: ['https://optimistic.etherscan.io'],
      },
    };

    const config = networkConfigs[chainId];
    if (!config) {
      throw new Error('Unsupported network');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: chainId,
            ...config,
          },
        ],
      });
    } catch (error) {
      throw new Error('Failed to add network to wallet');
    }
  };

  const signMessage = async (message) => {
    if (!window.ethereum || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, account],
      });
      return signature;
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('User rejected the signature request');
      }
      throw error;
    }
  };

  const sendTransaction = async (transaction) => {
    if (!window.ethereum || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transaction],
      });
      return txHash;
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('User rejected the transaction');
      }
      throw error;
    }
  };

  const getBalance = async (address = account) => {
    if (!window.ethereum || !address) {
      throw new Error('Wallet not connected or no address provided');
    }

    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      return balance;
    } catch (error) {
      throw new Error('Failed to get balance');
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkName = (chainId) => {
    const networks = {
      '0x1': 'Ethereum Mainnet',
      '0x3': 'Ropsten Testnet',
      '0x4': 'Rinkeby Testnet',
      '0x5': 'Goerli Testnet',
      '0x89': 'Polygon Mainnet',
      '0xa': 'Optimism',
      '0xa4b1': 'Arbitrum One',
    };
    return networks[chainId] || `Unknown Network (${chainId})`;
  };

  const value = {
    // State
    account,
    chainId,
    isConnected,
    isConnecting,
    error,
    provider,
    signer,

    // Actions
    connectWallet,
    disconnectWallet,
    switchNetwork,
    addNetwork,
    signMessage,
    sendTransaction,
    getBalance,

    // Utilities
    formatAddress,
    getNetworkName,
    clearError: () => setError(null),
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};
