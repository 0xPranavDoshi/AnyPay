# AnyPay - System Architecture Flowcharts

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph "User Interface"
        UI[User Interface<br/>Next.js + React]
    end

    subgraph "Client Layer"
        CDP[CDP Provider<br/>Coinbase Developer Platform]
        WALLET[Embedded Wallet<br/>Self-Custodial]
    end

    subgraph "API Gateway"
        API[Next.js API Routes<br/>RESTful Endpoints]
    end

    subgraph "Core Services"
        AUTH[Authentication<br/>NextAuth.js + JWT]
        PAY[Payment Processing<br/>Cross-Chain Logic]
        AI[AI Agent<br/>Gemini 2.5]
        DB[(MongoDB<br/>Data Storage)]
    end

    subgraph "Blockchain Layer"
        CCIP[Chainlink CCIP<br/>Cross-Chain Protocol]
        ETH[Ethereum Sepolia<br/>Smart Contracts]
        ARB[Arbitrum Sepolia<br/>Smart Contracts]
        BASE[Base Sepolia<br/>Smart Contracts]
    end

    UI --> CDP
    CDP --> WALLET
    UI --> API
    API --> AUTH
    API --> PAY
    API --> AI
    AUTH --> DB
    PAY --> DB
    AI --> DB
    PAY --> CCIP
    CCIP --> ETH
    CCIP --> ARB
    CCIP --> BASE
```

## 2. User Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Frontend
    participant CDP as CDP Provider
    participant AUTH as Auth API
    participant DB as MongoDB

    U->>UI: Access Application
    UI->>CDP: Initialize CDP
    CDP->>U: Request Email/SMS
    U->>CDP: Provide Credentials
    CDP->>CDP: Create/Recover Wallet
    CDP->>UI: Wallet Ready
    UI->>AUTH: Authenticate User
    AUTH->>DB: Store/Verify User
    DB->>AUTH: User Data
    AUTH->>UI: JWT Token
    UI->>U: Authenticated Session
```

## 3. Cross-Chain Payment Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Frontend
    participant API as Pay API
    participant SC as Smart Contract
    participant CCIP as CCIP Router
    participant DEST as Destination Chain
    participant DB as MongoDB

    U->>UI: Initiate Payment
    UI->>API: Payment Request
    API->>SC: Execute Payment
    SC->>CCIP: Send CCIP Message
    CCIP->>DEST: Cross-Chain Message
    DEST->>DEST: Process Payment
    DEST->>CCIP: Confirmation
    CCIP->>SC: Message Confirmed
    SC->>API: Payment Status
    API->>DB: Update Database
    API->>UI: Payment Complete
    UI->>U: Success Notification
```

## 4. AI Agent Bill Splitting Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Frontend
    participant API as Agent API
    participant AI as Gemini AI
    participant DB as MongoDB

    U->>UI: Upload Bill Image
    UI->>API: Process Bill
    API->>AI: Analyze Image + Text
    AI->>AI: Extract Bill Data
    AI->>AI: Calculate Splits
    AI->>API: Structured Data
    API->>DB: Store Bill Data
    API->>UI: Split Results
    UI->>U: Display Split Options

    U->>UI: Confirm Split
    UI->>API: Save Settlement
    API->>DB: Create Payments
    API->>UI: Settlement Saved
    UI->>U: Confirmation
```

## 5. Data Flow Architecture

```mermaid
flowchart TD
    subgraph "Input Sources"
        USER[User Input]
        IMAGE[Image Upload]
        WALLET[Wallet Actions]
    end

    subgraph "Processing Layer"
        API[API Routes]
        AI[AI Processing]
        PAY[Payment Engine]
    end

    subgraph "Storage Layer"
        MONGODB[(MongoDB)]
        IPFS[IPFS Storage]
        BLOCKCHAIN[Blockchain State]
    end

    subgraph "Output Layer"
        UI[User Interface]
        NOTIFICATIONS[Notifications]
        TRANSACTIONS[Blockchain TXs]
    end

    USER --> API
    IMAGE --> AI
    WALLET --> PAY

    API --> MONGODB
    AI --> MONGODB
    PAY --> BLOCKCHAIN

    MONGODB --> UI
    BLOCKCHAIN --> TRANSACTIONS
    API --> NOTIFICATIONS
```

## 6. Smart Contract Architecture

```mermaid
graph TB
    subgraph "Cross-Chain Contracts"
        CCEP[CrossChainExpenseSplitter]
        CCIP_REC[CCIPReceiver]
        TOKEN[Token Contracts]
    end

    subgraph "CCIP Integration"
        ROUTER[CCIP Router]
        MESSAGING[Message Passing]
        VALIDATION[Cross-Chain Validation]
    end

    subgraph "Network Deployment"
        ETH[Ethereum Sepolia]
        ARB[Arbitrum Sepolia]
        BASE[Base Sepolia]
    end

    CCEP --> CCIP_REC
    CCIP_REC --> ROUTER
    ROUTER --> MESSAGING
    MESSAGING --> VALIDATION

    VALIDATION --> ETH
    VALIDATION --> ARB
    VALIDATION --> BASE

    TOKEN --> CCEP
```

## 7. Security Architecture

```mermaid
graph TB
    subgraph "Authentication Security"
        JWT[JWT Tokens]
        SIGNATURE[Wallet Signatures]
        SESSION[Session Management]
    end

    subgraph "Smart Contract Security"
        CCIP_SEC[CCIP Protocol Security]
        REENTRANCY[Reentrancy Protection]
        VALIDATION[Input Validation]
    end

    subgraph "Data Security"
        ENCRYPTION[Database Encryption]
        RATE_LIMIT[API Rate Limiting]
        SANITIZATION[Input Sanitization]
    end

    subgraph "Network Security"
        HTTPS[HTTPS/TLS]
        CORS[CORS Policies]
        HEADERS[Security Headers]
    end

    JWT --> SESSION
    SIGNATURE --> SESSION
    CCIP_SEC --> REENTRANCY
    REENTRANCY --> VALIDATION
    ENCRYPTION --> RATE_LIMIT
    RATE_LIMIT --> SANITIZATION
    HTTPS --> CORS
    CORS --> HEADERS
```

## 8. Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        DEV[Local Development]
        TEST[Testing Environment]
        STAGING[Staging Environment]
    end

    subgraph "Production"
        PROD[Production Environment]
        VERCEL[Vercel Deployment]
        MONGO_ATLAS[MongoDB Atlas]
    end

    subgraph "Blockchain"
        TESTNETS[Testnet Deployment]
        MAINNETS[Mainnet Ready]
        VERIFICATION[Contract Verification]
    end

    DEV --> TEST
    TEST --> STAGING
    STAGING --> PROD

    PROD --> VERCEL
    PROD --> MONGO_ATLAS

    TEST --> TESTNETS
    TESTNETS --> MAINNETS
    MAINNETS --> VERIFICATION
```

## 9. Scalability Architecture

```mermaid
graph TB
    subgraph "Current Architecture"
        SINGLE[Single Instance]
        MONGO[MongoDB]
        API[API Routes]
    end

    subgraph "Scalability Path"
        LOAD_BAL[Load Balancer]
        MULTI_INST[Multiple Instances]
        CACHE[Redis Cache]
        CDN[CDN Integration]
    end

    subgraph "Advanced Scaling"
        MICROSERVICES[Microservices]
        KUBERNETES[Kubernetes]
        AUTO_SCALE[Auto-scaling]
        MONITORING[Monitoring & Alerting]
    end

    SINGLE --> LOAD_BAL
    LOAD_BAL --> MULTI_INST
    MULTI_INST --> CACHE
    CACHE --> CDN

    CDN --> MICROSERVICES
    MICROSERVICES --> KUBERNETES
    KUBERNETES --> AUTO_SCALE
    AUTO_SCALE --> MONITORING
```

## 10. Integration Points

```mermaid
graph TB
    subgraph "External Services"
        COINBASE[Coinbase CDP]
        CHAINLINK[Chainlink CCIP]
        GEMINI[Google Gemini]
        PINATA[Pinata IPFS]
    end

    subgraph "Internal Components"
        FRONTEND[Frontend App]
        BACKEND[Backend APIs]
        CONTRACTS[Smart Contracts]
        DATABASE[Database]
    end

    subgraph "Blockchain Networks"
        ETH[Ethereum]
        ARB[Arbitrum]
        BASE[Base]
    end

    COINBASE --> FRONTEND
    CHAINLINK --> CONTRACTS
    GEMINI --> BACKEND
    PINATA --> BACKEND

    FRONTEND --> BACKEND
    BACKEND --> DATABASE
    BACKEND --> CONTRACTS

    CONTRACTS --> ETH
    CONTRACTS --> ARB
    CONTRACTS --> BASE
```

These flowcharts provide a comprehensive visual representation of the AnyPay system architecture, showing the relationships between different components, data flows, and system interactions. Each diagram focuses on a specific aspect of the system to provide clarity on how different parts work together.
