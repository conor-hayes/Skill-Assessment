# Block Sherpa Submission and Loom Guide

## Is the project finished?

The source code is complete for the assessment: the Solidity registry, its tests, the deployment script, and the frontend integration are included. The only remaining work is **your live setup**: install dependencies, deploy using your own Amoy wallet, add the public contract address to the frontend, and record the demonstration.

## 1. Apply the overlay

This folder is an overlay, not the original REChain repository. Copy it onto the original repository using:

```powershell
powershell -ExecutionPolicy Bypass -File .\APPLY_TO_LOCAL_PROJECT.ps1
```

Or manually merge the `blockchain` folder and the listed frontend files. Do not copy any `node_modules` folder.

## 2. Test the smart contract

Open a normal PowerShell terminal (not necessarily an administrator terminal):

```powershell
cd "E:\My Projects\Smart Contract Developer Test - sahan viranga\blockchain"
npm.cmd install
npm.cmd test
```

Expected result: every `PropertyRegistry` test passes. If PowerShell blocks `npm`, use `npm.cmd`, as shown above.

What the tests prove:

- A registration persists the address, caller/owner, price, and new ID.
- Only the recorded owner can call `transferOwnership`.
- Invalid IDs, zero prices, blank addresses, and a zero-address recipient revert.

## 3. Deploy safely to Polygon Amoy

You need a wallet with a small amount of **test POL**. Create a dedicated test wallet; never reuse a wallet containing real funds.

```powershell
cd "E:\My Projects\Smart Contract Developer Test - sahan viranga\blockchain"
npx hardhat keystore set AMOY_RPC_URL
# Enter: https://polygon-amoy.drpc.org
npx hardhat keystore set AMOY_PRIVATE_KEY
# Enter your dedicated TESTNET wallet private key when prompted
npm.cmd run deploy:amoy
```

The script prints the deployed contract address and an Amoy PolygonScan link. Save the address, but never share the private key or record it on video.

## 4. Configure and run the frontend

Create `frontend/.env.local` using `frontend/.env.example` as a template:

```env
VITE_PROPERTY_REGISTRY_ADDRESS=0xYourDeployedContractAddress
VITE_AMOY_RPC_URL=https://polygon-amoy.drpc.org
```

Then install and start the original frontend:

```powershell
cd "E:\My Projects\Smart Contract Developer Test - sahan viranga\frontend"
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

Open a property detail page. Connect MetaMask (or another injected wallet), accept the Polygon Amoy network switch, click **Register on Blockchain**, and approve the transaction. When confirmed, the card shows the registry ID and transaction link.

## 5. Hosting (optional)

Hosting is not required by the assessment. A localhost demonstration is acceptable and usually safer.

If you host it, deploy only the frontend static build to Vercel or Netlify. Add the same two `VITE_` values as build-time environment variables and rebuild. Those variables are public configuration; **do not** put a private key in a `VITE_` variable. The existing backend/API must also be reachable from the hosted frontend or property data will not load.

## 6. Recommended 10–12 minute Loom plan

1. **0:00–0:40 — Introduction.** “I built a Property Registry for the REChain property detail page, deployed to Polygon Amoy, with an ethers v6 wallet flow.”
2. **0:40–3:30 — Contract.** Show `PropertyRegistry.sol`. Explain the `Property` struct, incrementing `propertyCount`, mapping, events, and `getProperty`.
3. **3:30–4:30 — Security decisions.** Explain custom errors, blank/zero-price checks, `address(0)` check, and `msg.sender == property.owner` authorization.
4. **4:30–6:00 — Tests.** Run `npm.cmd test`. Highlight register, transfer, and non-owner rejection. Mention the additional boundary tests.
5. **6:00–7:15 — Deployment evidence.** Show the deployment output and the contract address page on Amoy PolygonScan. Do not expose the keystore prompt or any private key.
6. **7:15–10:15 — Frontend demo.** Open a listing, point out its Not Registered status, click Register, approve in the wallet, wait for confirmation, then open the transaction link. Refresh to show the UI checks the on-chain record again.
7. **10:15–11:30 — Architecture and trade-off.** Explain that the app uses MongoDB IDs but the supplied contract issues numeric IDs. Because no backend was requested, the frontend stores the public mapping of app ID → chain ID + transaction hash in localStorage; the contract is still verified on refresh. In production, persist this mapping server-side or pass a stable external ID to the contract.
8. **11:30–12:00 — Close.** Mention Polygon Amoy, ethers v6, no private keys in the UI, and the main contract limitations: this is a registry/proof-of-record, not legal title transfer or a payment escrow.

## Tricky patterns worth explaining

- `msg.sender` is the wallet that signed the transaction, so it is used as the property’s initial owner.
- The frontend waits for `transaction.wait()` because a wallet popup means a transaction was submitted, not necessarily mined.
- Ethers uses `bigint` for Solidity integers. The UI converts the numeric price before calling `registerProperty`.
- The property ID comes from the `PropertyRegistered` event in the receipt. This is reliable even though UI transaction calls do not directly return Solidity return values.
- The frontend uses a read-only RPC provider for checking and a browser-wallet signer only for writing. This avoids asking for wallet access just to show status.
