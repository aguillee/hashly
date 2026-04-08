# Connect Your Wallet

Hashly uses wallet-based authentication — no passwords, no emails. You prove you own a Hedera wallet by signing a message, and you're in.

## Supported Wallets

Any Hedera-compatible wallet that supports WalletConnect:

- **HashPack** — the most popular Hedera wallet
- **Blade Wallet**
- **MetaMask** (via WalletConnect bridge)
- Any other WalletConnect-compatible Hedera wallet

## How to Connect

1. Click the **Connect** button in the sidebar (desktop) or bottom bar (mobile).
2. Select your wallet from the WalletConnect modal.
3. Approve the connection in your wallet app.
4. Sign the authentication message when prompted — this proves you own the wallet without sharing your private key.
5. You're connected! Your wallet address appears in the sidebar.

## What Happens on First Login

- A Hashly account is automatically created for your wallet address.
- You receive a unique **referral code** that you can share with friends.
- Your daily login streak starts (used for missions).
- You can immediately start voting, exploring, and completing missions.

## Security

- Hashly never asks for your private key or seed phrase.
- Authentication uses a cryptographic signature — only the message is signed, not a transaction.
- Sessions expire after 24 hours. You'll need to reconnect.
- All session data is stored in a secure HTTP-only cookie.

## Disconnecting

Click your wallet address in the sidebar and select **Disconnect**. Your votes, missions, and XP are preserved — they're tied to your wallet address, not a session.
