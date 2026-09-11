export const propertyRegistryAbi = [
  {
    type: "function",
    name: "registerProperty",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_address", type: "string" },
      { name: "_price", type: "uint256" },
    ],
    outputs: [{ name: "propertyId", type: "uint256" }],
  },
  {
    type: "function",
    name: "transferOwnership",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_propertyId", type: "uint256" },
      { name: "_newOwner", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getProperty",
    stateMutability: "view",
    inputs: [{ name: "_propertyId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "propertyAddress", type: "string" },
          { name: "owner", type: "address" },
          { name: "price", type: "uint256" },
          { name: "exists", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "PropertyRegistered",
    anonymous: false,
    inputs: [
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "propertyAddress", type: "string" },
      { indexed: false, name: "price", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    anonymous: false,
    inputs: [
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: true, name: "previousOwner", type: "address" },
      { indexed: true, name: "newOwner", type: "address" },
    ],
  },
] as const;
