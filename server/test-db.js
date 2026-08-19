require('dotenv').config();
const mongoose = require('mongoose');

console.log('Connecting to local MongoDB...');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('SUCCESS: Connected to local MongoDB!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('FAILED:', err.message);
    process.exit(1);
  });
