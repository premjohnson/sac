import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Explicitly resolve .env relative to your project root
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
// Since you're running script from src/config, '../../.env' points to sac-backend/.env

const { Client } = pkg;

const client = new Client({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
});

// console.log('DB_USERNAME:', process.env.DB_USERNAME);
// console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'MISSING');

const connectDB = async () => {
  try {
    await client.connect();
    console.log('Connected to the database successfully!');
  } catch (error) {
    console.error('Connection error:', error);
  }
};

export { client, connectDB };
