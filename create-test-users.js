import { sequelize, User } from './models/index.js';
import bcrypt from 'bcrypt';

async function createTestUsers() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Sync models
    await sequelize.sync({ force: false });
    console.log('✅ Database models synced');

    // Check if users already exist
    const existingAdmin = await User.findOne({ where: { username: 'admin' } });
    const existingGov = await User.findOne({ where: { username: 'government' } });
    const existingUser = await User.findOne({ where: { username: 'user' } });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists, deleting...');
      await existingAdmin.destroy();
    }

    if (existingGov) {
      console.log('⚠️  Government user already exists, deleting...');
      await existingGov.destroy();
    }

    if (existingUser) {
      console.log('⚠️  User already exists, deleting...');
      await existingUser.destroy();
    }

    // Create admin user
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@aviation.com',
      password: 'admin123', // This will be hashed automatically by the model hook
      role: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      designation: 'System Administrator',
      phoneNumber: '+1234567890'
    });

    console.log('✅ Admin user created:', {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role
    });

    // Create government user
    const govUser = await User.create({
      username: 'government',
      email: 'gov@aviation.com',
      password: 'gov123', // This will be hashed automatically by the model hook
      role: 'government',
      firstName: 'Government',
      lastName: 'Observer',
      designation: 'Government Official',
      phoneNumber: '+1234567891'
    });

    console.log('✅ Government user created:', {
      id: govUser.id,
      username: govUser.username,
      email: govUser.email,
      role: govUser.role
    });

    // Create regular user
    const regularUser = await User.create({
      username: 'user',
      email: 'user@aviation.com',
      password: 'user123', // This will be hashed automatically by the model hook
      role: 'user',
      firstName: 'John',
      lastName: 'Doe',
      designation: 'Aviation Staff',
      phoneNumber: '+1234567892'
    });

    console.log('✅ Regular user created:', {
      id: regularUser.id,
      username: regularUser.username,
      email: regularUser.email,
      role: regularUser.role
    });

    // Test password validation
    console.log('\n🔍 Testing password validation...');
    
    const testAdmin = await User.findOne({ where: { username: 'admin' } });
    const adminPasswordValid = await testAdmin.validatePassword('admin123');
    console.log('Admin password validation:', adminPasswordValid ? '✅ Valid' : '❌ Invalid');

    const testGov = await User.findOne({ where: { username: 'government' } });
    const govPasswordValid = await testGov.validatePassword('gov123');
    console.log('Government password validation:', govPasswordValid ? '✅ Valid' : '❌ Invalid');

    const testUser = await User.findOne({ where: { username: 'user' } });
    const userPasswordValid = await testUser.validatePassword('user123');
    console.log('User password validation:', userPasswordValid ? '✅ Valid' : '❌ Invalid');

    console.log('\n✅ Test users created successfully!');
    console.log('\nLogin credentials:');
    console.log('Admin: username=admin, password=admin123');
    console.log('Government: username=government, password=gov123');
    console.log('User: username=user, password=user123');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await sequelize.close();
  }
}

createTestUsers();