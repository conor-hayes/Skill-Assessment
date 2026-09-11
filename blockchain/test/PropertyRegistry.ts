import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("PropertyRegistry", function () {
  async function deployRegistry() {
    const [owner, newOwner, otherAccount] = await ethers.getSigners();
    const registry = await ethers.deployContract("PropertyRegistry");
    await registry.waitForDeployment();

    return { registry, owner, newOwner, otherAccount };
  }

  it("registers a property and stores its details", async function () {
    const { registry, owner } = await deployRegistry();
    const propertyAddress = "12 Ocean Avenue, Colombo";
    const price = 25_000_000n;

    await expect(registry.registerProperty(propertyAddress, price))
      .to.emit(registry, "PropertyRegistered")
      .withArgs(1n, owner.address, propertyAddress, price);

    const property = await registry.getProperty(1n);

    expect(property.propertyAddress).to.equal(propertyAddress);
    expect(property.owner).to.equal(owner.address);
    expect(property.price).to.equal(price);
    expect(property.exists).to.equal(true);
    expect(await registry.propertyCount()).to.equal(1n);
  });

  it("allows the owner to transfer ownership", async function () {
    const { registry, owner, newOwner } = await deployRegistry();

    await registry.registerProperty("45 Lake Road, Colombo", 15_000_000n);

    await expect(
      registry.connect(owner).transferOwnership(1n, newOwner.address),
    )
      .to.emit(registry, "OwnershipTransferred")
      .withArgs(1n, owner.address, newOwner.address);

    const property = await registry.getProperty(1n);
    expect(property.owner).to.equal(newOwner.address);
  });

  it("rejects an ownership transfer from a non-owner", async function () {
    const { registry, newOwner, otherAccount } = await deployRegistry();

    await registry.registerProperty("90 Hill Street, Colombo", 30_000_000n);

    await expect(
      registry.connect(otherAccount).transferOwnership(1n, newOwner.address),
    ).to.be.revertedWithCustomError(registry, "NotPropertyOwner");
  });

  it("rejects unknown property IDs", async function () {
    const { registry } = await deployRegistry();

    await expect(registry.getProperty(999n))
      .to.be.revertedWithCustomError(registry, "PropertyNotFound")
      .withArgs(999n);
  });

  it("rejects an empty property address", async function () {
    const { registry } = await deployRegistry();

    await expect(
      registry.registerProperty("", 100n),
    ).to.be.revertedWithCustomError(registry, "EmptyPropertyAddress");
  });

  it("rejects a zero price", async function () {
    const { registry } = await deployRegistry();

    await expect(
      registry.registerProperty("10 Test Street", 0n),
    ).to.be.revertedWithCustomError(registry, "InvalidPrice");
  });

  it("rejects transfers to the zero address", async function () {
    const { registry } = await deployRegistry();

    await registry.registerProperty("10 Test Street", 100n);

    await expect(
      registry.transferOwnership(1n, ethers.ZeroAddress),
    ).to.be.revertedWithCustomError(registry, "InvalidNewOwner");
  });
});
