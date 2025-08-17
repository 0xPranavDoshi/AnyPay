# Embedded Wallet Integration

This document explains how to set up and use the Coinbase CDP (Coinbase Developer Platform) embedded wallet functionality in AnyPay.

## Setup

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Coinbase CDP Configuration
NEXT_PUBLIC_COINBASE_PROJECT_ID=your_cdp_project_id_here

# MongoDB Configuration (existing)
MONGODB_URI=your_mongodb_connection_string_here
```

### 2. Get Your CDP Project ID

1. Go to [Coinbase Developer Platform](https://developer.coinbase.com/)
2. Create a new project or use an existing one
3. Copy your Project ID from the project dashboard
4. Add it to your `.env.local` file

## How It Works

### Components

- **`CDPProvider`**: Wraps the entire application with CDP context
- **`EmbeddedWalletFlow`**: Handles the embedded wallet creation and authentication flow
- **`AuthButton`**: CDP-provided button for wallet creation and authentication

### Flow

1. User visits the signup page
2. User can either:
   - Connect an existing Web3 wallet (MetaMask, etc.)
   - Create a new embedded wallet using Coinbase CDP
3. When creating an embedded wallet:
   - User clicks "Create Coinbase Embedded Wallet"
   - CDP handles the authentication flow (email/SMS)
   - Once authenticated, a new embedded wallet is created
   - The wallet address is automatically captured and used for signup

### Features

- **Multi-chain support**: Embedded wallets work across multiple blockchain networks
- **Secure authentication**: Uses Coinbase's secure authentication methods
- **Seamless integration**: Works alongside traditional Web3 wallet connections
- **User-friendly**: Simple one-click wallet creation process

## Usage

The embedded wallet functionality is automatically available on the signup page. Users can:

1. **Create Account**: Fill in username and password
2. **Connect Wallet**: Choose between:
   - Connecting an existing wallet
   - Creating a new embedded wallet
3. **Complete Signup**: Submit the form to create their account

## Technical Details

- Uses `@coinbase/cdp-react` for React components
- Uses `@coinbase/cdp-hooks` for state management
- Uses `@coinbase/cdp-core` for core functionality
- Integrated with existing authentication system
- Maintains compatibility with traditional Web3 wallets

## Troubleshooting

### Common Issues

1. **"Project ID not found"**: Ensure `NEXT_PUBLIC_COINBASE_PROJECT_ID` is set correctly
2. **Authentication fails**: Check that your CDP project is properly configured
3. **Wallet not created**: Verify that the user completed the authentication flow

### Development

- Run `npm run dev` to start the development server
- Check browser console for any CDP-related errors
- Ensure all environment variables are properly set

## Security Notes

- CDP handles all sensitive authentication data
- Wallet private keys are managed securely by Coinbase
- No sensitive data is stored in your application
- Follow Coinbase's security best practices for production use
