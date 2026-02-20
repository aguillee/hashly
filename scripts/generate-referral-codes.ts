/**
 * One-time script to generate referral codes for all existing users.
 * Run with: npx tsx scripts/generate-referral-codes.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

async function main() {
  const usersWithoutCode = await prisma.user.findMany({
    where: { referralCode: null },
    select: { id: true, walletAddress: true },
  });

  console.log(`Found ${usersWithoutCode.length} users without referral codes`);

  const existingCodes = new Set<string>();

  // Get all existing codes first
  const existing = await prisma.user.findMany({
    where: { referralCode: { not: null } },
    select: { referralCode: true },
  });
  existing.forEach((u) => {
    if (u.referralCode) existingCodes.add(u.referralCode);
  });

  let updated = 0;
  for (const user of usersWithoutCode) {
    let code: string;
    do {
      code = randomCode();
    } while (existingCodes.has(code));

    existingCodes.add(code);

    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode: code },
    });

    updated++;
    if (updated % 50 === 0) {
      console.log(`Updated ${updated}/${usersWithoutCode.length}...`);
    }
  }

  console.log(`Done! Generated referral codes for ${updated} users.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
