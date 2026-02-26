// Topic created on mainnet:
// HCS_ATTENDANCE_TOPIC_ID=0.0.10300837
// Submit Key: 0.0.10279885
// Admin Key: None (immutable)
// Memo: "Hashly - Event Attendance"
//
// This script was used to create the topic. Do not run again.

import {
  Client,
  TopicCreateTransaction,
  PrivateKey,
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const HEDERA_OPERATOR_ID = process.env.HEDERA_OPERATOR_ID!;
const HEDERA_OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY!;

async function main() {
  if (!HEDERA_OPERATOR_ID || !HEDERA_OPERATOR_KEY) {
    console.error("Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_KEY in .env.local");
    process.exit(1);
  }

  const client = Client.forMainnet();
  const operatorKey = PrivateKey.fromStringECDSA(HEDERA_OPERATOR_KEY);
  client.setOperator(HEDERA_OPERATOR_ID, operatorKey);

  console.log("Creating attendance topic on mainnet...");
  console.log("Operator:", HEDERA_OPERATOR_ID);

  try {
    const tx = new TopicCreateTransaction()
      .setTopicMemo("Hashly - Event Attendance")
      .setSubmitKey(operatorKey.publicKey);
    // No admin key → immutable topic

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    const topicId = receipt.topicId!.toString();

    console.log("\n✅ Attendance topic created!");
    console.log(`HCS_ATTENDANCE_TOPIC_ID=${topicId}`);
    console.log(`Submit Key: ${HEDERA_OPERATOR_ID}`);
    console.log("Admin Key: None (immutable)");
    console.log(`\nAdd to .env.local:\nHCS_ATTENDANCE_TOPIC_ID=${topicId}`);
  } catch (error) {
    console.error("Failed to create topic:", error);
  } finally {
    client.close();
  }
}

main();
