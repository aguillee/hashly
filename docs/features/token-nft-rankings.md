# 📊 Token & NFT Rankings

Hashly allows the community to **rank Hedera tokens and NFT collections** through on-chain voting.

---

## 🪙 Token Rankings

### 📋 What Gets Listed

Hedera tokens (fungible tokens) are synced from ecosystem sources. Each token listing shows:

- 🏷️ **Token name and symbol**
- 🆔 **Token ID** (e.g. `0.0.XXXXX`)
- 💹 **Current price** and market data
- 🗳️ **Community vote count**
- 👍👎 **Vote buttons** up/down

### 🗳️ Voting

- ♾️ **Permanent votes** — You can change your vote at any time (no cooldown)
- 🐉 **NFT-boosted** — Your full voting power applies (base + dragons + El Santuario)
- ⛓️ **On-chain** — Recorded via HCS asset votes
- 🏅 **Counts toward missions** — Mission "Vote on 5 different tokens" (100 XP)

---

## 🎨 NFT Collection Rankings

### 📋 What Gets Listed

Hedera NFT collections are curated from marketplaces and community submissions. Each listing shows:

- 🏷️ **Collection name** and preview images
- 👤 **Creator information**
- 💰 **Floor price** and volume
- 🔢 **Total supply** and holder count
- 🗳️ **Community vote count**

### 🗳️ Voting

Same mechanics as token voting:

- ♾️ Permanent votes with direction changes
- 🐉 NFT-boosted voting power
- ⛓️ On-chain recording via HCS
- 🏅 Mission progress: "Vote on 5 different NFT collections" (100 XP)

---

## ⛓️ HCS Vote Format

Votes on tokens and collections are recorded as **asset votes** on the HCS assets topic:

```json
{
  "type": "asset_vote",
  "version": 1,
  "wallet": "0.0.xxxxx",
  "target_id": "0.0.123456",
  "target_type": "token",
  "vote": "up",
  "voting_power": 9,
  "holdings": {
    "el_santuario": 1,
    "santuario_hedera": 3
  },
  "timestamp": 1234567890
}
```

> 🔍 This provides **full transparency** — anyone can see who voted, with how much power, and when.

---

## 📝 Submit a Token or Collection

Users can submit tokens or NFT collections for **community review**. Submissions go through admin approval before appearing in the rankings.
