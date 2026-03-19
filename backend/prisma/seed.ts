import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';

const { Pool } = pkg;

// Create connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// 1. Keep the constructor empty. 
// Prisma 7.5.0 reads your prisma.config.ts automatically.
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  adapter,
});

async function main() {
  console.log("🔓 Aegis Vault: Initializing Seed...");

  const team = await prisma.team.upsert({
    where: { teamId: 'HEIST-001' },
    update: {},
    create: {
      teamId: 'HEIST-001',
      teamName: 'The Shadow Coders',
      password: 'password123',
      credits: 1000,
    },
  });
  console.log(`✅ Team Ghost Infiltrated: ${team.teamName}`);

  const problem = await prisma.problem.create({
    data: {
      title: "The C-Buffer Overflow",
      category: 'C',
      description: "Fix the memory leak in this string copy function.",
      buggyCode: "void hack() { char buf[8]; strcpy(buf, input); }",
      language: "c",
      testCases: [{ input: "short", expectedOutput: "success" }],
      basePrice: 200
    }
  });
  console.log(`✅ Buggy Target Locked: ${problem.title}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
