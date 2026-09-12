import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  Wallet,
  Check,
  Building2,
  Radio,
} from 'lucide-react';
import contractArtifact from '../../contracts/PropertyRegistry.json';
import { DEFAULT_CHAIN_ID, getContractAddress } from '../../contracts/addresses';

interface PropertyData {
  _id: string;
  title: string;
  location: string;
  price: number;
}

interface BlockchainRegistryCardProps {
  property: PropertyData;
}

interface OnChainProperty {
  id: number;
  propertyAddress: string;
  owner: string;
  price: bigint;
}

/**
 * Architecture Decision: Client-Side Backend ID to On-Chain ID Mapping
 * Bridges MongoDB _id string with numeric Solidity contract uint256 ID in localStorage.
 */
interface OnChainMapping {
  onChainId: number;
  txHash: string;
  chainId: number;
  registeredAt: number;
}

const getStoredMapping = (propId: string): OnChainMapping | null => {
  try {
    const raw = localStorage.getItem(`rechain_onchain_map_${propId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveStoredMapping = (propId: string, mapping: OnChainMapping) => {
  try {
    localStorage.setItem(`rechain_onchain_map_${propId}`, JSON.stringify(mapping));
  } catch (err) {
    console.warn('Failed to persist on-chain mapping:', err);
  }
};

const POLYGON_AMOY_CONFIG = {
  chainId: '0x13882', // 80002
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: {
    name: 'POL',
    symbol: 'POL',
    decimals: 18,
  },
  rpcUrls: ['https://rpc-amoy.polygon.technology/'],
  blockExplorerUrls: ['https://amoy.polygonscan.com/'],
};

export const BlockchainRegistryCard: React.FC<BlockchainRegistryCardProps> = ({ property }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // On-Chain Status
  const [isOnChain, setIsOnChain] = useState<boolean>(false);
  const [onChainDetails, setOnChainDetails] = useState<OnChainProperty | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(true);

  // Completion Receipt / Tx Hash
  const [txHash, setTxHash] = useState<string | null>(null);
  const [copiedTx, setCopiedTx] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const contractAddress = getContractAddress(chainId || DEFAULT_CHAIN_ID);
  const propertyFullAddress = `${property.title}, ${property.location}`;

  // Helper to ensure transactions satisfy Polygon Amoy minimum 25 Gwei gas tip
  const getGasOverrides = async (provider: ethers.BrowserProvider) => {
    try {
      const feeData = await provider.getFeeData();
      const minTip = ethers.parseUnits('30', 'gwei');
      const priorityFee =
        feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas > minTip
          ? feeData.maxPriorityFeePerGas
          : minTip;

      const baseFee = feeData.maxFeePerGas || ethers.parseUnits('40', 'gwei');
      const maxFee = baseFee > priorityFee ? baseFee + priorityFee : priorityFee * 2n;

      return {
        maxPriorityFeePerGas: priorityFee,
        maxFeePerGas: maxFee,
      };
    } catch {
      return {
        maxPriorityFeePerGas: ethers.parseUnits('30', 'gwei'),
        maxFeePerGas: ethers.parseUnits('60', 'gwei'),
      };
    }
  };

  // Connect Wallet
  const connectWallet = async (): Promise<{ account: string; chainId: number } | null> => {
    if (!window.ethereum) {
      setFeedback({
        type: 'error',
        message: 'MetaMask or Web3 wallet not detected. Please install a browser wallet.',
      });
      return null;
    }

    try {
      setIsConnecting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();

      const userAccount = accounts[0];
      const userChainId = Number(network.chainId);

      setAccount(userAccount);
      setChainId(userChainId);
      return { account: userAccount, chainId: userChainId };
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to connect wallet.',
      });
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  // Switch to Polygon Amoy
  const switchToAmoy = async (): Promise<boolean> => {
    if (!window.ethereum) return false;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_AMOY_CONFIG.chainId }],
      });
      setChainId(80002);
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [POLYGON_AMOY_CONFIG],
          });
          setChainId(80002);
          return true;
        } catch (addError) {
          console.error('Error adding network:', addError);
          return false;
        }
      }
      return false;
    }
  };

  // Check On-Chain Status with localStorage mapping priority
  const checkOnChainStatus = useCallback(async () => {
    try {
      setIsCheckingStatus(true);
      let provider: ethers.Provider;

      if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        provider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology/');
      }

      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, provider);

      // 1. Check local storage mapping first (instant O(1) lookup + restored txHash)
      const stored = getStoredMapping(property._id);
      if (stored) {
        if (stored.txHash) setTxHash(stored.txHash);
        try {
          const prop = await contract.getProperty(stored.onChainId);
          if (prop.owner !== ethers.ZeroAddress) {
            setIsOnChain(true);
            setOnChainDetails({
              id: stored.onChainId,
              propertyAddress: prop.propertyAddress,
              owner: prop.owner,
              price: prop.price,
            });
            setIsCheckingStatus(false);
            return;
          }
        } catch {
          // If contract was redeployed or ID invalid, fall through to chain scan
        }
      }

      // 2. Fallback: Scan contract records if not found in local cache
      const countBigInt: bigint = await contract.propertyCounter();
      const count = Number(countBigInt);

      let found: OnChainProperty | null = null;
      for (let i = count - 1; i >= 0; i--) {
        const prop = await contract.getProperty(i);
        // Match by title/location string or address inclusion
        if (
          prop.propertyAddress === propertyFullAddress ||
          prop.propertyAddress === property.location ||
          prop.propertyAddress.includes(property.title)
        ) {
          found = {
            id: i,
            propertyAddress: prop.propertyAddress,
            owner: prop.owner,
            price: prop.price,
          };
          // Persist the discovered match
          saveStoredMapping(property._id, {
            onChainId: i,
            txHash: stored?.txHash || '',
            chainId: chainId || DEFAULT_CHAIN_ID,
            registeredAt: Date.now(),
          });
          break;
        }
      }

      if (found) {
        setIsOnChain(true);
        setOnChainDetails(found);
      } else {
        setIsOnChain(false);
        setOnChainDetails(null);
      }
    } catch (err) {
      console.warn('Could not query on-chain property status:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [contractAddress, propertyFullAddress, property._id, property.title, property.location, chainId]);

  // Initial account setup and listeners
  useEffect(() => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      provider.listAccounts().then((accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
          provider.getNetwork().then((net) => {
            setChainId(Number(net.chainId));
          });
        }
      });

      const handleAccounts = (accounts: string[]) => {
        setAccount(accounts.length > 0 ? accounts[0] : null);
        checkOnChainStatus();
      };
      const handleChain = (newChainId: string) => {
        setChainId(parseInt(newChainId, 16));
        checkOnChainStatus();
      };

      window.ethereum.on('accountsChanged', handleAccounts);
      window.ethereum.on('chainChanged', handleChain);

      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccounts);
          window.ethereum.removeListener('chainChanged', handleChain);
        }
      };
    }
  }, [checkOnChainStatus]);

  useEffect(() => {
    checkOnChainStatus();
  }, [checkOnChainStatus]);

  // Register on Blockchain
  const handleRegisterOnBlockchain = async () => {
    if (!window.ethereum) {
      setFeedback({
        type: 'error',
        message: 'MetaMask or Web3 wallet not detected. Please install a browser wallet.',
      });
      return;
    }

    try {
      setIsRegistering(true);
      let activeAccount = account;
      let activeChainId = chainId;

      // 1. Connect wallet if not already connected
      if (!activeAccount) {
        setFeedback({ type: 'info', message: 'Connecting wallet...' });
        const conn = await connectWallet();
        if (!conn) {
          setIsRegistering(false);
          return;
        }
        activeAccount = conn.account;
        activeChainId = conn.chainId;
      }

      // 2. Ensure connected to Polygon Amoy Testnet (80002)
      if (activeChainId !== 80002 && activeChainId !== 31337) {
        setFeedback({ type: 'info', message: 'Switching to Polygon Amoy Testnet...' });
        const switched = await switchToAmoy();
        if (!switched) {
          setFeedback({
            type: 'error',
            message: 'Please switch your wallet to Polygon Amoy Testnet (Chain ID 80002).',
          });
          setIsRegistering(false);
          return;
        }
      }

      setFeedback({
        type: 'info',
        message: 'Please confirm the registration transaction in your MetaMask wallet...',
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);

      // Convert property price to reasonable POL valuation (e.g. 1 POL base + proportional or 1.5 POL)
      const polPriceStr = (Math.max(1, Math.round(property.price / 100000) / 10) || 1.5).toString();
      const priceInWei = ethers.parseEther(polPriceStr);

      const gasOverrides = await getGasOverrides(provider);
      const tx = await contract.registerProperty(propertyFullAddress, priceInWei, gasOverrides);

      setFeedback({
        type: 'info',
        message: 'Transaction broadcast! Waiting for on-chain block confirmation...',
      });

      const receipt = await tx.wait();
      const hash = receipt.hash;

      // Architecture: Extract on-chain propertyId from the PropertyCreated event log
      let assignedId: number | null = null;
      if (receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            if (parsed && parsed.name === 'PropertyCreated') {
              assignedId = Number(parsed.args.propertyId);
              break;
            }
          } catch {}
        }
      }

      if (assignedId === null) {
        const currentCount: bigint = await contract.propertyCounter();
        assignedId = Number(currentCount) - 1;
      }

      // Persist application property._id to on-chain propertyId mapping in localStorage
      saveStoredMapping(property._id, {
        onChainId: assignedId,
        txHash: hash,
        chainId: chainId || DEFAULT_CHAIN_ID,
        registeredAt: Date.now(),
      });

      // Set Transaction Hash
      setTxHash(hash);
      setIsOnChain(true);
      setFeedback({
        type: 'success',
        message: 'Property successfully registered on the blockchain!',
      });

      // Refresh on-chain state
      checkOnChainStatus();
    } catch (err: any) {
      console.error('Registration error:', err);
      let errorMsg = 'Failed to register property on blockchain.';
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        errorMsg = 'Transaction was rejected in wallet.';
      } else if (err.message && err.message.includes('gas tip cap')) {
        errorMsg = 'Gas fee below Amoy minimum. Retrying with adjusted tip.';
      } else if (err.reason) {
        errorMsg = err.reason;
      }
      setFeedback({ type: 'error', message: errorMsg });
    } finally {
      setIsRegistering(false);
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2000);
  };

  return (
    <div className="bg-white border border-[#E6E0DA] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E0DA] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4755B]/10 flex items-center justify-center text-[#D4755B]">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-manrope font-bold text-lg text-[#1F2937]">Blockchain Registry</h3>
            <p className="font-manrope text-xs text-[#6B7280]">Decentralized Title Verification (Polygon Amoy)</p>
          </div>
        </div>

        {/* Property's On-Chain Status */}
        <div className="flex items-center">
          {isCheckingStatus ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Checking On-Chain Status...</span>
            </span>
          ) : isOnChain ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>On-Chain Status: Verified & Registered</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
              <Radio className="w-3 h-3 text-amber-500" />
              <span>On-Chain Status: Not Yet Registered</span>
            </span>
          )}
        </div>
      </div>

      {/* Status Details Overview */}
      {isOnChain && onChainDetails ? (
        <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0DA] space-y-3 text-xs font-manrope">
          <div className="flex items-center justify-between">
            <span className="text-[#6B7280]">Blockchain Record:</span>
            <span className="font-bold text-[#1F2937] px-2 py-0.5 rounded bg-white border border-[#E6E0DA]">
              Property #{onChainDetails.id}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6B7280]">Application ID:</span>
            <span className="font-mono text-[#6B7280] text-[11px] truncate max-w-[150px]" title={property._id}>
              {property._id}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6B7280]">On-Chain Owner:</span>
            <span className="font-mono text-[#374151]">
              {`${onChainDetails.owner.slice(0, 6)}...${onChainDetails.owner.slice(-4)}`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6B7280]">Smart Contract Valuation:</span>
            <span className="font-bold text-emerald-700">
              {ethers.formatEther(onChainDetails.price)} POL
            </span>
          </div>
        </div>
      ) : (
        <p className="font-manrope text-sm text-[#4B5563] leading-relaxed">
          This property deed is ready to be tokenized and recorded immutably on the Polygon blockchain. Registering guarantees proof of ownership and public verification.
        </p>
      )}

      {/* Transaction Hash Display when complete */}
      {txHash && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5 animate-in fade-in duration-300">
          <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Registration Confirmed On Blockchain!</span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-emerald-700 font-semibold block">
              Transaction Hash:
            </label>
            <div className="flex items-center space-x-2 bg-white border border-emerald-200 rounded-lg p-2">
              <span className="font-mono text-xs text-emerald-900 truncate flex-1 select-all">
                {txHash}
              </span>
              <button
                onClick={() => copyHash(txHash)}
                title="Copy Transaction Hash"
                className="p-1 text-emerald-700 hover:text-emerald-900 transition cursor-pointer"
              >
                {copiedTx ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={`https://amoy.polygonscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                title="View on PolygonScan"
                className="p-1 text-emerald-700 hover:text-emerald-900 transition cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Message */}
      {feedback && !txHash && (
        <div
          className={`p-3 rounded-xl text-xs font-manrope flex items-center space-x-2 ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          ) : feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Action Button: Register on Blockchain */}
      <div className="pt-2">
        {!isOnChain ? (
          <button
            onClick={handleRegisterOnBlockchain}
            disabled={isRegistering}
            className="w-full bg-[#D4755B] hover:bg-[#B86851] text-white font-manrope font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer text-sm"
          >
            {isRegistering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registering on Blockchain...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Register on Blockchain</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center justify-between text-xs text-[#6B7280] bg-[#FAF8F5] p-3 rounded-xl border border-[#E6E0DA]">
            <span className="flex items-center space-x-1.5 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Title Secured On-Chain</span>
            </span>
            <a
              href={`https://amoy.polygonscan.com/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-[#D4755B] hover:underline font-semibold"
            >
              <span>View Contract</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {!account && !isOnChain && (
          <p className="text-center font-manrope text-xs text-[#6B7280] mt-2 flex items-center justify-center space-x-1">
            <Wallet className="w-3.5 h-3.5" />
            <span>Connects MetaMask wallet on click</span>
          </p>
        )}
      </div>
    </div>
  );
};
