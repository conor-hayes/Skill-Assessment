// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PropertyRegistry
 * @notice A decentralized registry for registering, transferring, and querying real estate property titles.
 * @dev Optimized for gas efficiency with calldata parameters, unchecked increments, single-slot reads, and custom errors.
 */
contract PropertyRegistry {
    /// @notice Defines the structure of an on-chain registered property
    struct Property {
        string propertyAddress;
        address owner;
        uint256 price;
    }

    /// @notice Tracks total registered properties (also serves as the next unique property ID)
    uint256 public propertyCounter;

    /// @notice Mapping from unique property ID to its Property record
    mapping(uint256 => Property) public properties;

    // --- Events ---
    event PropertyCreated(uint256 indexed propertyId, address indexed owner, uint256 price);
    event PropertyTransferred(uint256 indexed propertyId, address indexed oldOwner, address indexed newOwner);

    // --- Custom Errors (Gas-efficient, replacing string reverts) ---
    error NotOwner();
    error InvalidNewOwner();
    error PropertyNotFound();
    error EmptyPropertyAddress();
    error InvalidPrice();

    /**
     * @notice Registers a new property in the registry.
     * @dev Uses `calldata` for `_address` to avoid memory allocation and copy overhead.
     *      Counter increment is wrapped in `unchecked` since uint256 overflow is practically impossible.
     * @param _address The physical or legal address identifier of the property.
     * @param _price The valuation of the property in wei.
     * @return propertyId The sequential ID assigned to the new property.
     */
    function registerProperty(string calldata _address, uint256 _price) external returns (uint256 propertyId) {
        if (bytes(_address).length == 0) revert EmptyPropertyAddress();
        if (_price == 0) revert InvalidPrice();

        propertyId = propertyCounter;

        properties[propertyId] = Property({
            propertyAddress: _address,
            owner: msg.sender,
            price: _price
        });

        unchecked {
            ++propertyCounter;
        }

        emit PropertyCreated(propertyId, msg.sender, _price);
    }

    /**
     * @notice Transfers ownership of a registered property to another address.
     * @dev Enforces access control, prevents transfers to zero address or current owner,
     *      and caches storage reads to minimize SLOAD costs.
     * @param _propertyId The ID of the property to transfer.
     * @param _newOwner The recipient address of the property title.
     */
    function transferOwnership(uint256 _propertyId, address _newOwner) external {
        if (_propertyId >= propertyCounter) revert PropertyNotFound();
        if (_newOwner == address(0)) revert InvalidNewOwner();

        address currentOwner = properties[_propertyId].owner;
        if (currentOwner != msg.sender) revert NotOwner();
        if (_newOwner == currentOwner) revert InvalidNewOwner();

        properties[_propertyId].owner = _newOwner;

        emit PropertyTransferred(_propertyId, msg.sender, _newOwner);
    }

    /**
     * @notice Retrieves the full details of a registered property.
     * @param _propertyId The unique ID of the property.
     * @return The Property struct containing propertyAddress, owner, and price.
     */
    function getProperty(uint256 _propertyId) external view returns (Property memory) {
        if (_propertyId >= propertyCounter) revert PropertyNotFound();
        return properties[_propertyId];
    }
}