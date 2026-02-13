/**
 * Hedera Consensus Service (HCS) utilities for Sentiment Index
 *
 * Topic messages are immutable and provide on-chain proof of votes.
 */

// HCS Topic ID for sentiment votes
// Mainnet: 0.0.10276748
export const SENTIMENT_TOPIC_ID = process.env.SENTIMENT_TOPIC_ID || "0.0.10276748";

// Message structure for sentiment votes
export interface SentimentVoteMessage {
  type: "sentiment_vote";
  version: 1;
  wallet: string;
  category: "nft" | "network" | "hbar";
  vote: "bullish" | "bearish";
  date: string; // "2024-02-13"
  timestamp: number;
}

/**
 * Create a sentiment vote message payload
 */
export function createSentimentVoteMessage(
  wallet: string,
  category: "nft" | "network" | "hbar",
  vote: "bullish" | "bearish",
  date: string
): SentimentVoteMessage {
  return {
    type: "sentiment_vote",
    version: 1,
    wallet,
    category,
    vote,
    date,
    timestamp: Date.now(),
  };
}

/**
 * Get today's date in UTC as YYYY-MM-DD
 */
export function getTodayUTC(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Get time until next UTC midnight in milliseconds
 */
export function getTimeUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

/**
 * Format time remaining as "Xh Ym"
 */
export function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

/**
 * Calculate sentiment score from votes (0-100)
 * Formula: ((bullish - bearish) / total) * 50 + 50
 */
export function calculateScore(bullish: number, bearish: number): number | null {
  const total = bullish + bearish;
  if (total === 0) return null;

  const score = ((bullish - bearish) / total) * 50 + 50;
  return Math.round(score * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate smoothed global score using 3-day weighted average
 * Formula: (today * 0.5) + (yesterday * 0.3) + (dayBefore * 0.2)
 */
export function calculateSmoothedScore(
  todayScore: number | null,
  yesterdayScore: number | null,
  dayBeforeScore: number | null
): number | null {
  // Need at least today's score
  if (todayScore === null) return null;

  // If we only have today, return it
  if (yesterdayScore === null) return todayScore;

  // If we have 2 days
  if (dayBeforeScore === null) {
    return Math.round((todayScore * 0.6 + yesterdayScore * 0.4) * 10) / 10;
  }

  // Full 3-day smoothing
  return Math.round(
    (todayScore * 0.5 + yesterdayScore * 0.3 + dayBeforeScore * 0.2) * 10
  ) / 10;
}

/**
 * Calculate global score from category scores
 * Weights: Network 50%, HBAR 30%, NFT 20%
 */
export function calculateGlobalScore(
  nftScore: number | null,
  networkScore: number | null,
  hbarScore: number | null
): number | null {
  const scores = [
    { score: nftScore, weight: 0.20 },
    { score: networkScore, weight: 0.50 },
    { score: hbarScore, weight: 0.30 },
  ].filter(s => s.score !== null);

  if (scores.length === 0) return null;

  // Normalize weights if some categories have no votes
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = scores.reduce(
    (sum, s) => sum + (s.score! * s.weight / totalWeight),
    0
  );

  return Math.round(weightedSum * 10) / 10;
}

/**
 * Get sentiment label from score
 */
export function getSentimentLabel(score: number | null): string {
  if (score === null) return "No Data";
  if (score <= 20) return "Extreme Fear";
  if (score <= 40) return "Fear";
  if (score <= 60) return "Neutral";
  if (score <= 80) return "Greed";
  return "Extreme Greed";
}

/**
 * Get sentiment color class from score
 */
export function getSentimentColor(score: number | null): string {
  if (score === null) return "text-text-secondary";
  if (score <= 20) return "text-red-500";
  if (score <= 40) return "text-orange-500";
  if (score <= 60) return "text-yellow-500";
  if (score <= 80) return "text-lime-500";
  return "text-green-500";
}

/**
 * Get sentiment background color class from score
 */
export function getSentimentBgColor(score: number | null): string {
  if (score === null) return "bg-gray-500/20";
  if (score <= 20) return "bg-red-500/20";
  if (score <= 40) return "bg-orange-500/20";
  if (score <= 60) return "bg-yellow-500/20";
  if (score <= 80) return "bg-lime-500/20";
  return "bg-green-500/20";
}
