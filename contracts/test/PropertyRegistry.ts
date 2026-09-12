import { expect } from "chai";
import { network } from "hardhat";

// Create an isolated network connection with ethers
const { ethers } = await network.create();

describe("PropertyRegistry", function () {
  async function deployPropertyRegistryFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const propertyRegistry = await ethers.deployContract("PropertyRegistry");
    return { propertyRegistry, owner, alice, bob };
  }

  describe("Property Registration", function () {
    it("Should start with propertyCounter at 0", async function () {
      const { propertyRegistry } = await deployPropertyRegistryFixture();
      expect(await propertyRegistry.propertyCounter()).to.equal(0n);
    });

    it("Should register a property and increment propertyCounter", async function () {
      const { propertyRegistry, owner } = await deployPropertyRegistryFixture();

      const propertyAddress = "123 Crypto Boulevard, Blockchain City";
      const price = ethers.parseEther("2.5");

      const tx = await propertyRegistry.registerProperty(propertyAddress, price);
      await tx.wait();

      expect(await propertyRegistry.propertyCounter()).to.equal(1n);

      const property = await propertyRegistry.properties(0n);
      expect(property.propertyAddress).to.equal(propertyAddress);
      expect(property.owner).to.equal(owner.address);
      expect(property.price).to.equal(price);
    });

    it("Should emit PropertyCreated event with correct parameters", async function () {
      const { propertyRegistry, owner } = await deployPropertyRegistryFixture();

      const propertyAddress = "456 Decentralized Avenue";
      const price = ethers.parseEther("1.0");

      await expect(propertyRegistry.registerProperty(propertyAddress, price))
        .to.emit(propertyRegistry, "PropertyCreated")
        .withArgs(0n, owner.address, price);
    });

    it("Should revert with EmptyPropertyAddress if address string is empty", async function () {
      const { propertyRegistry } = await deployPropertyRegistryFixture();

      await expect(
        propertyRegistry.registerProperty("", ethers.parseEther("1.0"))
      ).to.be.revertedWithCustomError(propertyRegistry, "EmptyPropertyAddress");
    });

    it("Should revert with InvalidPrice if price is zero", async function () {
      const { propertyRegistry } = await deployPropertyRegistryFixture();

      await expect(
        propertyRegistry.registerProperty("Valid Address", 0n)
      ).to.be.revertedWithCustomError(propertyRegistry, "InvalidPrice");
    });

    it("Should allow multiple registrations with sequential IDs and different owners", async function () {
      const { propertyRegistry, owner, alice } = await deployPropertyRegistryFixture();

      // Owner registers property 0
      await propertyRegistry.connect(owner).registerProperty("Villa Alpha", ethers.parseEther("5.0"));

      // Alice registers property 1
      await propertyRegistry.connect(alice).registerProperty("Condo Beta", ethers.parseEther("3.0"));

      expect(await propertyRegistry.propertyCounter()).to.equal(2n);

      const prop0 = await propertyRegistry.getProperty(0n);
      expect(prop0.propertyAddress).to.equal("Villa Alpha");
      expect(prop0.owner).to.equal(owner.address);
      expect(prop0.price).to.equal(ethers.parseEther("5.0"));

      const prop1 = await propertyRegistry.getProperty(1n);
      expect(prop1.propertyAddress).to.equal("Condo Beta");
      expect(prop1.owner).to.equal(alice.address);
      expect(prop1.price).to.equal(ethers.parseEther("3.0"));
    });
  });

  describe("Returning the Property (getProperty)", function () {
    it("Should accurately return the Property struct via getProperty", async function () {
      const { propertyRegistry, owner } = await deployPropertyRegistryFixture();

      const propertyAddress = "789 Web3 Lane";
      const price = ethers.parseEther("10.0");

      await propertyRegistry.registerProperty(propertyAddress, price);

      const property = await propertyRegistry.getProperty(0n);
      expect(property.propertyAddress).to.equal(propertyAddress);
      expect(property.owner).to.equal(owner.address);
      expect(property.price).to.equal(price);
    });

    it("Should revert with PropertyNotFound for an uninitialized or out-of-bounds property ID", async function () {
      const { propertyRegistry } = await deployPropertyRegistryFixture();

      await expect(
        propertyRegistry.getProperty(999n)
      ).to.be.revertedWithCustomError(propertyRegistry, "PropertyNotFound");
    });
  });

  describe("Ownership Transfer and Access Control", function () {
    it("Should allow the owner to successfully transfer property ownership", async function () {
      const { propertyRegistry, owner, alice } = await deployPropertyRegistryFixture();

      await propertyRegistry.registerProperty("777 Polygon Street", ethers.parseEther("4.0"));

      const tx = await propertyRegistry.transferOwnership(0n, alice.address);
      await tx.wait();

      const property = await propertyRegistry.getProperty(0n);
      expect(property.owner).to.equal(alice.address);
    });

    it("Should emit PropertyTransferred event upon successful transfer", async function () {
      const { propertyRegistry, owner, alice } = await deployPropertyRegistryFixture();

      await propertyRegistry.registerProperty("777 Polygon Street", ethers.parseEther("4.0"));

      await expect(propertyRegistry.transferOwnership(0n, alice.address))
        .to.emit(propertyRegistry, "PropertyTransferred")
        .withArgs(0n, owner.address, alice.address);
    });

    it("Should revert with custom error PropertyNotFound when attempting to transfer an uncreated property", async function () {
      const { propertyRegistry, owner, alice } = await deployPropertyRegistryFixture();

      await expect(
        propertyRegistry.connect(owner).transferOwnership(99n, alice.address)
      ).to.be.revertedWithCustomError(propertyRegistry, "PropertyNotFound");
    });

    it("Should revert with custom error InvalidNewOwner when transferring to address(0)", async function () {
      const { propertyRegistry } = await deployPropertyRegistryFixture();

      await propertyRegistry.registerProperty("Zero Address Test", ethers.parseEther("1.0"));

      await expect(
        propertyRegistry.transferOwnership(0n, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(propertyRegistry, "InvalidNewOwner");
    });

    it("Should revert with custom error InvalidNewOwner when transferring to the current owner (self-transfer)", async function () {
      const { propertyRegistry, owner } = await deployPropertyRegistryFixture();

      await propertyRegistry.registerProperty("Self Transfer Test", ethers.parseEther("1.0"));

      await expect(
        propertyRegistry.transferOwnership(0n, owner.address)
      ).to.be.revertedWithCustomError(propertyRegistry, "InvalidNewOwner");
    });

    it("Should revert with custom error NotOwner when a non-owner attempts to transfer", async function () {
      const { propertyRegistry, owner, alice, bob } = await deployPropertyRegistryFixture();

      // Owner registers property 0
      await propertyRegistry.connect(owner).registerProperty("888 Security Way", ethers.parseEther("8.0"));

      // Alice is not the owner, attempts to transfer to Bob
      await expect(
        propertyRegistry.connect(alice).transferOwnership(0n, bob.address)
      ).to.be.revertedWithCustomError(propertyRegistry, "NotOwner");

      // Verify the owner remains unchanged
      const property = await propertyRegistry.getProperty(0n);
      expect(property.owner).to.equal(owner.address);
    });

    it("Should allow the new owner to transfer again, while the old owner can no longer transfer", async function () {
      const { propertyRegistry, owner, alice, bob } = await deployPropertyRegistryFixture();

      // Owner registers property
      await propertyRegistry.registerProperty("Chained Transfer Test", ethers.parseEther("1.5"));

      // Owner transfers to Alice
      await propertyRegistry.transferOwnership(0n, alice.address);

      // Old owner (owner) can no longer transfer
      await expect(
        propertyRegistry.connect(owner).transferOwnership(0n, bob.address)
      ).to.be.revertedWithCustomError(propertyRegistry, "NotOwner");

      // New owner (Alice) can transfer to Bob
      await expect(
        propertyRegistry.connect(alice).transferOwnership(0n, bob.address)
      )
        .to.emit(propertyRegistry, "PropertyTransferred")
        .withArgs(0n, alice.address, bob.address);

      // Final owner is Bob
      const property = await propertyRegistry.getProperty(0n);
      expect(property.owner).to.equal(bob.address);
    });
  });
});
