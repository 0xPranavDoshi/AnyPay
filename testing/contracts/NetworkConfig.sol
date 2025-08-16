// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19 <0.9.0;

library NetworkConfig {
    struct Network {
        address ccipRouter;
        address link;
        address usdc;
        address weth;
        address swapRouter; // Uniswap V3 SwapRouter
        address ccipBnM; // CCIP-BnM token for testing
        uint64 chainSelector;
    }
    
    // Ethereum Sepolia configuration
    function getEthereumSepoliaConfig() internal pure returns (Network memory) {
        return Network({
            ccipRouter: 0xD0daae2231E9CB96b94C8512223533293C3693Bf,
            link: 0x779877A7B0D9E8603169DdbD7836e478b4624789,
            usdc: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238, // Fixed USDC address
            weth: 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14,
            swapRouter: 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E,
            ccipBnM: 0x84F1bb3a3D82c9A6CF52c87a4F8dD5Ee5d23b4Fb, // CCIP-BnM on Ethereum Sepolia
            chainSelector: 16015286601757825753
        });
    }
    
    // Arbitrum Sepolia configuration  
    function getArbitrumSepoliaConfig() internal pure returns (Network memory) {
        return Network({
            ccipRouter: 0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165,
            link: 0xb1D4538B4571d411F07960EF2838Ce337FE1E80E,
            usdc: 0xf3C3351D6Bd0098EEb33ca8f830FAf2a141Ea2E1,
            weth: 0xE591bf0A0CF924A0674d7792db046B23CEbF5f34,
            swapRouter: 0x101F443B4d1b059569D643917553c771E1b9663E,
            ccipBnM: 0xA8C0c11bf64AF62CDCA6f93D3769B88BdD7cb93D, // CCIP-BnM on Arbitrum Sepolia
            chainSelector: 3478487238524512106
        });
    }
    
    // Base Sepolia configuration
    function getBaseSepoliaConfig() internal pure returns (Network memory) {
        return Network({
            ccipRouter: 0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93,
            link: 0xE4aB69C077896252FAFBD49EFD26B5D171A32410,
            usdc: 0x26dF8d79C4FaCa88d0212f0bd7C4A4d1e8955F0e,
            weth: 0x4200000000000000000000000000000000000006,
            swapRouter: 0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4,
            ccipBnM: 0x88A2d74F47a237a62e7A51cdDa67270CE381555e, // CCIP-BnM on Base Sepolia
            chainSelector: 10344971235874465080
        });
    }
}
