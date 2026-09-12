// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title PropertyRegistry
/// @notice Minimal on-chain registry for real-estate listings: registration,
///         ownership transfer, and public read access to property records.
/// @dev Registration is permissionless, any address may register a property
///      and becomes its owner.
contract PropertyRegistry {
    struct Property {
        uint256 id;
        string propertyAddress;
        address owner;
        uint256 price;
        uint256 registeredAt;
    }

    /// @dev propertyId => Property. IDs are 1-indexed;
    mapping(uint256 => Property) private properties;

    /// @notice Total number of properties ever registered; also the ID of the
    ///         most recently registered property.
    uint256 public propertyCount;

    event PropertyRegistered(uint256 indexed propertyId, string propertyAddress, address indexed owner, uint256 price);

    event OwnershipTransferred(uint256 indexed propertyId, address indexed previousOwner, address indexed newOwner);

    error PropertyNotFound(uint256 propertyId);
    error NotPropertyOwner(uint256 propertyId, address caller);
    error EmptyPropertyAddress();
    error ZeroPrice();
    error InvalidNewOwner();

    /// @notice Registers a new property with the caller as its owner.
    /// @param _address Human-readable property address/location.
    /// @param _price Listed price
    /// @return propertyId The ID assigned to the newly registered property.
    function registerProperty(string calldata _address, uint256 _price) external returns (uint256 propertyId) {
        if (bytes(_address).length == 0) revert EmptyPropertyAddress();
        if (_price == 0) revert ZeroPrice();

        propertyId = ++propertyCount;

        properties[propertyId] = Property({
            id: propertyId, propertyAddress: _address, owner: msg.sender, price: _price, registeredAt: block.timestamp
        });

        emit PropertyRegistered(propertyId, _address, msg.sender, _price);
    }

    /// @notice Transfers ownership of a property.
    /// @param _propertyId ID of the property to transfer.
    /// @param _newOwner Address to transfer ownership to
    function transferOwnership(uint256 _propertyId, address _newOwner) external {
        address currentOwner = properties[_propertyId].owner;
        if (currentOwner == address(0)) revert PropertyNotFound(_propertyId);
        if (currentOwner != msg.sender) revert NotPropertyOwner(_propertyId, msg.sender);
        if (_newOwner == address(0) || _newOwner == msg.sender) revert InvalidNewOwner();

        properties[_propertyId].owner = _newOwner;

        emit OwnershipTransferred(_propertyId, msg.sender, _newOwner);
    }

    /// @notice This function returns the full record for a property. Reverts if it does not exist.
    /// @param _propertyId ID of the property to look up.
    function getProperty(uint256 _propertyId) external view returns (Property memory) {
        if (properties[_propertyId].owner == address(0)) revert PropertyNotFound(_propertyId);
        return properties[_propertyId];
    }
}
