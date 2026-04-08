# Supported Wallets

Hashly uses WalletConnect for wallet authentication. Any Hedera-compatible wallet that supports WalletConnect can be used.

## Recommended Wallets

### HashPack
The most popular Hedera wallet. Available as a browser extension and mobile app.
- Browser extension (Chrome, Brave, Firefox)
- iOS and Android apps
- Full Hedera token support

### Blade Wallet
A user-friendly Hedera wallet with built-in DApp browser.
- Browser extension
- Mobile app
- Simple interface for beginners

### MetaMask
The most widely used crypto wallet. Works with Hedera via WalletConnect bridge.
- Browser extension
- Mobile app
- Requires WalletConnect bridge for Hedera

## Authentication Flow

1. Click **Connect** on Hashly.
2. The WalletConnect modal appears with available wallet options.
3. Select your wallet and approve the connection.
4. Sign the authentication message (not a transaction — no fees).
5. Session is established for 24 hours.

## Important Notes

- **No private keys** — Hashly never asks for or stores your private key.
- **Signature only** — You sign a message to prove wallet ownership. No HBAR is spent.
- **Session expiry** — Sessions last 24 hours. Reconnect after expiry.
- **NFT verification** — Your NFT holdings are checked in real-time from the Hedera Mirror Node when you vote.
