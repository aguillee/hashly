# On-Chain Voting (HCS)

All votes on Hashly are recorded on the Hedera Consensus Service (HCS) for full transparency and immutability.

## What is HCS?

The Hedera Consensus Service is a decentralized, verifiable logging service. Messages submitted to an HCS topic receive a consensus timestamp and are stored in an immutable, ordered log. Anyone can read these messages to independently verify the data.

## HCS Topics

Hashly uses dedicated HCS topics for different vote types:

| Purpose | Topic ID (Mainnet) |
|---|---|
| Event Votes | `0.0.10279947` |
| Asset Votes (Tokens/Collections) | `0.0.10279948` |
| Attendance Check-ins | `0.0.10300837` |

## Message Formats

### Event Votes
Recorded when a user votes on an NFT mint, meetup, or hackathon:

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

### Asset Votes
Recorded when a user votes on a token, NFT collection, or ecosystem project:

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

### Attendance Check-ins
Recorded when a user checks in at an event:

```json
{
  "type": "checkin",
  "version": 1,
  "wallet": "0.0.xxxxx",
  "event_id": "cuid123...",
  "timestamp": 1234567890
}
```

## Verifying Votes

Anyone can verify HCS messages using:
- **Hedera Mirror Node API**: Query topic messages at `https://mainnet.mirrornode.hedera.com/api/v1/topics/{topicId}/messages`
- **HashScan**: View topic messages on [hashscan.io](https://hashscan.io)
- **Third-party explorers**: Any Hedera block explorer that supports HCS topics

## Submit Key

All HCS messages are submitted through a controlled submit key (`0.0.10279885`). This ensures only the Hashly backend can write to the topics, preventing spam while maintaining read transparency.

The topics have **no admin key**, making them immutable — once created, the topic configuration cannot be changed, and messages cannot be deleted.
