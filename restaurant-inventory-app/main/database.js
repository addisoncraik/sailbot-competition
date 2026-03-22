const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs"); // <--- ADD THIS LINE HERE

// 1. Define the directory path
const dbDir = path.join(__dirname, "..", "database");

// 2. Create the directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// 3. Connect to the database
const dbPath = path.join(dbDir, "restaurant.db");
const db = new Database(dbPath);

// Create all necessary tables for the algorithm to function
db.exec(`
  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT UNIQUE,
    qty INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    date TEXT NOT NULL,
    item TEXT NOT NULL,
    qtyNew INTEGER NOT NULL,
    qtyInStock INTEGER NOT NULL,
    PRIMARY KEY (date, item)
  );

  CREATE TABLE IF NOT EXISTS waste (
    date TEXT NOT NULL,
    item TEXT NOT NULL,
    qty INTEGER NOT NULL,
    PRIMARY KEY (date, item)
  );
`);

module.exports = db;
