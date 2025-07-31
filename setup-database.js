import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔄 Connecting to MySQL...');
    
    // Connect to MySQL server (without specifying database)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL server');

    // Execute SQL statements one by one
    console.log('🔄 Creating database...');
    await connection.execute('CREATE DATABASE IF NOT EXISTS aviation_attendance_system');
    
    console.log('🔄 Reconnecting to specific database...');
    await connection.end();
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: 'aviation_attendance_system'
    });
    
    console.log('🔄 Disabling foreign key checks...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    console.log('🔄 Dropping existing tables...');
    await connection.execute('DROP TABLE IF EXISTS attendance');
    await connection.execute('DROP TABLE IF EXISTS users');
    
    console.log('🔄 Re-enabling foreign key checks...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('🔄 Creating users table...');
    await connection.execute(`
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'government', 'user') NOT NULL,
        firstName VARCHAR(50) NOT NULL,
        lastName VARCHAR(50) NOT NULL,
        phoneNumber VARCHAR(20),
        designation VARCHAR(100),
        isActive BOOLEAN DEFAULT TRUE,
        lastLogin DATETIME NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    console.log('🔄 Creating attendance table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT PRIMARY KEY AUTO_INCREMENT,
        userId INT NOT NULL,
        date DATE NOT NULL,
        checkInTime DATETIME,
        checkOutTime DATETIME,
        hoursWorked DECIMAL(4,2),
        status ENUM('present', 'absent', 'late') DEFAULT 'present',
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        notes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_date (userId, date)
      )
    `);
    
    console.log('🔄 Inserting test users...');
    await connection.execute(`
      INSERT INTO users (username, email, password, role, firstName, lastName, phoneNumber, designation, isActive) VALUES 
      ('admin', 'admin@aviation.com', '$2b$12$4xg4pxTy55TDns9fQ0rLg.5IqX3KCT/AzPZZY7g012cDH4ffDyNom', 'admin', 'System', 'Administrator', '+1234567890', 'System Administrator', TRUE),
      ('government', 'gov@aviation.com', '$2b$12$HNmP/qK5Bp.QJ7BQqkwemO5tT1Shi4d58FFHiOtQAwnLcpFsUdV02', 'government', 'Government', 'Observer', '+1234567891', 'Government Official', TRUE),
      ('user', 'user@aviation.com', '$2b$12$PQbYhqpJElqFBxbZz7wN8O5Oilu.41fplFvWvlSqyiQOSNI7nTHY2', 'user', 'John', 'Doe', '+1234567892', 'Aviation Staff', TRUE)
    `);
    
    console.log('✅ Database setup completed successfully!');
    
    // Test the connection to the new database
    await connection.changeUser({
      database: process.env.DB_NAME || 'aviation_attendance_system'
    });
    
    console.log('✅ Connected to aviation_attendance_system database');
    
    // Verify users were created
    const [users] = await connection.execute('SELECT username, role, firstName, lastName FROM users');
    
    console.log('\n📋 Created users:');
    users.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.username}) - Role: ${user.role}`);
    });
    
    console.log('\n🔑 Login Credentials:');
    console.log('  Admin: admin / admin123');
    console.log('  Government: government / gov123');
    console.log('  User: user / user123');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Please check your database credentials in the .env file:');
      console.log(`  DB_HOST=${process.env.DB_HOST}`);
      console.log(`  DB_PORT=${process.env.DB_PORT}`);
      console.log(`  DB_USER=${process.env.DB_USER}`);
      console.log(`  DB_PASSWORD=${process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]'}`);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

setupDatabase();