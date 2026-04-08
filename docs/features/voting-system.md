# Voting System

Hashly's voting system is designed to be transparent, fair, and rewarding for active community members.

## How Voting Works

### Base Vote
Every connected wallet gets **1 base vote** per event. You can vote **up** (support) or **down** (oppose) on NFT mint events. Meetups and hackathons only allow upvotes.

### NFT Voting Power

Holding specific Hedera NFTs boosts your voting power:

| NFT | Token ID | Boost | Details |
|---|---|---|---|
| Santuario Hedera Dragon | `0.0.7235629` | +1 per NFT | Scales with holdings — 10 dragons = +10 votes |
| El Santuario | `0.0.9954622` | +5 flat | Only the first NFT counts |

**Example:** If you hold 3 Dragons and 1 El Santuario, your total voting power is:
`1 (base) + 3 (dragons) + 5 (El Santuario) = 9 votes`

NFT ownership is verified in real-time against the Hedera Mirror Node at the moment you vote.

### Daily Vote Limit

You have **5 votes per day** across all event types. The limit resets at midnight UTC. Each vote action (up, down, or direction change) counts as one vote slot.

### Vote Cooldown

- **Regular events**: You can change your vote after the next UTC midnight (24h window).
- **Forever mints**: You can change your vote direction at any time with no cooldown.
- **NFT votes on regular events**: 24-hour cooldown per NFT per event.
- **NFT votes on forever mints**: No cooldown.

### Direction Changes

If you voted **up** and want to switch to **down**:
- The system removes your upvote weight and adds it as a downvote.
- For a vote weight of 9, this means: -9 from upvotes, +9 to downvotes (net swing of 18).
- Direction changes cost one daily vote slot.

## On-Chain Recording

Every vote is submitted to the **Hedera Consensus Service (HCS)**, creating an immutable on-chain record.

**HCS Message Format:**
```json
{
  "type": "event_vote",
  "version": 1,
  "wallet": "0.0.xxxxx",
  "event_id": "cuid123...",
  "event_type": "nft",
  "vote": "up",
  "timestamp": 1234567890
}
```

This means:
- Every vote is verifiable on-chain
- No one (including admins) can tamper with vote records
- The community can independently audit rankings

## Voting on Different Content Types

Hashly applies the same core voting mechanics across different content:

| Content | Vote Types | Cooldown | HCS Recorded |
|---|---|---|---|
| NFT Mint Events | Up / Down | 24h | Yes |
| Meetups | Up only | 24h | Yes |
| Hackathons | Up only | 24h | Yes |
| Forever Mints | Up / Down | None | Yes |
| Tokens | Up / Down | None | Yes |
| NFT Collections | Up / Down | None | Yes |
| Ecosystem Projects | Up / Down | None | Yes |

## Tips

- Use your 5 daily votes on events you genuinely support or oppose.
- Hold Dragon NFTs to maximize your influence.
- Voting counts toward mission progress (daily and seasonal missions).
- Check the Dragon NFT [rarity checker](/rarity) to discover rare dragons.
