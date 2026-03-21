import { Client } from 'pg';
import 'dotenv/config';

async function createDatabase() {
  const connectionString = process.env.DATABASE_URL?.replace('/codeheist', '/postgres');
  console.log('Connecting to postgres database to create codeheist...');
  
  const client = new Client({ connectionString });
  try {
    await client.connect();
    // Check if it exists again just in case
    const checkRes = await client.query("SELECT 1 FROM pg_database WHERE datname = 'codeheist'");
    if (checkRes.rowCount === 0) {
      await client.query('CREATE DATABASE codeheist;');
      console.log('✅ SUCCESS: Database codeheist created!');
    } else {
      console.log('ℹ️ INFO: Database codeheist already exists.');
    }
    await client.end();
  } catch (err: any) {
    console.error(`❌ FAILED to create database: ${err.message}`);
  }
}

createDatabase();
