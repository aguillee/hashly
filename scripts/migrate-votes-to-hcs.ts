import { PrismaClient } from "@prisma/client";
import {
  Client,
  TopicMessageSubmitTransaction,
  PrivateKey,
} from "@hashgraph/sdk";

const prisma = new PrismaClient();

// Config
const HCS_EVENTS_TOPIC_ID = process.env.HCS_EVENTS_TOPIC_ID || "0.0.10279947";
const HCS_ASSETS_TOPIC_ID = process.env.HCS_ASSETS_TOPIC_ID || "0.0.10279948";
const HEDERA_OPERATOR_ID = process.env.HEDERA_OPERATOR_ID || "0.0.10279885";
const HEDERA_OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY || "";

function getHederaClient(): Client {
  if (!HEDERA_OPERATOR_KEY) {
    throw new Error("HEDERA_OPERATOR_KEY not configured");
  }
  const client = Client.forMainnet();
  const operatorKey = PrivateKey.fromStringECDSA(HEDERA_OPERATOR_KEY);
  client.setOperator(HEDERA_OPERATOR_ID, operatorKey);
  return client;
}

// Migrate event votes (table: votes)
// Includes vote_weight calculated from nft_votes
async function migrateEventVotes(client: Client) {
  console.log("\n📊 Migrating Event Votes...");

  const votes = await prisma.vote.findMany({
    include: {
      event: {
        select: {
          id: true,
          event_type: true,
        },
      },
      user: {
        select: {
          walletAddress: true,
        },
      },
    },
  });

  console.log(`Found ${votes.length} event votes to migrate`);

  // Get all nft_votes to calculate weights
  const nftVotes = await prisma.nftVote.findMany({
    select: {
      walletAddress: true,
      eventId: true,
      voteWeight: true,
    },
  });

  // Create map: wallet+event -> total nft weight
  const nftWeightMap = new Map<string, number>();
  for (const nv of nftVotes) {
    const key = `${nv.walletAddress}-${nv.eventId}`;
    nftWeightMap.set(key, (nftWeightMap.get(key) || 0) + nv.voteWeight);
  }

  let success = 0;
  let failed = 0;

  for (const vote of votes) {
    try {
      const eventTypeMap: Record<string, "nft" | "meetup" | "hackathon"> = {
        MINT_EVENT: "nft",
        ECOSYSTEM_MEETUP: "meetup",
        HACKATHON: "hackathon",
      };

      // Calculate total weight: 1 base + nft bonus
      const key = `${vote.user.walletAddress}-${vote.eventId}`;
      const nftBonus = nftWeightMap.get(key) || 0;
      const voteWeight = 1 + nftBonus;

      const message = {
        type: "event_vote",
        version: 1,
        wallet: vote.user.walletAddress,
        event_id: vote.eventId,
        event_type: eventTypeMap[vote.event.event_type] || "nft",
        vote: vote.voteType.toLowerCase(),
        vote_weight: voteWeight,
        timestamp: vote.createdAt.getTime(),
      };

      await new TopicMessageSubmitTransaction()
        .setTopicId(HCS_EVENTS_TOPIC_ID)
        .setMessage(JSON.stringify(message))
        .execute(client);

      success++;
      process.stdout.write(`\r  Event votes: ${success}/${votes.length}`);
    } catch (error) {
      failed++;
      console.error(`\n  Failed: ${vote.id}`, error);
    }
  }

  console.log(`\n  ✅ Event votes: ${success} success, ${failed} failed`);
  return { success, failed };
}

// Migrate token votes (table: token_votes)
async function migrateTokenVotes(client: Client) {
  console.log("\n📊 Migrating Token Votes...");

  const votes = await prisma.tokenVote.findMany({
    include: {
      token: {
        select: {
          tokenAddress: true,
        },
      },
    },
  });

  console.log(`Found ${votes.length} token votes to migrate`);

  let success = 0;
  let failed = 0;

  for (const vote of votes) {
    try {
      const message = {
        type: "asset_vote",
        version: 1,
        wallet: vote.walletAddress,
        target_id: vote.token.tokenAddress,
        target_type: "token",
        vote: vote.voteWeight > 0 ? "up" : "down",
        voting_power: Math.abs(vote.voteWeight),
        timestamp: vote.createdAt.getTime(),
      };

      await new TopicMessageSubmitTransaction()
        .setTopicId(HCS_ASSETS_TOPIC_ID)
        .setMessage(JSON.stringify(message))
        .execute(client);

      success++;
      process.stdout.write(`\r  Token votes: ${success}/${votes.length}`);
    } catch (error) {
      failed++;
      console.error(`\n  Failed: ${vote.id}`, error);
    }
  }

  console.log(`\n  ✅ Token votes: ${success} success, ${failed} failed`);
  return { success, failed };
}

// Migrate collection votes (table: collection_votes)
async function migrateCollectionVotes(client: Client) {
  console.log("\n📊 Migrating Collection Votes...");

  const votes = await prisma.collectionVote.findMany({
    include: {
      collection: {
        select: {
          tokenAddress: true,
        },
      },
    },
  });

  console.log(`Found ${votes.length} collection votes to migrate`);

  let success = 0;
  let failed = 0;

  for (const vote of votes) {
    try {
      const message = {
        type: "asset_vote",
        version: 1,
        wallet: vote.walletAddress,
        target_id: vote.collection.tokenAddress,
        target_type: "nft",
        vote: vote.voteWeight > 0 ? "up" : "down",
        voting_power: Math.abs(vote.voteWeight),
        timestamp: vote.createdAt.getTime(),
      };

      await new TopicMessageSubmitTransaction()
        .setTopicId(HCS_ASSETS_TOPIC_ID)
        .setMessage(JSON.stringify(message))
        .execute(client);

      success++;
      process.stdout.write(`\r  Collection votes: ${success}/${votes.length}`);
    } catch (error) {
      failed++;
      console.error(`\n  Failed: ${vote.id}`, error);
    }
  }

  console.log(`\n  ✅ Collection votes: ${success} success, ${failed} failed`);
  return { success, failed };
}

async function main() {
  console.log("🚀 Hashly HCS Vote Migration");
  console.log("============================");
  console.log(`Events Topic: ${HCS_EVENTS_TOPIC_ID}`);
  console.log(`Assets Topic: ${HCS_ASSETS_TOPIC_ID}`);
  console.log(`Operator: ${HEDERA_OPERATOR_ID}`);

  if (!HEDERA_OPERATOR_KEY) {
    console.error("\n❌ HEDERA_OPERATOR_KEY not set");
    process.exit(1);
  }

  const client = getHederaClient();

  try {
    const results = {
      events: await migrateEventVotes(client),
      tokens: await migrateTokenVotes(client),
      collections: await migrateCollectionVotes(client),
    };

    console.log("\n============================");
    console.log("📋 Summary:");
    console.log(`  Events: ${results.events.success} ok, ${results.events.failed} fail`);
    console.log(`  Tokens: ${results.tokens.success} ok, ${results.tokens.failed} fail`);
    console.log(`  Collections: ${results.collections.success} ok, ${results.collections.failed} fail`);

    const total = results.events.success + results.tokens.success + results.collections.success;
    console.log(`\n  Total: ${total} votes migrated`);
    console.log("============================");
  } finally {
    client.close();
    await prisma.$disconnect();
  }
}

main();
