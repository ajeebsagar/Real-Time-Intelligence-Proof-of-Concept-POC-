// Database Setup Script
const { Client } = require('pg');

async function setupDatabase() {
  // Connect to postgres database to create our database
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Check if database exists
    const checkDb = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'realtime_intelligence'"
    );

    if (checkDb.rows.length === 0) {
      // Create database
      await client.query('CREATE DATABASE realtime_intelligence');
      console.log('✅ Database "realtime_intelligence" created successfully!');
    } else {
      console.log('✅ Database "realtime_intelligence" already exists!');
    }

    await client.end();
    console.log('\n✅ Database setup complete!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run prisma:migrate');
    console.log('2. Run: npm run dev');
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.log('\nPlease ensure:');
    console.log('1. PostgreSQL is installed and running');
    console.log('2. Default postgres user password is "password"');
    console.log('3. Or update DATABASE_URL in .env file with correct credentials');
    process.exit(1);
  }
}

setupDatabase();
