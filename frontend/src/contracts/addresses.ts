// Auto-generated addresses for PropertyRegistry
export const CONTRACT_ADDRESSES: Record<number, string> = {
  // Polygon Amoy Testnet
  80002: "0x8C3a2d174D779F4CeB0A066e5FDf5d44D9B4366D",
  // Hardhat Localhost
  31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
};

export const DEFAULT_CHAIN_ID = 80002;

export function getContractAddress(chainId?: number): string {
  if (!chainId) return CONTRACT_ADDRESSES[DEFAULT_CHAIN_ID];
  return CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[DEFAULT_CHAIN_ID];
}
