// Script to generate bcrypt password hashes for the SQL insert script
import bcrypt from 'bcrypt';

const passwords = {
  'admin123': null,
  'gov123': null,
  'user123': null
};

async function generateHashes() {
  console.log('Generating bcrypt password hashes...\n');
  
  for (const [password, _] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 12);
    passwords[password] = hash;
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}\n`);
  }
  
  console.log('SQL INSERT statements with proper hashes:');
  console.log('=====================================\n');
  
  console.log(`-- Admin User (admin / admin123)`);
  console.log(`INSERT INTO users (username, email, password, role, firstName, lastName, phoneNumber, designation, isActive) VALUES`);
  console.log(`('admin', 'admin@aviation.com', '${passwords['admin123']}', 'admin', 'System', 'Administrator', '+1234567890', 'System Administrator', TRUE);\n`);
  
  console.log(`-- Government User (government / gov123)`);
  console.log(`INSERT INTO users (username, email, password, role, firstName, lastName, phoneNumber, designation, isActive) VALUES`);
  console.log(`('government', 'gov@aviation.com', '${passwords['gov123']}', 'government', 'Government', 'Observer', '+1234567891', 'Government Official', TRUE);\n`);
  
  console.log(`-- Regular User (user / user123)`);
  console.log(`INSERT INTO users (username, email, password, role, firstName, lastName, phoneNumber, designation, isActive) VALUES`);
  console.log(`('user', 'user@aviation.com', '${passwords['user123']}', 'user', 'John', 'Doe', '+1234567892', 'Aviation Staff', TRUE);\n`);
}

generateHashes().catch(console.error);