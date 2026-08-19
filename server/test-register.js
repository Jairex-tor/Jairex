require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');
  
  // Check what routes exist
  const User = require('./src/models/User');
  
  try {
    const u = new User({ username: 'testuser', email: 'test@test.com', password: '123456' });
    await u.save();
    console.log('User created successfully:', u.toJSON());
  } catch (e) {
    console.error('User creation error:', e.message);
  }
  
  await mongoose.disconnect();
  process.exit(0);
}

test();
