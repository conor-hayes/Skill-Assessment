// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Property Registry
/// @notice Stores basic property details and supports owner-controlled transfers.
contract PropertyRegistry {
    struct Property {
        string propertyAddress;
        address owner;
        uint256 price;
        bool exists;
    }

    uint256 public propertyCount;

    mapping(uint256 => Property) private properties;

    error EmptyPropertyAddress();
    error InvalidPrice();
    error PropertyNotFound(uint256 propertyId);
    error NotPropertyOwner();
    error InvalidNewOwner();
    error OwnerUnchanged();

    event PropertyRegistered(
        uint256 indexed propertyId,
        address indexed owner,
        string propertyAddress,
        uint256 price
    );

    event OwnershipTransferred(
        uint256 indexed propertyId,
        address indexed previousOwner,
        address indexed newOwner
    );

    /// @notice Registers a new property owned by the caller.
    /// @param _address Human-readable property address.
    /// @param _price Property price represented as an integer.
    /// @return propertyId The newly assigned property identifier.
    function registerProperty(
        string calldata _address,
        uint256 _price
    ) external returns (uint256 propertyId) {
        if (bytes(_address).length == 0) revert EmptyPropertyAddress();
        if (_price == 0) revert InvalidPrice();

        propertyId = ++propertyCount;

        properties[propertyId] = Property({
            propertyAddress: _address,
            owner: msg.sender,
            price: _price,
            exists: true
        });

        emit PropertyRegistered(propertyId, msg.sender, _address, _price);
    }

    /// @notice Transfers a property to another wallet.
    /// @dev Only the current property owner can call this function.
    function transferOwnership(
        uint256 _propertyId,
        address _newOwner
    ) external {
        Property storage property = properties[_propertyId];

        if (!property.exists) revert PropertyNotFound(_propertyId);
        if (property.owner != msg.sender) revert NotPropertyOwner();
        if (_newOwner == address(0)) revert InvalidNewOwner();
        if (_newOwner == property.owner) revert OwnerUnchanged();

        address previousOwner = property.owner;
        property.owner = _newOwner;

        emit OwnershipTransferred(_propertyId, previousOwner, _newOwner);
    }

    /// @notice Returns all stored details for a registered property.
    function getProperty(
        uint256 _propertyId
    ) external view returns (Property memory) {
        Property memory property = properties[_propertyId];

        if (!property.exists) revert PropertyNotFound(_propertyId);

        return property;
    }
}
