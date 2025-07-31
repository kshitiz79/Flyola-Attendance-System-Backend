import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  const configs = [
    { user: process.env.DB_USER, password: process.env.DB_PASSWORD },
    { user: 'root', password: 'MyNewPassword123!' },
    { user: 'root', password: '' },
    { user: 'root', password: 'root' },
  ];

  for (const config of configs) {
    try {
      console.log(`Testing connection with user: ${config.user}, password: ${config.password || '(empty)'}`);
      
      const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: config.user,
        password: config.password
      });

      console.log('✅ Connection successful!');
      console.log('Database credentials that work:');
      console.log(`  User: ${config.user}`);
      console.log(`  Password: ${config.password || '(empty)'}`);
      
      await connection.end();
      return config;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n❌ None of the common credentials worked.');
  console.log('Please check your MySQL installation and set up credentials.');
  console.log('\nTo set up MySQL:');
  console.log('1. Install MySQL if not installed');
  console.log('2. Set a root password or create a new user');
  console.log('3. Update the .env file with correct credentials');
}

testConnection();