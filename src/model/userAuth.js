import { client } from '../config/connection.js';

const createExtension = `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;

const createUserTable = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'user', 'moderator', 'student', 'faculty')),
  username VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(15) NOT NULL UNIQUE CHECK (phone_number ~ '^[6-9][0-9]{9}$'),
  email VARCHAR(255) NOT NULL UNIQUE,
  roll_number VARCHAR(50),
  password TEXT NOT NULL,
  Department VARCHAR(100),
  Year INT CHECK (Year >= 1 AND Year <= 4),
  Section VARCHAR(10),
  otp VARCHAR(10),
  otp_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const init = async () => {
  try {
    await client.connect();

    await client.query(createExtension);     // Ensure uuid_generate_v4 works
    await client.query(createUserTable);     // Create users table

    console.log("✅ Users table created successfully");
  } catch (err) {
    console.error("❌ Error creating users table:", err);
  } finally {
    await client.end();                      // Close DB connection
  }
};

init();
export default init;