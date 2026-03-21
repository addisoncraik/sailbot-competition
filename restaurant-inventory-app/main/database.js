const Database = require("better-sqlite3");

const db = new Database("restaurant.db");

// Create table
db.prepare(`
  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY,
    name TEXT,
    quantity INTEGER,
    expiry TEXT
  )
`).run();

module.exports = db;