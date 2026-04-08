# ♾️ Forever Mints & 🐟 DreamCast

## ♾️ Forever Mints

Forever Mints are events **with no closing date** — they are always active and open for minting.

### 🔄 Differences from Regular Events

| Feature | Regular Event | Forever Mint |
|---|---|---|
| ⏰ **Duration** | Start and end date | Always active |
| 📆 **Date display** | Shows specific dates | Shows "Always Live" |
| 🔄 **Vote cooldown** | 24h between changes | Change at any time |
| 🐉 **NFT vote cooldown** | 24h per NFT | No cooldown |
| 📂 **Listing** | Grid by date | Dedicated "Forever" tab |

### 🗳️ Voting on Forever Mints

Since forever mints are permanent, the **voting rules are more flexible**:

- 🔄 You can **change your vote direction at any time** (no waiting until midnight UTC)
- 💪 Your **full voting power** applies (base + NFT boosts)
- 📊 Votes **still count** toward your daily limit of 5 votes
- ⛓️ All votes are recorded on **HCS** just like regular events

### 🔍 Filters

In the Calendar, use the **Forever** filter to see only forever mints (excluding DreamCast). Use the **DreamCast** filter to see only DreamCast pools.

---

## 🐟 DreamCast Pools

DreamCast is a **fishing-themed NFT minting experience** from DreamBay. Each pool contains NFTs organized by tiers with different rarity levels.

### 🎯 Tier System

Each DreamCast pool has **5 tiers**, from rarest to most common:

| Tier | Rarity | Color |
|---|---|---|
| 🦑 **Kraken** | Ultra rare | 🟡 Yellow |
| 🐉 **Hydra** | Very rare | 🔴 Red |
| 🧜 **Siren** | Rare | 🟣 Purple |
| 🐠 **Keeper** | Uncommon | 🔵 Blue |
| 🐟 **Small Fry** | Common | 🟢 Emerald |

### 📊 Pool Information

Each DreamCast pool displays:

- 🎯 **Tier breakdown** — How many NFTs exist in each tier
- 📈 **Stats** — Total catches (mints) and total volume (HBAR spent)
- 🖼️ **Preview NFTs** — Sample images from the pool
- 💰 **Mint price** — Cost per "cast" (mint attempt)
- 💸 **Buyback** — Whether the pool supports NFT buyback

### 🎀 Visual Branding

DreamCast events are **visually distinct** from regular forever mints:

- 🎀 **Pink branding** (border, badges, buttons) vs purple for standard forever mints
- 🐟 **Fish icon** with "DREAMCAST" badge
- 🎣 **"Cast Now"** button instead of "Mint Now"
- 🏷️ **Tier pills** showing all tier names with their associated colors

### 📡 Data Source

DreamCast pools are automatically synced from the **DreamBay API**:

- 🔄 Active pools are imported daily
- 💾 Metadata (tiers, stats, previews) is stored alongside the event
- 🚫 Test pools are automatically filtered out
