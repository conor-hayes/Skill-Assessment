# Smart Contract Developer Technical Assessment

## Candidate

Sahan Viranga

## Implementation scope

This overlay implements the requested Property Registry smart contract and integrates it into the existing REChain property details page without changing the backend.

### Smart contract

`blockchain/contracts/PropertyRegistry.sol`

Implemented features:

- Register a property with a human-readable address, caller as owner, and price
- Transfer ownership to another wallet
- Restrict transfers to the current owner
- Public property lookup
- Registration and transfer events
- Input and existence validation using custom errors
- Optimized external string parameter using `calldata`

### Tests

`blockchain/test/PropertyRegistry.ts`

Coverage includes:

1. Successful property registration
2. Stored property details
3. Successful owner transfer
4. Rejection of unauthorized transfer
5. Rejection of unknown property IDs
6. Rejection of empty addresses
7. Rejection of zero prices
8. Rejection of zero-address transfers

### Frontend

The blockchain integration is added to the existing property details page.

New files:

- `frontend/src/blockchain/propertyRegistryAbi.ts`
- `frontend/src/blockchain/propertyRegistry.ts`
- `frontend/src/components/property-details/BlockchainRegistryCard.tsx`

Updated files:

- `frontend/src/pages/PropertyDetailsPage.tsx`
- `frontend/package.json`

The UI provides:

- On-chain registration status
- Register on Blockchain button
- Polygon Amoy network switching/adding
- Wallet transaction flow
- Pending/success/error feedback
- Contract-generated property ID
- Transaction hash
- PolygonScan transaction link

## Architecture decision: backend ID vs on-chain ID

The supplied smart-contract API generates numeric property IDs, while the existing application uses MongoDB `_id` values. Because the assessment explicitly requests no backend work, this implementation stores the mapping from the application property ID to the generated on-chain property ID and transaction hash in browser `localStorage`.

For a production implementation, the on-chain property ID and transaction hash should be persisted in the application's database, or the contract should include a stable external property identifier.

## Security and code-quality decisions

- No deployment private key is included in source code.
- No private key is exposed through Vite environment variables.
- Hardhat configuration variables/keystore are used for deployment secrets.
- A zero-address transfer is rejected.
- A non-owner cannot transfer a property.
- Invalid property IDs are rejected explicitly.
- Blockchain interaction is separated from the page component.
- UI state covers checking, pending, success, and error scenarios.
- Contract events provide an auditable registration/transfer trail.

## Local setup

From the project root:

```powershell
cd blockchain
npm install
npm test
```

Then install the new frontend dependency:

```powershell
cd ..\frontend
npm install
npm run build
```

## Deploy to Polygon Amoy

Configure the Hardhat keystore:

```powershell
cd ..\blockchain
npx hardhat keystore set AMOY_RPC_URL
```

Value:

```text
https://polygon-amoy.drpc.org
```

Then:

```powershell
npx hardhat keystore set AMOY_PRIVATE_KEY
```

Use a dedicated TESTNET wallet private key. Do not commit it.

Deploy:

```powershell
npm run deploy:amoy
```

Create `frontend/.env.local`:

```env
VITE_PROPERTY_REGISTRY_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
VITE_AMOY_RPC_URL=https://polygon-amoy.drpc.org
```

Restart the frontend dev server after changing environment variables.

## Final verification

Before recording the Loom video, confirm:

- `npm test` passes in `blockchain`
- `npm run build` passes in `frontend`
- Wallet is on Polygon Amoy
- Test wallet has enough test POL for gas
- Property detail page initially shows Not Registered
- Registration opens the wallet
- Pending state is visible
- Successful registration shows Registered
- Transaction hash opens on Amoy PolygonScan
- Refresh preserves the registration status in the same browser
