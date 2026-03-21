import { PrismaClient } from './generated-client';import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const teamPassword = await bcrypt.hash('team123', 10);
  
  // 1. Create Admins
  const admins = [
    { name: 'Aegis Command', key: 'AEGIS_ADMIN', pass: 'admin123' },
    { name: 'Root Override', key: 'admin', pass: 'admin123' },
  ];

  for (const a of admins) {
    const pass = await bcrypt.hash(a.pass, 10);
    await prisma.team.upsert({
      where: { accessKey: a.key },
      update: {},
      create: {
        name: a.name,
        accessKey: a.key,
        password: pass,
        role: 'ADMIN',
        credits: 99999,
      },
    });
  }

  // 2. Create 3 Test Teams
  const teams = [
    { name: 'Phantom Unit', key: 'PHANTOM_77' },
    { name: 'Zero Day', key: 'ZERO_DAY_01' },
    { name: 'Ghost Protocol', key: 'GHOST_PROTO' },
  ];

  for (const t of teams) {
    await prisma.team.upsert({
      where: { accessKey: t.key },
      update: {},
      create: {
        name: t.name,
        accessKey: t.key,
        password: teamPassword,
        credits: 1000,
        members: {
          create: [{ name: 'Operator 1' }, { name: 'Operator 2' }],
        },
      },
    });
  }

  // 3. Create Sample Snippets
  await prisma.snippet.create({
    data: {
      title: 'Buffer Overflow Vulnerability',
      category: 'C',
      buggyCode: `void hack(char *input) {\n  char buffer[64];\n  strcpy(buffer, input);\n}`,
      solution: `void hack(char *input) {\n  char buffer[64];\n  strncpy(buffer, input, sizeof(buffer) - 1);\n  buffer[sizeof(buffer) - 1] = '\\0';\n}`,
      isActive: true,
      order: 1,
    },
  });

  console.log('✅ Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });