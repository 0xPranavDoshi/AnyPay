# AnyPay - High-Level Tech Stack Architecture

## Core Technology Stack

AnyPay uses a simplified, high-level architecture focused on cross-chain payments and embedded wallets.

## High-Level Tech Stack Diagram

```mermaid
graph TB
    subgraph "User Interface"
        CLIENT[Client<br/>Next.js + React]
    end

    subgraph "Backend Services"
        SERVER[Server Routes<br/>API Endpoints]
        DB[(MongoDB<br/>Database)]
    end

    subgraph "Blockchain"
        CONTRACT[Smart Contracts<br/>Chainlink CCIP + PTT]
    end

    subgraph "External Integrations"
        PINATA[Pinata IPFS]
        AI[AI Agent<br/>Gemini LLM]
        X402[X402 Protocol]
    end

    subgraph "CDP Platform"
        CDP[Coinbase Developer Platform]
    end

    %% Core Flow
    CLIENT -->|API Calls| SERVER
    SERVER -->|Store Data| DB
    SERVER -->|Deploy/Interact| CONTRACT
    SERVER -->|Store Files| PINATA
    SERVER -->|Process Bills| AI
    SERVER -->|Payment Standards| X402

    %% CDP Integration
    CLIENT -->|Embedded Wallets| CDP
    SERVER -->|Server Wallets| CDP
    SERVER -->|OnRamp Services| CDP
    SERVER -->|Wallet Data| CDP

    %% Cross-Chain Flow
    CONTRACT -->|CCIP Messages| CONTRACT
    CONTRACT -->|PTT Transfers| CONTRACT
```

## Technology Components

| Component           | Technology           | Purpose                                 |
| ------------------- | -------------------- | --------------------------------------- |
| **Client**          | Next.js + React      | User interface and interactions         |
| **MongoDB**         | MongoDB              | Data storage and persistence            |
| **Server Routes**   | Next.js API Routes   | Backend API endpoints                   |
| **Smart Contracts** | Solidity + Chainlink | Cross-chain contracts with CCIP and PTT |
| **Pinata**          | IPFS                 | File and image storage                  |
| **AI Agent**        | Google Gemini        | AI-powered bill splitting               |
| **X402**            | X402 Protocol        | Payment standards                       |
| **CDP Platform**    | Coinbase CDP         | Complete wallet infrastructure          |

## High-Level Data Flow

```mermaid
flowchart LR
    USER[User] --> CLIENT[Client]
    CLIENT --> SERVER[Server Routes]
    SERVER --> DB[(MongoDB)]
    SERVER --> CONTRACT[Smart Contracts]
    SERVER --> SERVICES[External Services]
    CLIENT --> CDP[CDP Platform]
```

## Core Architecture Benefits

- **Simplified Stack**: Focused on essential components only
- **Cross-Chain Ready**: Chainlink CCIP and PTT integration
- **Embedded Wallets**: CDP-powered wallet infrastructure
- **AI Integration**: LLM-powered bill splitting
- **Decentralized Storage**: IPFS for file management
- **Payment Standards**: X402 protocol compliance

This high-level architecture provides a clean, focused foundation for cross-chain payments with embedded wallets.
