require('dotenv').config();
const sequelize = require('./config/database');
const User = require('./models/User');
const Transaction = require('./models/Transaction');

const seedDatabase = async () => {
  try {
    console.log('Connecting to PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL successfully.');

    console.log('Syncing models and dropping existing tables...');
    // Force true drops the tables if they exist and re-creates them
    await sequelize.sync({ force: true });
    
    console.log('Creating dummy users...');
    const alice = await User.create({
      username: 'Alice',
      email: 'alice@test.com',
      pin: '1234',
      accountBalance: 5000,
      zk_public_key: 'dummy_zk_pub_key_alice_01'
    });

    const bob = await User.create({
      username: 'Bob',
      email: 'bob@test.com',
      pin: '5678',
      accountBalance: 1000,
      zk_public_key: 'dummy_zk_pub_key_bob_02'
    });

    console.log('\n🎉 Seeding completed successfully!');
    console.log('-------------------------------------');
    console.log('Alice User ID:', alice.id);
    console.log('Bob User ID:', bob.id);
    console.log('-------------------------------------\n');

  } catch (error) {
    console.error('❌ Database Seeding Error:', error);
  } finally {
    console.log('Closing database connection...');
    await sequelize.close();
  }
};

seedDatabase();
