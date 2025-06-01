import { client, connectDB } from '../config/connection.js';

const createUserTable = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'user', 'moderator', 'student', 'faculty')),
  username VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(15) NOT NULL UNIQUE CHECK (phone_number ~ '^[6-9][0-9]{9}$'),
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const init = async () => {
  try {
    await client.connect();               // connect client
    await client.query(createUserTable); // run query
    console.log("✅ Users table created successfully");
  } catch (err) {
    console.error("❌ Error creating users table:", err);
  } finally {
    await client.end();                   // close connection
  }
};

init();

export default init;
