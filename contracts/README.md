# Property Registry dApp Boilerplate

A modern, full-stack Web3 dApp boilerplate featuring **Hardhat v3 (Mocha + Ethers.js)** for smart contracts and **Vite + React + TypeScript + Tailwind CSS** for the frontend, configured for local development and deployment to the **Polygon Amoy testnet**.

---

## Tech Stack

- **Smart Contract Framework**: [Hardhat v3](https://hardhat.org/) with `@nomicfoundation/hardhat-toolbox-mocha-ethers`
- **Testing**: Mocha & Chai with `@nomicfoundation/hardhat-ethers-chai-matchers`
- **Deployment**: Hardhat Ignition declarative deployment modules
- **Target Network**: Polygon Amoy Testnet (Chain ID `80002`) & Localhost (Chain ID `31337`)
- **Frontend**: [Vite](https://vite.dev/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Web3 Interaction**: [Ethers.js v6](https://docs.ethers.org/v6/) & [Lucide Icons](https://lucide.dev/)

---

## Project Structure

```
.
├── contracts/
│   └── PropertyRegistry.sol     # Smart contract managing Property objects
├── test/
│   └── PropertyRegistry.ts      # 12 Mocha + Ethers.js unit & integration tests
├── ignition/
│   └── modules/
│       └── PropertyRegistry.ts  # Hardhat Ignition deployment module
├── scripts/
│   └── sync-frontend.mjs        # Synchronizes ABI and deployed addresses to frontend
├── frontend/                    # Vite + React + Tailwind CSS frontend
│   ├── src/
│   │   ├── contracts/           # Generated contract ABI and address mappings
│   │   ├── App.tsx              # Full-featured dApp interface
│   │   ├── index.css            # Tailwind CSS styling
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── hardhat.config.ts            # Hardhat 3 configuration (Amoy, Localhost, Sepolia)
└── package.json                 # Top-level workspace scripts
```

---

## Smart Contract: `PropertyRegistry.sol`

The `PropertyRegistry` smart contract provides decentralized real estate / property deed tracking:

- **Struct `Property`**:
  - `string propertyAddress`: Physical property address / location description
  - `address owner`: Current owner wallet address
  - `uint256 price`: Valuation / price in Wei
- **Core Functions**:
  - `registerProperty(string _address, uint256 _price)`: Creates a new property record and emits `PropertyCreated`.
  - `transferOwnership(uint256 _propertyId, address _newOwner)`: Transfers ownership. Enforces the `onlyOwner` modifier and reverts with custom error `NotOwner()` if called by anyone else.
  - `getProperty(uint256 _propertyId)`: Returns the `Property` struct.

---

## Quick Start

### 1. Install Dependencies

From the project root:

```bash
# Install root (Hardhat) dependencies
npm install

# Install frontend dependencies
npm --prefix frontend install
```

### 2. Run Smart Contract Tests

Hardhat v3 runs the Mocha + Ethers.js test suite verifying property registration, data retrieval, and ownership transfer permissions:

```bash
npm test
```

### 3. Compile Contracts & Sync Frontend

Compile the Solidity contracts and automatically copy the ABI and address mappings to the frontend:

```bash
npm run compile
npm run sync:frontend
```

---

## Local Development Workflow

To run a complete local node and interact with the contract locally:

### Step 1: Start Local Hardhat Node
```bash
npm run node
```
This boots a local JSON-RPC Ethereum blockchain at `http://127.0.0.1:8545` (Chain ID `31337`) with pre-funded test accounts.

### Step 2: Deploy to Localhost
In a new terminal:
```bash
npm run deploy:local
npm run sync:frontend
```

### Step 3: Start Vite Frontend
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Deploying to Polygon Amoy Testnet

### 1. Get Testnet POL
Get free Polygon Amoy testnet tokens from the official faucet:
- [Polygon Faucet](https://faucet.polygon.technology/)

### 2. Configure Credentials
Hardhat 3 uses Configuration Variables. Set your Amoy private key (and optionally RPC URL):

```bash
# Set your deployment account's private key (without 0x prefix or with 0x)
npx hardhat keystore set POLYGON_AMOY_PRIVATE_KEY

# Optional: override the default public RPC (https://rpc-amoy.polygon.technology/)
npx hardhat keystore set POLYGON_AMOY_RPC_URL
```

Alternatively, you can export them as environment variables:
```bash
export POLYGON_AMOY_PRIVATE_KEY="your_private_key"
export POLYGON_AMOY_RPC_URL="https://rpc-amoy.polygon.technology/"
```

### 3. Deploy Contract
```bash
npm run deploy:amoy
npm run sync:frontend
```

The sync script reads `ignition/deployments/chain-80002/deployed_addresses.json` and automatically sets the contract address for Chain ID `80002` in `frontend/src/contracts/addresses.ts`.

---

## MetaMask Network Setup (Polygon Amoy)

The frontend includes a **1-click "Switch to Amoy"** button that prompts MetaMask to add or switch to the network automatically. For manual reference:

| Setting | Value |
| --- | --- |
| **Network Name** | Polygon Amoy Testnet |
| **New RPC URL** | `https://rpc-amoy.polygon.technology/` |
| **Chain ID** | `80002` |
| **Currency Symbol** | `POL` |
| **Block Explorer URL** | `https://amoy.polygonscan.com/` |

---

## Available NPM Scripts

| Command | Action |
| --- | --- |
| `npm run compile` | Compiles contracts using solc 0.8.34 |
| `npm test` | Runs the 12-assertion Mocha + Ethers test suite |
| `npm run node` | Starts a local Hardhat JSON-RPC node |
| `npm run deploy:local` | Deploys `PropertyRegistry` to local node |
| `npm run deploy:amoy` | Deploys `PropertyRegistry` to Polygon Amoy |
| `npm run sync:frontend` | Syncs contract ABI and addresses to frontend |
| `npm run dev` | Starts the Vite React development server |
| `npm run build:frontend` | Builds production frontend bundles with Vite |
| `npm run build` | Compiles contracts, syncs ABI, and builds frontend |
