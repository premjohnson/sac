import { client } from '../config/connection.js';

export const createRegistrationsTable = `
  CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    event_id UUID NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attendance_status VARCHAR(10) DEFAULT 'NA' CHECK (attendance_status IN ('present', 'absent', 'NA')),
    UNIQUE (user_id, event_id),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  );
`;

export const initRegistrationsSchema = async () => {
  try {
    await client.connect();
    await client.query(createRegistrationsTable);
    console.log("✅ Registrations table created successfully.");
  } catch (err) {
    console.error("❌ Error setting up registrations schema:", err);
  } finally {
    await client.end();
  }
};

initRegistrationsSchema();
export default initRegistrationsSchema;