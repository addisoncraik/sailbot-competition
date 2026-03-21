const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Ensure the 'data' folder exists at the project root and set full path to the database file
const dataFolder = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder);
const dbPath = path.join(dataFolder, 'restaurant.db');

// Open (or create) the database in the data folder
const db = new Database(dbPath);

// Create the inventory table and order history
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    date TEXT NOT NULL,
    item TEXT NOT NULL,
    qtyNew INTEGER NOT NULL,
    qtyInStock INTEGER,
    PRIMARY KEY (date, item)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    item TEXT PRIMARY KEY,
    qty INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS waste (
    date TEXT NOT NULL,
    item TEXT NOT NULL,
    qty INTEGER NOT NULL,
    PRIMARY KEY (date, item)
  );
`);

module.exports = db;