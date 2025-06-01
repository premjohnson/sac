import dotenv from 'dotenv';
dotenv.config({ path: `${process.cwd()}/.env` });

export default {
  "development": {
    "username": process.env.DB_USERNAME || "root",
    "password": process.env.DB_PASSWORD || null,
    "database": process.env.DB_NAME || "database_development",
    "host": process.env.DB_HOST,
    "port": process.env.DB_PORT || 3306,
    "dialect": "postgres"
  },
  "test": {
    "username": "root",
    "password": null,
    "database": "database_test",
    "host": "127.0.0.1",
    "dialect": "mysql"
  },
  "production": {
    "username": "root",
    "password": null,
    "database": "database_production",
    "host": "127.0.0.1",
    "dialect": "mysql"
  }
}
