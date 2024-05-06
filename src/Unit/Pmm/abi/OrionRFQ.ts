export const orionRFQContractABI =
    [
        {
            "inputs": [
                {
                    "components": [
                        {
                            "internalType": "uint256",
                            "name": "info",
                            "type": "uint256"
                        },
                        {
                            "internalType": "address",
                            "name": "makerAsset",
                            "type": "address"
                        },
                        {
                            "internalType": "address",
                            "name": "takerAsset",
                            "type": "address"
                        },
                        {
                            "internalType": "address",
                            "name": "maker",
                            "type": "address"
                        },
                        {
                            "internalType": "address",
                            "name": "allowedSender",
                            "type": "address"
                        },
                        {
                            "internalType": "uint256",
                            "name": "makingAmount",
                            "type": "uint256"
                        },
                        {
                            "internalType": "uint256",
                            "name": "takingAmount",
                            "type": "uint256"
                        }
                    ],
                    "internalType": "struct OrderRFQLib.OrderRFQ",
                    "name": "order",
                    "type": "tuple"
                },
                {
                    "internalType": "bytes",
                    "name": "signature",
                    "type": "bytes"
                },
                {
                    "internalType": "uint256",
                    "name": "flagsAndAmount",
                    "type": "uint256"
                }
            ],
            "name": "fillOrderRFQ",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ];
