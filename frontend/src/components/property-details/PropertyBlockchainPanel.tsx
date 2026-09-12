import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Wallet } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import {
  describeBlockchainError,
  getOnChainProperty,
  getOnChainRecord,
  isBlockchainConfigured,
  registerPropertyOnChain,
  saveOnChainRecord,
  type OnChainRecord,
} from '../../services/blockchainService';
import type { OnChainProperty } from '../../contracts/PropertyRegistry';
import { formatPrice } from '../../utils/formatPrice';

interface PropertyBlockchainPanelProps {
  property: {
    id: string;
    address: string;
    price: number;
  };
}

type FlowStatus = 'idle' | 'awaiting-signature' | 'awaiting-confirmation' | 'error';

const AMOY_TX_URL = 'https://amoy.polygonscan.com/tx/';

const PropertyBlockchainPanel: React.FC<PropertyBlockchainPanelProps> = ({ property }) => {
  const wallet = useWallet();

  const [record, setRecord] = useState<OnChainRecord | null>(null);
  const [onChainData, setOnChainData] = useState<OnChainProperty | null>(null);
  const [status, setStatus] = useState<FlowStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  useEffect(() => {
    const saved = getOnChainRecord(property.id);
    setRecord(saved);
    setOnChainData(null);
    if (!saved) return;

    let cancelled = false;
    getOnChainProperty(BigInt(saved.propertyId)).then((data) => {
      if (!cancelled) setOnChainData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [property.id]);

  const handleRegister = useCallback(async () => {
    setErrorMessage(null);
    setPendingTxHash(null);

    if (!isBlockchainConfigured()) {
      setErrorMessage('Blockchain registration is not configured for this deployment.');
      setStatus('error');
      return;
    }
    if (!wallet.hasWallet) {
      setErrorMessage('No wallet found. Install MetaMask to continue.');
      setStatus('error');
      return;
    }

    try {
      const connectedAddress = wallet.address ?? (await wallet.connect());
      if (!connectedAddress) return; // wallet.error already holds the reason

      let onAmoy = wallet.isOnAmoy;
      if (!onAmoy) {
        setIsSwitchingNetwork(true);
        try {
          onAmoy = await wallet.switchToAmoy();
        } finally {
          setIsSwitchingNetwork(false);
        }
      }
      if (!onAmoy) return; // wallet.error already holds the reason

      setStatus('awaiting-signature');
      const signer = await wallet.getSigner();
      const priceOnChain = BigInt(Math.max(1, Math.round(property.price)));

      const result = await registerPropertyOnChain(signer, property.address, priceOnChain, (txHash) => {
        setPendingTxHash(txHash);
        setStatus('awaiting-confirmation');
      });

      const newRecord: OnChainRecord = {
        propertyId: result.propertyId.toString(),
        txHash: result.txHash,
        registeredAt: new Date().toISOString(),
      };
      saveOnChainRecord(property.id, newRecord);
      setRecord(newRecord);
      setStatus('idle');
      setPendingTxHash(null); // record.txHash below takes over the display

      const data = await getOnChainProperty(result.propertyId);
      setOnChainData(data);
    } catch (err) {
      setErrorMessage(describeBlockchainError(err));
      setStatus('error');
    }
  }, [wallet, property]);

  const isBusy =
    status === 'awaiting-signature' ||
    status === 'awaiting-confirmation' ||
    wallet.isConnecting ||
    isSwitchingNetwork;
  const isRegistered = Boolean(record);

  return (
    <div className="bg-white border border-[#E6E0DA] rounded-2xl p-8 shadow-sm mt-8">
      <div className="flex items-center gap-2 mb-6">
        <span className="material-icons text-[#D4755B] text-xl">token</span>
        <h3 className="font-syne text-xl text-[#0F172A]">Blockchain Registration</h3>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-4">
        {isRegistered ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
            <span className="font-manrope font-semibold text-sm text-[#22C55E]">Registered on-chain</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
            <span className="font-manrope font-semibold text-sm text-[#64748B]">Not registered on-chain</span>
          </>
        )}
      </div>

      {/* Registered details */}
      {record && (
        <div className="bg-[#FAF8F4] border border-[#E6E0DA] rounded-xl p-4 mb-4 space-y-2">
          <div className="flex justify-between font-manrope text-sm">
            <span className="text-[#64748B]">On-chain property ID</span>
            <span className="text-[#0F172A] font-medium">#{record.propertyId}</span>
          </div>
          {onChainData && (
            <div className="flex justify-between font-manrope text-sm">
              <span className="text-[#64748B]">Price recorded on-chain</span>
              <span className="text-[#0F172A] font-medium">{formatPrice(Number(onChainData.price))}</span>
            </div>
          )}
          <div className="flex justify-between items-center font-manrope text-sm">
            <span className="text-[#64748B]">Transaction</span>
            <a
              href={`${AMOY_TX_URL}${record.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D4755B] font-medium hover:underline inline-flex items-center gap-1"
            >
              {record.txHash.slice(0, 10)}...{record.txHash.slice(-8)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {!onChainData && (
            <p className="font-manrope text-xs text-[#94A3B8] pt-1">
              Verifying against the chain — if this persists, the RPC may be temporarily unreachable.
            </p>
          )}
        </div>
      )}

      {/* Pending transaction */}
      {pendingTxHash && (
        <div className="bg-[#FFF7ED] border border-[#FDBA74] rounded-xl p-4 mb-4">
          <p className="font-manrope text-sm text-[#9A3412]">
            Transaction submitted, waiting for confirmation on Amoy…{' '}
            <a
              href={`${AMOY_TX_URL}${pendingTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium inline-flex items-center gap-1"
            >
              View
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      )}

      {/* Error */}
      {errorMessage && (
        <div className="flex items-start gap-2 bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="font-manrope text-sm text-red-600">{errorMessage}</p>
        </div>
      )}
      {wallet.error && !errorMessage && (
        <div className="flex items-start gap-2 bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="font-manrope text-sm text-red-600">{wallet.error}</p>
        </div>
      )}

      {/* Wrong network notice */}
      {wallet.address && !wallet.isOnAmoy && !isBusy && (
        <p className="font-manrope text-xs text-[#94A3B8] mb-3">
          Connected wallet is on a different network — switching to Polygon Amoy is handled automatically when you
          register.
        </p>
      )}

      {!isRegistered && (
        <button
          onClick={handleRegister}
          disabled={isBusy}
          className="w-full flex items-center justify-center gap-2 bg-[#D4755B] hover:bg-[#C05621] disabled:opacity-60 disabled:cursor-not-allowed text-white font-manrope font-bold text-base py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl"
        >
          {isBusy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {status === 'awaiting-signature'
                ? 'Confirm in wallet…'
                : status === 'awaiting-confirmation'
                  ? 'Waiting for confirmation…'
                  : isSwitchingNetwork
                    ? 'Switching to Polygon Amoy…'
                    : 'Connecting…'}
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              {wallet.address ? 'Register on Blockchain' : 'Connect Wallet to Register'}
            </>
          )}
        </button>
      )}

      <p className="font-manrope text-xs text-[#94A3B8] mt-4">
        Registration status is tracked in this browser. Anyone can independently verify a registration on{' '}
        <a
          href="https://amoy.polygonscan.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[#D4755B]"
        >
          Polygon Amoy's block explorer
        </a>
        .
      </p>
    </div>
  );
};

export default PropertyBlockchainPanel;
