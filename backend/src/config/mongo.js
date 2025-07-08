// backend/src/config/mongo.js
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = 'klicklab';

let client;

const connectDB = async () => {
  if (!client) {
    client = new MongoClient(uri, { useUnifiedTopology: true });
    await client.connect();
    console.log('✅ MongoDB connected');
  }
  return client.db(dbName); // << 이걸 반환해야 index.js에서 collection() 사용 가능
};

module.exports = connectDB;
