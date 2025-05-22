const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionConfig = isProduction 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL_DISABLE ? false : { rejectUnauthorized: true }
    }
  : {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    };

const pool = new Pool(connectionConfig);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool // Export the pool itself if direct access is needed elsewhere (e.g., for transactions)
};
