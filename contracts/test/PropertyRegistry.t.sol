// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {PropertyRegistry} from "../src/PropertyRegistry.sol";

contract PropertyRegistryTest is Test {
    // solc 0.8.19 doesn't support qualified cross-contract event emmision
    event PropertyRegistered(uint256 indexed propertyId, string propertyAddress, address indexed owner, uint256 price);
    event OwnershipTransferred(uint256 indexed propertyId, address indexed previousOwner, address indexed newOwner);

    PropertyRegistry internal registry;

    address internal alice;
    address internal bob;
    address internal carol;

    string internal constant ADDR_1 = "26/1 N N Bagchi Road";
    uint256 internal constant PRICE_1 = 500_000;
    uint256 internal constant NONEXISTENT_ID = 999;

    function setUp() public {
        registry = new PropertyRegistry();
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        carol = makeAddr("carol");
    }

    function test_RegisterProperty_StoresDataAndReturnsId() public {
        vm.prank(alice);
        uint256 id = registry.registerProperty(ADDR_1, PRICE_1);

        assertEq(id, 1, "first registration should get id 1");
        assertEq(registry.propertyCount(), 1, "propertyCount should track total registrations");

        PropertyRegistry.Property memory prop = registry.getProperty(id);
        assertEq(prop.id, 1);
        assertEq(prop.propertyAddress, ADDR_1);
        assertEq(prop.owner, alice, "owner should be the caller, not an explicit param");
        assertEq(prop.price, PRICE_1);
        assertEq(prop.registeredAt, block.timestamp);
    }

    function test_RegisterProperty_EmitsPropertyRegistered() public {
        vm.expectEmit(true, true, false, true, address(registry));
        emit PropertyRegistered(1, ADDR_1, alice, PRICE_1);

        vm.prank(alice);
        registry.registerProperty(ADDR_1, PRICE_1);
    }

    function test_RegisterProperty_IncrementsIdAcrossCallersInOrder() public {
        vm.prank(alice);
        uint256 id1 = registry.registerProperty(ADDR_1, PRICE_1);

        vm.prank(bob);
        uint256 id2 = registry.registerProperty("456 Oak Ave", 750_000);

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(registry.propertyCount(), 2);
        assertEq(registry.getProperty(id1).owner, alice);
        assertEq(registry.getProperty(id2).owner, bob);
    }

    function test_RegisterProperty_RevertsOnEmptyAddress() public {
        vm.expectRevert(PropertyRegistry.EmptyPropertyAddress.selector);
        registry.registerProperty("", PRICE_1);
    }

    function test_RegisterProperty_RevertsOnZeroPrice() public {
        vm.expectRevert(PropertyRegistry.ZeroPrice.selector);
        registry.registerProperty(ADDR_1, 0);
    }

    function testFuzz_RegisterProperty(string memory addr, uint256 price) public {
        vm.assume(bytes(addr).length > 0);
        price = bound(price, 1, type(uint256).max);

        vm.prank(alice);
        uint256 id = registry.registerProperty(addr, price);

        PropertyRegistry.Property memory prop = registry.getProperty(id);
        assertEq(prop.propertyAddress, addr);
        assertEq(prop.price, price);
        assertEq(prop.owner, alice);
    }

    // transferOwnership

    function _registerAsAlice() internal returns (uint256 id) {
        vm.prank(alice);
        id = registry.registerProperty(ADDR_1, PRICE_1);
    }

    function test_TransferOwnership_UpdatesOwner() public {
        uint256 id = _registerAsAlice();

        vm.prank(alice);
        registry.transferOwnership(id, bob);

        assertEq(registry.getProperty(id).owner, bob);
    }

    function test_TransferOwnership_EmitsOwnershipTransferred() public {
        uint256 id = _registerAsAlice();

        vm.expectEmit(true, true, true, false, address(registry));
        emit OwnershipTransferred(id, alice, bob);

        vm.prank(alice);
        registry.transferOwnership(id, bob);
    }

    /// @dev only the current owner may transfer.
    function test_TransferOwnership_RevertsWhenCallerIsNotOwner() public {
        uint256 id = _registerAsAlice();

        vm.expectRevert(abi.encodeWithSelector(PropertyRegistry.NotPropertyOwner.selector, id, bob));
        vm.prank(bob);
        registry.transferOwnership(id, carol);
        assertEq(registry.getProperty(id).owner, alice);
    }

    function test_TransferOwnership_NewOwnerCanTransferAgain() public {
        uint256 id = _registerAsAlice();

        vm.prank(alice);
        registry.transferOwnership(id, bob);

        // alice no longer owns it
        vm.expectRevert(abi.encodeWithSelector(PropertyRegistry.NotPropertyOwner.selector, id, alice));
        vm.prank(alice);
        registry.transferOwnership(id, carol);

        // but bob, the new owner, can
        vm.prank(bob);
        registry.transferOwnership(id, carol);
        assertEq(registry.getProperty(id).owner, carol);
    }

    function test_TransferOwnership_RevertsOnNonexistentProperty() public {
        vm.expectRevert(abi.encodeWithSelector(PropertyRegistry.PropertyNotFound.selector, NONEXISTENT_ID));
        registry.transferOwnership(NONEXISTENT_ID, bob);
    }

    function test_TransferOwnership_RevertsOnZeroAddressNewOwner() public {
        uint256 id = _registerAsAlice();

        vm.expectRevert(PropertyRegistry.InvalidNewOwner.selector);
        vm.prank(alice);
        registry.transferOwnership(id, address(0));
    }

    function test_TransferOwnership_RevertsOnSelfTransfer() public {
        uint256 id = _registerAsAlice();

        vm.expectRevert(PropertyRegistry.InvalidNewOwner.selector);
        vm.prank(alice);
        registry.transferOwnership(id, alice);
    }

    function testFuzz_TransferOwnership_OnlyOwnerSucceeds(address caller, address newOwner) public {
        uint256 id = _registerAsAlice();
        vm.assume(caller != alice);
        vm.assume(newOwner != address(0));

        vm.expectRevert(abi.encodeWithSelector(PropertyRegistry.NotPropertyOwner.selector, id, caller));
        vm.prank(caller);
        registry.transferOwnership(id, newOwner);
    }
    // getProperty

    function test_GetProperty_RevertsForNonexistentId() public {
        vm.expectRevert(abi.encodeWithSelector(PropertyRegistry.PropertyNotFound.selector, 1));
        registry.getProperty(1);
    }

    function test_GetProperty_RevertsForIdZero() public {
        _registerAsAlice();

        vm.expectRevert(abi.encodeWithSelector(PropertyRegistry.PropertyNotFound.selector, 0));
        registry.getProperty(0);
    }

    function test_GetProperty_IsReadableByAnyCaller() public {
        uint256 id = _registerAsAlice();

        // getProperty is a view
        vm.prank(carol);
        PropertyRegistry.Property memory prop = registry.getProperty(id);
        assertEq(prop.owner, alice);
    }
}
