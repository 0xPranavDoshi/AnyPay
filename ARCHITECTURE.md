# AnyPay - High-Level Tech Architecture

## System Overview

AnyPay is a cross-chain payment platform that enables secure, decentralized payments across multiple blockchain networks using Chainlink CCIP (Cross-Chain Interoperability Protocol) and embedded wallets via Coinbase Developer Platform (CDP).

## Architecture Components

### 1. Frontend Layer (Next.js 15 + React 19)

- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19 + Tailwind CSS
- **State Management**: React Context + CDP Hooks
- **Authentication**: NextAuth.js + CDP Embedded Wallets

### 2. Backend Layer (Next.js API Routes)

- **Runtime**: Node.js
- **API Structure**: RESTful API routes under `/app/api/`
- **Authentication**: JWT-based with NextAuth.js
- **Database**: MongoDB for persistent storage

### 3. Blockchain Layer

- **Smart Contracts**: Solidity contracts deployed on multiple testnets
- **Cross-Chain Protocol**: Chainlink CCIP for cross-chain messaging
- **Supported Networks**:
  - Ethereum Sepolia (Chain ID: 11155111)
  - Arbitrum Sepolia (Chain ID: 421614)
  - Base Sepolia (Chain ID: 84532)
- **Token Standards**: ERC-20 (USDC, CCIP BNM/LNM)

### 4. AI/ML Layer

- **AI Provider**: Google Gemini 2.5 Flash Lite via OpenRouter
- **Use Cases**: Bill splitting calculations, payment recommendations
- **Integration**: Function calling for structured data processing

### 5. Infrastructure Layer

- **Database**: MongoDB Atlas
- **File Storage**: Pinata IPFS for image storage
- **Deployment**: Vercel (Next.js platform)

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE LAYER                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Login     │  │   Signup    │  │  Dashboard  │  │  Payment Modal  │  │
│  │   Page      │  │   Page      │  │   Page      │  │                 │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT-SIDE LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CDP Provider (Coinbase)                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │   │
│  │  │   Embedded  │  │   Wallet    │  │      React Components      │ │   │
│  │  │    Wallet   │  │  Management │  │                           │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Auth     │  │    Pay      │  │   Agent     │  │   Payments      │  │
│  │   API      │  │    API      │  │    API      │  │     API         │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Users     │  │   CDP       │  │  Check      │  │   Onramp       │  │
│  │    API      │  │  Account    │  │  Balance    │  │     API        │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
┌─────────────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│    DATABASE LAYER       │ │   AI/ML LAYER   │ │   BLOCKCHAIN LAYER     │
├─────────────────────────┤ ├─────────────────┤ ├─────────────────────────┤
│  ┌─────────────────┐   │ │ ┌─────────────┐ │ │ ┌─────────────────────┐ │
│  │     MongoDB     │   │ │ │   Gemini    │ │ │ │   Smart Contracts   │ │
│  │   Collections:  │   │ │ │    2.5      │ │ │ │                     │ │
│  │  • users        │   │ │ │   Flash     │ │ │ │ • CrossChainExpense │ │
│  │  • payments     │   │ │ │    Lite     │ │ │ │   Splitter          │ │
│  │  • sessions     │   │ │ │             │ │ │ │ • CCIP Receiver     │ │
│  │  • crosschain_ │   │ │ │ ┌─────────┐ │ │ │ │ • Token Contracts   │ │
│  │    payments     │   │ │ │ │Function │ │ │ │                     │ │
│  └─────────────────┘   │ │ │ │ Calling │ │ │ │ ┌─────────────────┐ │ │
└─────────────────────────┘ │ └─────────┘ │ │ │ │   CCIP Router   │ │ │
                            │ └─────────────┘ │ │ │   (Chainlink)   │ │ │
                            └─────────────────┘ │ └─────────────────┘ │ │
                                                │ ┌─────────────────┐ │ │
                                                │ │   RPC Endpoints │ │ │
                                                │ │                 │ │ │
                                                │ │ • Ethereum      │ │ │
                                                │ │ • Arbitrum      │ │ │
                                                │ │ • Base          │ │ │
                                                │ └─────────────────┘ │ │
                                                └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

### 1. User Authentication Flow

```
User → Login/Signup → NextAuth.js → CDP Wallet → MongoDB User Storage
```

### 2. Payment Processing Flow

```
User Input → Payment Modal → Pay API → Smart Contract → CCIP Router →
Destination Chain → Payment Confirmation → Database Update → UI Update
```

### 3. AI Agent Flow

```
User Query → Agent API → Gemini AI → Function Calling → Database Operations →
Response Generation → Session Storage → UI Update
```

### 4. Cross-Chain Payment Flow

```
Source Chain → CCIP Message → Router → Destination Chain →
Token Transfer → Confirmation → Status Update
```

## Key Technical Features

### 1. Cross-Chain Interoperability

- **Protocol**: Chainlink CCIP
- **Message Passing**: Cross-chain communication for payment instructions
- **Token Bridging**: Native token transfers across networks
- **Security**: Multi-layer validation and confirmation

### 2. Embedded Wallet Integration

- **Provider**: Coinbase Developer Platform (CDP)
- **Features**: Self-custodial wallets, multi-chain support
- **Authentication**: Email/SMS-based wallet creation
- **Security**: Private key management via CDP

### 3. AI-Powered Bill Splitting

- **Model**: Google Gemini 2.5 Flash Lite
- **Capabilities**: Natural language processing, image analysis
- **Function Calling**: Structured data extraction and processing
- **Session Management**: Persistent conversation context

### 4. Multi-Chain Support

- **Networks**: Ethereum, Arbitrum, Base (Sepolia testnets)
- **Tokens**: USDC, CCIP BNM/LNM
- **Contracts**: Deployed on all supported networks
- **RPC Integration**: Network-specific endpoints

## Security Architecture

### 1. Authentication & Authorization

- JWT-based session management
- CDP wallet signature verification
- Role-based access control
- Session timeout and validation

### 2. Smart Contract Security

- CCIP protocol security features
- Multi-signature requirements
- Reentrancy protection
- Input validation and sanitization

### 3. Data Security

- MongoDB connection encryption
- Environment variable protection
- API rate limiting
- Input sanitization and validation

## Scalability Considerations

### 1. Horizontal Scaling

- Stateless API design
- Database connection pooling
- CDN integration for static assets
- Load balancing ready

### 2. Performance Optimization

- Next.js 15 optimizations
- React 19 concurrent features
- Database indexing strategies
- Caching layers (Redis ready)

### 3. Cross-Chain Scaling

- Modular contract architecture
- Network-agnostic payment processing
- Extensible token support
- Multi-network deployment automation

## Development & Deployment

### 1. Development Environment

- **Framework**: Next.js 15 with TypeScript
- **Package Manager**: Bun/NPM
- **Testing**: Hardhat for smart contracts
- **Linting**: ESLint + Next.js config

### 2. Deployment Pipeline

- **Frontend**: Vercel deployment
- **Smart Contracts**: Multi-network deployment scripts
- **Database**: MongoDB Atlas
- **Monitoring**: Built-in Next.js analytics

### 3. Testing Strategy

- **Unit Tests**: Smart contract testing with Hardhat
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Cross-chain payment flows
- **Security Tests**: Smart contract audits

## Future Architecture Considerations

### 1. Layer 2 Integration

- Polygon, Optimism, Arbitrum One
- Rollup-specific optimizations
- Cross-L2 communication

### 2. Advanced AI Features

- Payment pattern recognition
- Fraud detection algorithms
- Personalized financial insights
- Multi-modal AI interactions

### 3. Enterprise Features

- Multi-tenant architecture
- Advanced analytics dashboard
- Compliance and regulatory tools
- Enterprise wallet management

This architecture provides a robust foundation for cross-chain payments while maintaining security, scalability, and user experience standards.
