import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const { Pool } = pkg;

// Determine Postgres Pool connection string natively via process.env
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
pool.on('connect', () => {
    console.log('Connected to database');
});
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;
