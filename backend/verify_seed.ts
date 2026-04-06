import { PrismaClient } from './prisma/generated-client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

async function verify() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const teams = await prisma.team.findMany();
    const snippets = await prisma.snippet.findMany();
    console.log(`Teams: ${teams.length}`);
    teams.forEach(t => console.log(` - ${t.name} (Key: ${t.accessKey})`));
    console.log(`Snippets: ${snippets.length}`);
    snippets.forEach(s => console.log(` - ${s.title}`));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
