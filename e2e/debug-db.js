const { execSync } = require('child_process');
const postgres = require('postgres');

async function run() {
  console.log('Spinning up...');
  execSync('npm run test:db:up', { stdio: 'inherit' });
  
  console.log('Pushing...');
  execSync('npx drizzle-kit push', { 
    stdio: 'inherit', 
    env: { ...process.env, DATABASE_URL: 'postgresql://test_user:test_password@localhost:54322/eitams_test' }
  });
  
  console.log('Querying...');
  const sql = postgres('postgresql://test_user:test_password@localhost:54322/eitams_test');
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log('Tables:', tables.map(t => t.table_name));
  
  await sql.end();
  console.log('Spinning down...');
  execSync('npm run test:db:down', { stdio: 'inherit' });
}
run();
