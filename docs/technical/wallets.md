# 👛 Compatible Wallets

Hashly uses **WalletConnect** for wallet authentication. Any Hedera-compatible wallet that supports WalletConnect can be used.

---

## ⭐ Recommended Wallet

### 🟣 HashPack

The most popular Hedera wallet. Available as a browser extension and mobile app.

- 🌐 Browser extension (Chrome, Brave, Firefox)
- 📱 iOS and Android apps
- ✅ Full Hedera token support

### 🔗 Other Wallets

Any Hedera-compatible wallet that supports **WalletConnect** can be used with Hashly.

---

## 🔄 Authentication Flow

1. 🖱️ Click on **Connect** in Hashly.
2. 📱 The WalletConnect modal appears with the available wallet options.
3. ✅ Select your wallet and approve the connection.
4. ✍️ Sign the authentication message (**not a transaction** — no fees).
5. 🔓 The session is established for **24 hours**.

---

## ⚠️ Important Notes

- 🔒 **No private keys** — Hashly **never** requests or stores your private key.
- ✍️ **Signature only** — You sign a message to prove wallet ownership. No HBAR is spent.
- ⏰ **Session expiration** — Sessions last 24 hours. Reconnect after expiration.
- 🎨 **NFT verification** — Your NFT holdings are verified in real time from the Hedera Mirror Node when you vote.
