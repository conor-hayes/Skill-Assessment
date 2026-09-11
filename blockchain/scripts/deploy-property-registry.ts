import { network } from "hardhat";

const connection = await network.connect();
const { ethers } = connection;

console.log("Deploying PropertyRegistry...");

const registry = await ethers.deployContract("PropertyRegistry");
await registry.waitForDeployment();

const address = await registry.getAddress();

console.log("PropertyRegistry deployed successfully.");
console.log(`Contract address: ${address}`);
console.log(`Explorer: https://amoy.polygonscan.com/address/${address}`);
console.log("\nCopy this address into frontend/.env.local as:");
console.log(`VITE_PROPERTY_REGISTRY_ADDRESS=${address}`);
