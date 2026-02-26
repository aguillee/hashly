import {
  Client,
  TopicMessageSubmitTransaction,
  PrivateKey,
} from "@hashgraph/sdk";

// Topic IDs
const HCS_EVENTS_TOPIC_ID = process.env.HCS_EVENTS_TOPIC_ID!;
const HCS_ASSETS_TOPIC_ID = process.env.HCS_ASSETS_TOPIC_ID!;
const HCS_ATTENDANCE_TOPIC_ID = process.env.HCS_ATTENDANCE_TOPIC_ID!;

// Operator credentials (for signing HCS messages)
const HEDERA_OPERATOR_ID = process.env.HEDERA_OPERATOR_ID!;
const HEDERA_OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY!;

// NFT Token IDs for voting power
const EL_SANTUARIO_TOKEN_ID = "0.0.9954622";
const SANTUARIO_HEDERA_TOKEN_ID = "0.0.7235629";

// Voting power constants
const BASE_VOTING_POWER = 1;
const EL_SANTUARIO_POWER = 5;
const SANTUARIO_HEDERA_POWER = 1; // Per NFT

// Message types
export interface EventVoteMessage {
  type: "event_vote";
  version: 1;
  wallet: string;
  event_id: string;
  event_type: "nft" | "meetup" | "hackathon";
  vote: "up" | "down";
  timestamp: number;
}

export interface AssetVoteMessage {
  type: "asset_vote";
  version: 1;
  wallet: string;
  target_id: string; // Token ID in Hedera format (0.0.XXXXX)
  target_type: "token" | "nft";
  vote: "up" | "down";
  voting_power: number;
  holdings: {
    el_santuario: number;
    santuario_hedera: number;
  };
  timestamp: number;
}

// Get Hedera client
function getHederaClient(): Client {
  const client = Client.forMainnet();
  const operatorKey = PrivateKey.fromStringECDSA(HEDERA_OPERATOR_KEY);
  client.setOperator(HEDERA_OPERATOR_ID, operatorKey);
  return client;
}

// Calculate voting power based on NFT holdings
export function calculateVotingPower(
  elSantuarioCount: number,
  santuarioHederaCount: number
): number {
  let power = BASE_VOTING_POWER;

  // El Santuario: +5 if has at least 1
  if (elSantuarioCount > 0) {
    power += EL_SANTUARIO_POWER;
  }

  // Santuario Hedera: +1 per NFT
  power += santuarioHederaCount * SANTUARIO_HEDERA_POWER;

  return power;
}

// Submit event vote to HCS
export async function submitEventVoteToHCS(
  wallet: string,
  eventId: string,
  eventType: "nft" | "meetup" | "hackathon",
  vote: "up" | "down"
): Promise<{ transactionId: string; sequenceNumber: number } | null> {
  if (!HCS_EVENTS_TOPIC_ID || !HEDERA_OPERATOR_ID || !HEDERA_OPERATOR_KEY) {
    console.warn("HCS not configured, skipping vote submission");
    return null;
  }

  const client = getHederaClient();

  try {
    const message: EventVoteMessage = {
      type: "event_vote",
      version: 1,
      wallet,
      event_id: eventId,
      event_type: eventType,
      vote,
      timestamp: Date.now(),
    };

    const response = await new TopicMessageSubmitTransaction()
      .setTopicId(HCS_EVENTS_TOPIC_ID)
      .setMessage(JSON.stringify(message))
      .execute(client);

    const receipt = await response.getReceipt(client);

    return {
      transactionId: response.transactionId.toString(),
      sequenceNumber: Number(receipt.topicSequenceNumber),
    };
  } catch (error) {
    console.error("Failed to submit event vote to HCS:", error);
    return null;
  } finally {
    client.close();
  }
}

// Submit asset (token/NFT) vote to HCS
export async function submitAssetVoteToHCS(
  wallet: string,
  targetId: string, // Hedera token ID (0.0.XXXXX)
  targetType: "token" | "nft",
  vote: "up" | "down",
  elSantuarioCount: number,
  santuarioHederaCount: number
): Promise<{ transactionId: string; sequenceNumber: number } | null> {
  console.log("[HCS] submitAssetVoteToHCS called", { wallet, targetId, targetType, vote });
  console.log("[HCS] Config check:", {
    hasTopicId: !!HCS_ASSETS_TOPIC_ID,
    hasOperatorId: !!HEDERA_OPERATOR_ID,
    hasOperatorKey: !!HEDERA_OPERATOR_KEY,
    topicId: HCS_ASSETS_TOPIC_ID
  });

  if (!HCS_ASSETS_TOPIC_ID || !HEDERA_OPERATOR_ID || !HEDERA_OPERATOR_KEY) {
    console.warn("[HCS] Not configured, skipping vote submission");
    return null;
  }

  const client = getHederaClient();

  try {
    const votingPower = calculateVotingPower(elSantuarioCount, santuarioHederaCount);

    const message: AssetVoteMessage = {
      type: "asset_vote",
      version: 1,
      wallet,
      target_id: targetId,
      target_type: targetType,
      vote,
      voting_power: votingPower,
      holdings: {
        el_santuario: elSantuarioCount,
        santuario_hedera: santuarioHederaCount,
      },
      timestamp: Date.now(),
    };

    console.log("[HCS] Submitting message to topic:", HCS_ASSETS_TOPIC_ID);
    const response = await new TopicMessageSubmitTransaction()
      .setTopicId(HCS_ASSETS_TOPIC_ID)
      .setMessage(JSON.stringify(message))
      .execute(client);

    const receipt = await response.getReceipt(client);
    console.log("[HCS] SUCCESS! Sequence:", receipt.topicSequenceNumber?.toString());

    return {
      transactionId: response.transactionId.toString(),
      sequenceNumber: Number(receipt.topicSequenceNumber),
    };
  } catch (error) {
    console.error("[HCS] Failed to submit asset vote:", error);
    return null;
  } finally {
    client.close();
  }
}

// Event check-in message (dedicated attendance topic)
export interface EventCheckinMessage {
  type: "event_checkin";
  version: 2;
  wallet: string;
  event_id: string;
  event_name: string;
  event_type: string;
  timestamp: number;
}

// Submit event check-in to HCS (dedicated attendance topic)
export async function submitCheckinToHCS(
  wallet: string,
  eventId: string,
  eventName: string,
  eventType: string
): Promise<{ transactionId: string; sequenceNumber: number } | null> {
  if (!HCS_ATTENDANCE_TOPIC_ID || !HEDERA_OPERATOR_ID || !HEDERA_OPERATOR_KEY) {
    console.warn("[HCS] Attendance topic not configured, skipping check-in submission");
    return null;
  }

  const client = getHederaClient();

  try {
    const message: EventCheckinMessage = {
      type: "event_checkin",
      version: 2,
      wallet,
      event_id: eventId,
      event_name: eventName,
      event_type: eventType,
      timestamp: Date.now(),
    };

    const response = await new TopicMessageSubmitTransaction()
      .setTopicId(HCS_ATTENDANCE_TOPIC_ID)
      .setMessage(JSON.stringify(message))
      .execute(client);

    const receipt = await response.getReceipt(client);

    return {
      transactionId: response.transactionId.toString(),
      sequenceNumber: Number(receipt.topicSequenceNumber),
    };
  } catch (error) {
    console.error("[HCS] Failed to submit check-in:", error);
    return null;
  } finally {
    client.close();
  }
}

// Batch submit multiple votes (for migration)
export async function submitBatchVotesToHCS(
  votes: Array<{
    type: "event" | "asset";
    wallet: string;
    targetId: string;
    targetType?: "token" | "nft";
    eventType?: "nft" | "meetup" | "hackathon";
    vote: "up" | "down";
    elSantuarioCount?: number;
    santuarioHederaCount?: number;
    timestamp: number;
  }>
): Promise<{ success: number; failed: number }> {
  if (!HEDERA_OPERATOR_ID || !HEDERA_OPERATOR_KEY) {
    console.warn("HCS not configured, skipping batch submission");
    return { success: 0, failed: votes.length };
  }

  const client = getHederaClient();
  let success = 0;
  let failed = 0;

  try {
    for (const vote of votes) {
      try {
        if (vote.type === "event") {
          const message: EventVoteMessage = {
            type: "event_vote",
            version: 1,
            wallet: vote.wallet,
            event_id: vote.targetId,
            event_type: vote.eventType || "nft",
            vote: vote.vote,
            timestamp: vote.timestamp,
          };

          await new TopicMessageSubmitTransaction()
            .setTopicId(HCS_EVENTS_TOPIC_ID)
            .setMessage(JSON.stringify(message))
            .execute(client);
        } else {
          const votingPower = calculateVotingPower(
            vote.elSantuarioCount || 0,
            vote.santuarioHederaCount || 0
          );

          const message: AssetVoteMessage = {
            type: "asset_vote",
            version: 1,
            wallet: vote.wallet,
            target_id: vote.targetId,
            target_type: vote.targetType || "token",
            vote: vote.vote,
            voting_power: votingPower,
            holdings: {
              el_santuario: vote.elSantuarioCount || 0,
              santuario_hedera: vote.santuarioHederaCount || 0,
            },
            timestamp: vote.timestamp,
          };

          await new TopicMessageSubmitTransaction()
            .setTopicId(HCS_ASSETS_TOPIC_ID)
            .setMessage(JSON.stringify(message))
            .execute(client);
        }

        success++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to submit vote:`, error);
        failed++;
      }
    }
  } finally {
    client.close();
  }

  return { success, failed };
}
