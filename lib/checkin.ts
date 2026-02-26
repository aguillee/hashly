import { createHmac } from "crypto";

const CHECKIN_SECRET = process.env.CHECKIN_HMAC_SECRET || process.env.JWT_SECRET || "checkin-dev-secret";
const SLOT_DURATION_MS = 60_000; // 60 seconds

/**
 * Get the current time slot (changes every 30 seconds)
 */
function getTimeSlot(offsetSlots = 0): number {
  return Math.floor(Date.now() / SLOT_DURATION_MS) + offsetSlots;
}

/**
 * Generate an HMAC-based check-in code for a given event and time slot.
 * Code = HMAC-SHA256(eventId + ":" + timeSlot, secret) truncated to 12 hex chars
 */
function generateCodeForSlot(eventId: string, slot: number): string {
  const data = `${eventId}:${slot}`;
  return createHmac("sha256", CHECKIN_SECRET)
    .update(data)
    .digest("hex")
    .slice(0, 12);
}

/**
 * Generate the current check-in code for an event.
 * Returns the code and when it expires.
 */
export function generateCheckinCode(eventId: string): {
  code: string;
  expiresAt: number;
} {
  const slot = getTimeSlot();
  const code = generateCodeForSlot(eventId, slot);
  const expiresAt = (slot + 1) * SLOT_DURATION_MS;

  return { code, expiresAt };
}

/**
 * Validate a check-in code against the current and previous time slot.
 * This gives a real window of ~30-60 seconds.
 */
export function validateCheckinCode(eventId: string, code: string): boolean {
  const currentSlot = getTimeSlot();
  const currentCode = generateCodeForSlot(eventId, currentSlot);
  const previousCode = generateCodeForSlot(eventId, currentSlot - 1);

  return code === currentCode || code === previousCode;
}
