import { Contract, JsonRpcProvider, type JsonRpcSigner } from 'ethers';
import {
  AMOY_CHAIN_ID,
  PROPERTY_REGISTRY_ABI,
  PROPERTY_REGISTRY_ADDRESS,
  type OnChainProperty,
} from '../contracts/PropertyRegistry';

const DEFAULT_AMOY_RPC_URL = 'https://polygon-amoy-bor-rpc.publicnode.com';

export function isBlockchainConfigured(): boolean {
  return Boolean(PROPERTY_REGISTRY_ADDRESS);
}

function requireAddress(): string {
  if (!PROPERTY_REGISTRY_ADDRESS) {
    throw new Error('PropertyRegistry address is not configured (VITE_PROPERTY_REGISTRY_ADDRESS).');
  }
  return PROPERTY_REGISTRY_ADDRESS;
}

function getReadProvider(): JsonRpcProvider {
  const rpcUrl = import.meta.env.VITE_AMOY_RPC_URL || DEFAULT_AMOY_RPC_URL;
  return new JsonRpcProvider(rpcUrl, AMOY_CHAIN_ID);
}

function getReadContract(): Contract {
  return new Contract(requireAddress(), PROPERTY_REGISTRY_ABI, getReadProvider());
}

function getWriteContract(signer: JsonRpcSigner): Contract {
  return new Contract(requireAddress(), PROPERTY_REGISTRY_ABI, signer);
}

/** Fetches a property record. */
export async function getOnChainProperty(propertyId: bigint | number): Promise<OnChainProperty | null> {
  try {
    const result = await getReadContract().getProperty(propertyId);
    return {
      id: result.id,
      propertyAddress: result.propertyAddress,
      owner: result.owner,
      price: result.price,
      registeredAt: result.registeredAt,
    };
  } catch {
    return null;
  }
}

export interface RegisterPropertyResult {
  txHash: string;
  propertyId: bigint;
}

/**
 * Registers a property on-chain and returns the tx hash + assigned id.
 */
export async function registerPropertyOnChain(
  signer: JsonRpcSigner,
  propertyAddress: string,
  price: bigint,
  onTxSubmitted?: (txHash: string) => void
): Promise<RegisterPropertyResult> {
  const contract = getWriteContract(signer);
  const tx = await contract.registerProperty(propertyAddress, price);
  onTxSubmitted?.(tx.hash);
  const receipt = await tx.wait();

  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === 'PropertyRegistered') {
        return { txHash: tx.hash, propertyId: parsed.args.propertyId as bigint };
      }
    } catch {

    }
  }

  throw new Error('Registration transaction succeeded, but the PropertyRegistered event was not found.');
}

interface ProviderRpcError {
  code: number;
}

interface EthersRevertError {
  revert?: { name?: string } | null;
  shortMessage?: string;
  reason?: string | null;
}

function isProviderRpcError(err: unknown): err is ProviderRpcError {
  return typeof err === 'object' && err !== null && 'code' in err;
}

const CUSTOM_ERROR_MESSAGES: Record<string, string> = {
  PropertyNotFound: 'This property does not exist on-chain.',
  NotPropertyOwner: 'Only the current on-chain owner can transfer this property.',
  EmptyPropertyAddress: 'Property address cannot be empty.',
  ZeroPrice: 'Price must be greater than zero.',
  InvalidNewOwner: 'Invalid new owner address.',
};

/** Turns a raw ethers/wallet error into a message */
export function describeBlockchainError(err: unknown): string {
  if (isProviderRpcError(err) && err.code === 4001) {
    return 'Transaction rejected in wallet.';
  }

  const revertName = (err as EthersRevertError)?.revert?.name;
  if (revertName) {
    return CUSTOM_ERROR_MESSAGES[revertName] ?? revertName;
  }

  const { shortMessage, reason } = (err as EthersRevertError) ?? {};
  return shortMessage || reason || 'Transaction failed. Please try again.';
}

// ── Off-chain <-> on-chain id mapping 

const STORAGE_PREFIX = 'rechain:onchain:';

export interface OnChainRecord {
  propertyId: string;
  txHash: string;
  registeredAt: string; 
}

export function getOnChainRecord(mongoPropertyId: string): OnChainRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + mongoPropertyId);
    return raw ? (JSON.parse(raw) as OnChainRecord) : null;
  } catch {
    return null;
  }
}

export function saveOnChainRecord(mongoPropertyId: string, record: OnChainRecord): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + mongoPropertyId, JSON.stringify(record));
  } catch {
  }
}
