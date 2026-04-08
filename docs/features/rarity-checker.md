# 🔍 NFT Rarity Checker

Hashly includes a built-in **rarity ranking** tool for the **Santuario Hedera Dragon** NFT collection.

---

## 📋 General Information

| Data | Value |
|---|---|
| 🎨 **Collection** | Santuario Hedera Dragons |
| 🆔 **Token ID** | `0.0.7235629` |
| 🔢 **Total Supply** | 1,000 |
| 📊 **Circulating** | 534 NFTs currently in wallets |
| 🏷️ **Trait Types** | 9 different categories |

---

## 🏅 Rarity Tiers

NFTs are ranked based on their **combined rarity score** across all traits:

| Tier | Criteria | Badge Color |
|---|---|---|
| 🟢 **Mythic** | Rank #1 only | Green |
| 🟡 **Legendary** | Top 5% | Yellow |
| 🟣 **Epic** | Top 15% | Purple |
| 🟠 **Rare** | Top 30% | Orange |
| 🟩 **Uncommon** | Top 50% | Green |
| ⬜ **Common** | Below 50% | Gray |

---

## 🧮 How Rarity is Calculated

1. 📊 **Trait Frequency** — For each trait value, count how many NFTs share it
2. 🔢 **Rarity Score** — `(1 - frequency / total) * 100` per trait. A trait shared by only 1 NFT has a score of ~99.8%
3. ⚖️ **Weighted Average** — Each trait type has a weight. "Skin" has a custom weight of **15%**; the remaining 8 traits share the **85%** equally (~10.6% each)
4. 🏆 **Final Ranking** — NFTs are sorted by total weighted score. **Higher = rarer**

### ⭐ Special Ranks

Serials **#1, #652, #653, and #654** are **1-of-1 specials** — they always hold **Rank #1** regardless of their trait scores.

---

## ✨ Features

- 🔍 **Search** — Find any dragon by serial number, name, or trait value
- 🏅 **Filter by tier** — Click Mythic, Legendary, Epic, etc. to filter
- 🏷️ **Filter by listing** — Show only NFTs currently listed for sale
- 🔄 **Sort** — By rank (default), serial number, or listing price
- 📊 **Trait Breakdown** — Expandable panel showing all trait types, their weights, and value distributions
- 📈 **Circulating Supply** — Real-time visualization of circulating vs maximum supply from the Hedera Mirror Node

---

## 🐉 NFT Detail View

Click on any dragon card to see:

- 🖼️ **Full-size image**
- 🏆 **Rarity rank** and score
- 🏷️ All **trait values** with individual rarity percentages
- 🔢 **Count** of NFTs sharing each trait
- 💰 **Listing status** and price (if listed)

---

## 💪 Why Dragons Matter

Dragon NFTs are not just collectibles in Hashly — each one you hold gives you **+1 voting power** across all events, tokens, collections, and ecosystem projects. The rarity checker helps you discover which dragons are the **rarest finds**. 🐉
