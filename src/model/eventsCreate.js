import { client } from '../config/connection.js';

const createExtension = `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;

const createEventsTable = `
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  description1 TEXT,
  description2 TEXT,
  description3 TEXT,
  venue VARCHAR(255) NOT NULL,
  mode VARCHAR(50) NOT NULL,
  meeting_link VARCHAR(255) NOT NULL,
  date TIMESTAMP NOT NULL,
  registration_deadline TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  organizer VARCHAR(255) NOT NULL,
  representative VARCHAR(255) NOT NULL,
  phone_number_representative VARCHAR(15) NOT NULL CHECK (phone_number_representative ~ '^[6-9][0-9]{9}$'),
  email_representative VARCHAR(255) NOT NULL,
  registration_link VARCHAR(255) NOT NULL,
  maximum_participants INT NOT NULL CHECK (maximum_participants > 0),
  images TEXT[] CHECK (cardinality(images) <= 5)
);
`;

const initEvents = async () => {
  try {
    // Assume client is already connected at app start
    await client.query(createExtension);
    await client.query(createEventsTable);
    console.log('✅ Events table created successfully');
  } catch (error) {
    console.error('❌ Error creating events table:', error);
  }
};

// Just run this once at app start or migration phase
initEvents();

export default initEvents;
