import bcrypt from 'bcryptjs';
import { sequelize, User, Attendance } from './src/models/index.js';

const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await User.findOrCreate({
      where: { username: 'admin' },
      defaults: {
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        email: 'admin@example.com',
        password: adminPassword,
        role: 'admin',
        designation: 'System Administrator',
        isActive: true
      }
    });

    // Create government user
    const govPassword = await bcrypt.hash('gov123', 12);
    const government = await User.findOrCreate({
      where: { username: 'government' },
      defaults: {
        firstName: 'Government',
        lastName: 'Official',
        username: 'government',
        email: 'government@example.com',
        password: govPassword,
        role: 'government',
        designation: 'Aviation Inspector',
        isActive: true
      }
    });

    // Create some regular users
    const userPassword = await bcrypt.hash('user123', 12);
    
    const users = [
      {
        firstName: 'John',
        lastName: 'Doe',
        username: 'john.doe',
        email: 'john.doe@example.com',
        password: userPassword,
        role: 'user',
        designation: 'Medical Officer',
        phoneNumber: '+1234567890',
        isActive: true
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'jane.smith',
        email: 'jane.smith@example.com',
        password: userPassword,
        role: 'user',
        designation: 'Nurse',
        phoneNumber: '+1234567891',
        isActive: true
      },
      {
        firstName: 'Mike',
        lastName: 'Johnson',
        username: 'mike.johnson',
        email: 'mike.johnson@example.com',
        password: userPassword,
        role: 'user',
        designation: 'Ground Staff',
        phoneNumber: '+1234567892',
        isActive: true
      },
      {
        firstName: 'Sarah',
        lastName: 'Wilson',
        username: 'sarah.wilson',
        email: 'sarah.wilson@example.com',
        password: userPassword,
        role: 'user',
        designation: 'Ground Staff',
        phoneNumber: '+1234567893',
        isActive: true
      }
    ];

    const createdUsers = [];
    for (const userData of users) {
      const [user] = await User.findOrCreate({
        where: { username: userData.username },
        defaults: userData
      });
      createdUsers.push(user);
    }

    console.log('✅ Users created successfully');

    // Create some attendance records
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const attendanceRecords = [
      // Today's records
      {
        userId: createdUsers[0].id,
        date: today.toISOString().split('T')[0],
        checkInTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 30),
        checkOutTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0),
        hoursWorked: 8.5,
        status: 'present',
        notes: 'Regular shift'
      },
      {
        userId: createdUsers[1].id,
        date: today.toISOString().split('T')[0],
        checkInTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 15),
        checkOutTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 30),
        hoursWorked: 8.25,
        status: 'late',
        notes: 'Arrived 15 minutes late due to traffic'
      },
      {
        userId: createdUsers[2].id,
        date: today.toISOString().split('T')[0],
        checkInTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0),
        checkOutTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 30),
        hoursWorked: 8.5,
        status: 'present',
        notes: 'Early shift'
      },
      {
        userId: createdUsers[3].id,
        date: today.toISOString().split('T')[0],
        status: 'absent',
        notes: 'Sick leave'
      },
      // Yesterday's records
      {
        userId: createdUsers[0].id,
        date: yesterday.toISOString().split('T')[0],
        checkInTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 8, 45),
        checkOutTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 17, 15),
        hoursWorked: 8.5,
        status: 'present',
        notes: 'Regular shift'
      },
      {
        userId: createdUsers[1].id,
        date: yesterday.toISOString().split('T')[0],
        checkInTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 8, 30),
        checkOutTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 17, 0),
        hoursWorked: 8.5,
        status: 'present',
        notes: 'Regular shift'
      },
      {
        userId: createdUsers[2].id,
        date: yesterday.toISOString().split('T')[0],
        checkInTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 8, 0),
        checkOutTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 16, 30),
        hoursWorked: 8.5,
        status: 'present',
        notes: 'Early shift'
      },
      {
        userId: createdUsers[3].id,
        date: yesterday.toISOString().split('T')[0],
        checkInTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 9, 30),
        checkOutTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 18, 0),
        hoursWorked: 8.5,
        status: 'late',
        notes: 'Arrived 30 minutes late'
      }
    ];

    for (const record of attendanceRecords) {
      await Attendance.findOrCreate({
        where: {
          userId: record.userId,
          date: record.date
        },
        defaults: record
      });
    }

    console.log('✅ Attendance records created successfully');
    console.log('\n📋 Test Credentials:');
    console.log('Admin: username=admin, password=admin123');
    console.log('Government: username=government, password=gov123');
    console.log('User: username=john.doe, password=user123');
    console.log('\n🎉 Database seeding completed!');

  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    await sequelize.close();
  }
};

seedData();