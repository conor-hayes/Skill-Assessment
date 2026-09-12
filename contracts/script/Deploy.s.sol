// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {PropertyRegistry} from "../src/PropertyRegistry.sol";

/// @notice Deploys PropertyRegistry. Run with:
contract DeployScript is Script {
    function run() external returns (PropertyRegistry registry) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        registry = new PropertyRegistry();
        vm.stopBroadcast();

        console.log("PropertyRegistry deployed at:", address(registry));
    }
}
