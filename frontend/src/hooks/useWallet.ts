import { useCallback, useEffect, useState } from 'react';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { AMOY_CHAIN_ID, AMOY_CHAIN_ID_HEX } from '../contracts/PropertyRegistry';

interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

interface ProviderRpcError extends Error {
  code: number;
}

function isProviderRpcError(err: unknown): err is ProviderRpcError {
  return typeof err === 'object' && err !== null && 'code' in err;
}

interface UseWalletResult {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
  hasWallet: boolean;
  isOnAmoy: boolean;
  connect: () => Promise<string | null>;
  switchToAmoy: () => Promise<boolean>;
  getSigner: () => Promise<JsonRpcSigner>;
}

export function useWallet(): UseWalletResult {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasWallet = typeof window !== 'undefined' && Boolean(window.ethereum);

  const refreshChainId = useCallback(async (): Promise<number | null> => {
    if (!window.ethereum) return null;
    const hexChainId = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
    const id = parseInt(hexChainId, 16);
    setChainId(id);
    return id;
  }, []);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;
    ethereum
      .request({ method: 'eth_accounts' })
      .then((accounts) => {
        const list = accounts as string[];
        if (list.length > 0) setAddress(list[0]);
      })
      .catch(() => {

      });

    refreshChainId();

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAddress(accounts.length > 0 ? accounts[0] : null);
    };
    const handleChainChanged = (...args: unknown[]) => {
      const hexChainId = args[0] as string;
      setChainId(parseInt(hexChainId, 16));
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [refreshChainId]);

  const connect = useCallback(async (): Promise<string | null> => {
    if (!window.ethereum) {
      setError('No wallet found. Install MetaMask to continue.');
      return null;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      const connected = accounts[0] ?? null;
      setAddress(connected);
      await refreshChainId();
      return connected;
    } catch (err: unknown) {
      const rejected = isProviderRpcError(err) && err.code === 4001;
      setError(rejected ? 'Connection request rejected.' : 'Failed to connect wallet.');
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [refreshChainId]);

  const switchToAmoy = useCallback(async (): Promise<boolean> => {
    const ethereum = window.ethereum;
    if (!ethereum) {
      setError('No wallet found. Install MetaMask to continue.');
      return false;
    }
    setError(null);
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AMOY_CHAIN_ID_HEX }],
      });
    } catch (switchError: unknown) {
      // 4902 = chain not yet added to the wallet
      if (isProviderRpcError(switchError) && switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: AMOY_CHAIN_ID_HEX,
                chainName: 'Polygon Amoy Testnet',
                nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
                rpcUrls: [import.meta.env.VITE_AMOY_RPC_URL || 'https://polygon-amoy-bor-rpc.publicnode.com'],
                blockExplorerUrls: ['https://amoy.polygonscan.com'],
              },
            ],
          });
        } catch {
          setError('Failed to add Polygon Amoy to your wallet.');
          return false;
        }
      } else {
        setError('Failed to switch network. Please switch to Polygon Amoy manually.');
        return false;
      }
    }
    const id = await refreshChainId();
    return id === AMOY_CHAIN_ID;
  }, [refreshChainId]);

  const getSigner = useCallback(async () => {
    if (!window.ethereum) throw new Error('No wallet found. Install MetaMask to continue.');
    const provider = new BrowserProvider(window.ethereum);
    return provider.getSigner();
  }, []);

  return {
    address,
    chainId,
    isConnecting,
    error,
    hasWallet,
    isOnAmoy: chainId === AMOY_CHAIN_ID,
    connect,
    switchToAmoy,
    getSigner,
  };
}
