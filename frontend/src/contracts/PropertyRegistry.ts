/**
 * PropertyRegistry deployed on Polygon Amoy testnet.
 * Source: contracts/src/PropertyRegistry.sol
 * Deployment record: contracts/DEPLOYMENT.md
 */

export const AMOY_CHAIN_ID = 80002;
export const AMOY_CHAIN_ID_HEX = "0x13882";

export const PROPERTY_REGISTRY_ADDRESS = import.meta.env.VITE_PROPERTY_REGISTRY_ADDRESS;

/** Human-readable ABI (ethers v6) */
export const PROPERTY_REGISTRY_ABI = [
  "function registerProperty(string _address, uint256 _price) returns (uint256 propertyId)",
  "function transferOwnership(uint256 _propertyId, address _newOwner)",
  "function getProperty(uint256 _propertyId) view returns (tuple(uint256 id, string propertyAddress, address owner, uint256 price, uint256 registeredAt))",
  "function propertyCount() view returns (uint256)",
  "event PropertyRegistered(uint256 indexed propertyId, string propertyAddress, address indexed owner, uint256 price)",
  "event OwnershipTransferred(uint256 indexed propertyId, address indexed previousOwner, address indexed newOwner)",
  "error PropertyNotFound(uint256 propertyId)",
  "error NotPropertyOwner(uint256 propertyId, address caller)",
  "error EmptyPropertyAddress()",
  "error ZeroPrice()",
  "error InvalidNewOwner()",
] as const;

export interface OnChainProperty {
  id: bigint;
  propertyAddress: string;
  owner: string;
  price: bigint;
  registeredAt: bigint;
}
