import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  type Eip1193Provider,
} from "ethers";
import { propertyRegistryAbi } from "./propertyRegistryAbi";

export const AMOY_CHAIN_ID = 80002;
export const AMOY_CHAIN_ID_HEX = "0x13882";
export const AMOY_EXPLORER = "https://amoy.polygonscan.com";

const DEFAULT_AMOY_RPC_URL = "https://polygon-amoy.drpc.org";
const AMOY_RPC_URL =
  import.meta.env.VITE_AMOY_RPC_URL || DEFAULT_AMOY_RPC_URL;

export const PROPERTY_REGISTRY_ADDRESS =
  import.meta.env.VITE_PROPERTY_REGISTRY_ADDRESS;

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

function requireContractAddress(): string {
  if (!PROPERTY_REGISTRY_ADDRESS) {
    throw new Error(
      "Blockchain contract is not configured. Set VITE_PROPERTY_REGISTRY_ADDRESS in frontend/.env.local.",
    );
  }

  return PROPERTY_REGISTRY_ADDRESS;
}

export async function ensureAmoyNetwork(): Promise<void> {
  if (!window.ethereum) {
    throw new Error(
      "No Web3 wallet was detected. Install or enable a compatible browser wallet first.",
    );
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: AMOY_CHAIN_ID_HEX }],
    });
  } catch (error) {
    const walletError = error as { code?: number };

    if (walletError.code !== 4902) {
      throw error;
    }

    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: AMOY_CHAIN_ID_HEX,
          chainName: "Polygon Amoy Testnet",
          nativeCurrency: {
            name: "POL",
            symbol: "POL",
            decimals: 18,
          },
          rpcUrls: [AMOY_RPC_URL],
          blockExplorerUrls: [AMOY_EXPLORER],
        },
      ],
    });
  }
}

export function getReadOnlyRegistry(): Contract {
  const provider = new JsonRpcProvider(AMOY_RPC_URL);

  return new Contract(
    requireContractAddress(),
    propertyRegistryAbi,
    provider,
  );
}

export async function getWritableRegistry(): Promise<Contract> {
  if (!window.ethereum) {
    throw new Error(
      "No Web3 wallet was detected. Install or enable a compatible browser wallet first.",
    );
  }

  await ensureAmoyNetwork();

  const provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();

  return new Contract(
    requireContractAddress(),
    propertyRegistryAbi,
    signer,
  );
}
