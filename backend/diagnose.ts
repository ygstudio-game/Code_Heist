import pg from 'pg';
import 'dotenv/config';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
  console.log('TABLES:' + JSON.stringify(tables.rows.map(r => r.table_name)));
  
  const teams = await pool.query('SELECT id, name, "accessKey" FROM "Team" ORDER BY name');
  console.log('TEAMS:' + JSON.stringify(teams.rows));
  
  await pool.end();
}
main();
