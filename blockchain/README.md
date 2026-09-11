# Property Registry Smart Contract

Technical-assessment smart contract for the REChain property platform.

## Requirements

- Node.js 22.10+ recommended for Hardhat 3
- npm
- A Web3 wallet funded with test POL on Polygon Amoy for deployment

## Install

```powershell
cd blockchain
npm install
```

## Compile and test

```powershell
npm run compile
npm test
```

The tests cover:

- Property registration
- Property details
- Ownership transfer
- Owner-only transfer authorization
- Invalid property IDs
- Empty addresses
- Zero prices
- Zero-address transfers

## Polygon Amoy

- Chain ID: `80002`
- Gas token: `POL`
- RPC: `https://polygon-amoy.drpc.org`
- Explorer: `https://amoy.polygonscan.com`

## Secure deployment configuration

Do not put a private key in source code or the frontend.

Store deployment values using Hardhat's keystore:

```powershell
npx hardhat keystore set AMOY_RPC_URL
```

Enter:

```text
https://polygon-amoy.drpc.org
```

Then:

```powershell
npx hardhat keystore set AMOY_PRIVATE_KEY
```

Enter the private key for a dedicated TESTNET wallet only.

Deploy:

```powershell
npm run deploy:amoy
```

After deployment, copy the printed contract address into:

```text
frontend/.env.local
```

as:

```text
VITE_PROPERTY_REGISTRY_ADDRESS=0x...
```
