import { Client } from 'pg';
import 'dotenv/config';

async function listDatabases() {
  const connectionString = process.env.DATABASE_URL?.replace('/codeheist', '/postgres');
  console.log('Connecting to postgres database to list others...');
  
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
    console.log('Available databases:');
    res.rows.forEach(row => console.log(`- ${row.datname}`));
    await client.end();
  } catch (err: any) {
    console.error(`❌ FAILED to list databases: ${err.message}`);
  }
}

listDatabases();
