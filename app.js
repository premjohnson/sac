import express from 'express';
import { connectDB } from '../sac-backend/src/config/connection.js';
import initEvents from '../sac-backend/src/model/eventsCreate.js'; // wherever your init script is

const app = express();

async function startServer() {
  await connectDB();    // Connect once here
  await initEvents();   // Create tables, no connect/end inside this
  // other init stuff

  app.listen(3000, () => console.log('Server started on port 3000'));
}

startServer();
