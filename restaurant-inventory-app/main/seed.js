const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbDir = path.join(__dirname, "..", "database");
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "restaurant.db");
const db = new Database(dbPath);

console.log(`🌱 Seeding database at: ${dbPath}`);

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

db.exec("DELETE FROM orders; DELETE FROM waste; DELETE FROM inventory;");

const insertOrder = db.prepare("INSERT OR REPLACE INTO orders (date, item, qtyNew, qtyInStock) VALUES (?, ?, ?, ?)");
const insertWaste = db.prepare("INSERT OR REPLACE INTO waste (date, item, qty) VALUES (?, ?, ?)");
const updateInventory = db.prepare("INSERT OR REPLACE INTO inventory (item, qty) VALUES (?, ?)");

const items = [
    { name: "Tomatoes", avgDemand: 15 },
    { name: "Chicken Breast", avgDemand: 25 },
    { name: "Rice", avgDemand: 40 },
    { name: "Milk", avgDemand: 12 },
    { name: "Avocados", avgDemand: 10 }
];

const startDate = new Date();
startDate.setFullYear(startDate.getFullYear() - 2);

console.log("⏳ Generating 2 years of history...");

for (let d = 0; d < 730; d++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + d);
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay(); 
    
    items.forEach(item => {
        // 1. Simulate Daily Waste
        const dailyWaste = Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0;
        if (dailyWaste > 0) {
            insertWaste.run(dateStr, item.name, dailyWaste);
            
            // OPTIONAL: Update inventory to subtract waste so numbers are ultra-realistic
            db.prepare("UPDATE inventory SET qty = MAX(0, qty - ?) WHERE item = ?").run(dailyWaste, item.name);
        }

        // 2. Simulate Orders (Mon/Thu)
        if (dayOfWeek === 1 || dayOfWeek === 4) {
            const seasonality = 1 + (Math.sin(d / 30) * 0.2);
            const noise = 0.9 + (Math.random() * 0.2);
            const qtyToOrder = Math.ceil(item.avgDemand * seasonality * noise);
            const qtyInStock = Math.floor(Math.random() * 5); 

            insertOrder.run(dateStr, item.name, qtyToOrder, qtyInStock);
            
            // FIX: Update inventory table every time an order is "received"
            // This ensures the inventory table is always populated.
            updateInventory.run(item.name, qtyInStock + qtyToOrder);
        }
    });

    if (d % 100 === 0) console.log(`Processed ${d} days...`);
}


const insertInv = db.prepare("INSERT OR REPLACE INTO inventory (item, qty) VALUES (?, ?)");

insertInv.run("Tomatoes", 1);       // Only 1 left
insertInv.run("Chicken Breast", 0); // Completely out (will trigger your 20% stockout buffer!)
insertInv.run("Rice", 2);           // Very low
insertInv.run("Milk", 0);           // Completely out
insertInv.run("Avocados", 1);       // Only 1 left

console.log("✅ Database seeded successfully. Inventory table is now populated.");