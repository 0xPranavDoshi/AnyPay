// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19 <0.9.0;

library NetworkConfig {
    struct Network {
        address ccipRouter;
        address usdc;
        address weth;
        address swapRouter; // Uniswap V3 SwapRouter
        uint64 chainSelector;
    }
    
    // Ethereum Sepolia configuration
    function getEthereumSepoliaConfig() internal pure returns (Network memory) {
        return Network({
            ccipRouter: 0xD0daae2231E9CB96b94C8512223533293C3693Bf,
            usdc: 0x1C7D4B197e65a09DBc2B8FD0C5c8b1DDd7ebf24a,
            weth: 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14,
            swapRouter: 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E,
            chainSelector: 16015286601757825753
        });
    }
    
    // Arbitrum Sepolia configuration  
    function getArbitrumSepoliaConfig() internal pure returns (Network memory) {
        return Network({
            ccipRouter: 0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165,
            usdc: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d,
            weth: 0xE591bf0A0CF924A0674d7792db046B23CEbF5f34,
            swapRouter: 0x101F443B4d1b059569D643917553c771E1b9663E,
            chainSelector: 3478487238524512106
        });
    }
    
    // Base Sepolia configuration
    function getBaseSepoliaConfig() internal pure returns (Network memory) {
        return Network({
            ccipRouter: 0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93,
            usdc: 0x036CbD53842c5426634e7929541eC2318f3dCF7e,
            weth: 0x4200000000000000000000000000000000000006,
            swapRouter: 0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4,
            chainSelector: 10344971235874465080
        });
    }
}
