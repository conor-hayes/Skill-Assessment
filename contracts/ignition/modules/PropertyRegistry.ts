import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PropertyRegistryModule", (m) => {
  const propertyRegistry = m.contract("PropertyRegistry");

  return { propertyRegistry };
});
