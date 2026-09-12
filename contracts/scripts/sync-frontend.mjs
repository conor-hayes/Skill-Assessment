import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const artifactPath = path.join(
  rootDir,
  "artifacts",
  "contracts",
  "PropertyRegistry.sol",
  "PropertyRegistry.json"
);

// Check both sibling ../frontend and child ./frontend
const candidateDirs = [
  path.join(rootDir, "..", "frontend", "src", "contracts"),
  path.join(rootDir, "frontend", "src", "contracts"),
];

const targetFrontendDir =
  candidateDirs.find((d) => fs.existsSync(path.dirname(d))) || candidateDirs[0];

if (!fs.existsSync(artifactPath)) {
  console.error("Artifact not found at:", artifactPath);
  console.error("Please run `npx hardhat build` first.");
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

if (!fs.existsSync(targetFrontendDir)) {
  fs.mkdirSync(targetFrontendDir, { recursive: true });
}

// Write ABI
const frontendArtifactPath = path.join(targetFrontendDir, "PropertyRegistry.json");
fs.writeFileSync(
  frontendArtifactPath,
  JSON.stringify({ abi: artifact.abi }, null, 2),
  "utf8"
);
console.log(`[Sync] ABI exported to: ${frontendArtifactPath}`);

// Try to check ignition deployments
let amoyAddress = "0x279A6dfaBAC65dC52196F7744Ee0585A18ecBcBf";
let localhostAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const amoyDeploymentsPath = path.join(
  rootDir,
  "ignition",
  "deployments",
  "chain-80002",
  "deployed_addresses.json"
);
if (fs.existsSync(amoyDeploymentsPath)) {
  try {
    const deployed = JSON.parse(fs.readFileSync(amoyDeploymentsPath, "utf8"));
    if (deployed["PropertyRegistryModule#PropertyRegistry"]) {
      amoyAddress = deployed["PropertyRegistryModule#PropertyRegistry"];
    }
  } catch (e) {}
}

const localDeploymentsPath = path.join(
  rootDir,
  "ignition",
  "deployments",
  "chain-31337",
  "deployed_addresses.json"
);
if (fs.existsSync(localDeploymentsPath)) {
  try {
    const deployed = JSON.parse(fs.readFileSync(localDeploymentsPath, "utf8"));
    if (deployed["PropertyRegistryModule#PropertyRegistry"]) {
      localhostAddress = deployed["PropertyRegistryModule#PropertyRegistry"];
    }
  } catch (e) {}
}

const addressesContent = `// Auto-generated addresses for PropertyRegistry
export const CONTRACT_ADDRESSES: Record<number, string> = {
  // Polygon Amoy Testnet
  80002: "${amoyAddress}",
  // Hardhat Localhost
  31337: "${localhostAddress}",
};

export const DEFAULT_CHAIN_ID = 80002;

export function getContractAddress(chainId?: number): string {
  if (!chainId) return CONTRACT_ADDRESSES[DEFAULT_CHAIN_ID];
  return CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[DEFAULT_CHAIN_ID];
}
`;

const addressesPath = path.join(targetFrontendDir, "addresses.ts");
fs.writeFileSync(addressesPath, addressesContent, "utf8");
console.log(`[Sync] Contract addresses written to: ${addressesPath}`);
