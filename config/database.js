import { Sequelize } from "sequelize";
import { config } from "./config.js";
import dotenv from "dotenv";
dotenv.config({ path: `${process.cwd()}/.env` });
const dbConfig = config[process.env.NODE_ENV || "development"];
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: dbConfig.dialect,
  logging: false, // Disable logging; default: console.log
});

export default sequelize;
// export const connectDB = async () => {
//   try {
//     await sequelize.authenticate();
//     console.log("Database connection has been established successfully.");
//   } catch (error) {
//     console.error("Unable to connect to the database:", error);
//   }
// };