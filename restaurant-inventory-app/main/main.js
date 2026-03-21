const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const db = require("./database"); // Import the database

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Open the debugger automatically
  win.webContents.openDevTools();

  // Try to load Vite. If it fails (because Vite is still booting), wait 2 seconds and try again.
  win.loadURL("http://localhost:5173").catch(() => {
    console.log("Vite not ready yet, retrying in 2 seconds...");
    setTimeout(() => {
      win.loadURL("http://localhost:5173");
    }, 2000);
  });
}

ipcMain.handle("add-order", async (event, { date, items }) => {
  const insertOrder = db.prepare(
    "INSERT INTO orders (date, item, qtyNew, qtyInStock) VALUES (?, ?, ?, ?)"
  );
  const updateOrder = db.prepare(
    "UPDATE orders SET qtyNew = ?, qtyInStock = ? WHERE date = ? AND item = ?"
  );
  const getInventoryQty = db.prepare("SELECT qty FROM inventory WHERE item = ?");
  const updateInventory = db.prepare("UPDATE inventory SET qty = ? WHERE item = ?");
  const insertInventory = db.prepare("INSERT INTO inventory (item, qty) VALUES (?, ?)");

  for (const { item, qtyNew, qtyInStock } of items) {
    // Check if order already exists
    const existingOrder = db
      .prepare("SELECT * FROM orders WHERE date = ? AND item = ?")
      .get(date, item);

    let action = "insert"; // default: insert
    if (existingOrder) {
        action = await promptDuplicate(event, { type: "order", date, item });
    }

    if (action === "cancel") continue;

    let newQtyInStock = qtyNew + qtyInStock;

    if (action === "merge") {
      const mergedQtyNew = existingOrder.qtyNew + qtyNew;
      const mergedQtyInStock = existingOrder.qtyInStock + qtyInStock;
      updateOrder.run(mergedQtyNew, mergedQtyInStock, date, item);
      newQtyInStock = mergedQtyInStock;
    }

    if (action === "override") {
      updateOrder.run(qtyNew, qtyInStock, date, item);
    }

    // Update inventory
    const existingInventory = getInventoryQty.get(item);
    if (existingInventory) {
      updateInventory.run(newQtyInStock, item);
    } else {
      insertInventory.run(item, newQtyInStock);
    }
  }

  return { success: true };
});

ipcMain.handle("record-waste", async (event, { date, items }) => {
  const insertWaste = db.prepare(
    "INSERT INTO waste (date, item, qty) VALUES (?, ?, ?)"
  );
  const updateWaste = db.prepare(
    "UPDATE waste SET qty = ? WHERE date = ? AND item = ?"
  );
  const getInventoryQty = db.prepare("SELECT qty FROM inventory WHERE item = ?");
  const updateInventory = db.prepare("UPDATE inventory SET qty = ? WHERE item = ?");

  for (const { item, qty } of items) {
    // Check if waste entry already exists
    const existingWaste = db.prepare("SELECT * FROM waste WHERE date = ? AND item = ?").get(date, item);

    let action = "insert"; // default: insert
    if (existingWaste) {
        action = await promptDuplicate(event, { type: "order", date, item });
    }

    if (action === "cancel") continue;

    let finalQty = qty;

    if (action === "merge") {
      finalQty = existingWaste.qty + qty;
      updateWaste.run(finalQty, date, item);
    }

    if (action === "override") {
      updateWaste.run(qty, date, item);
      finalQty = qty;
    }

    // Update inventory
    const existingInventory = getInventoryQty.get(item);
    if (!existingInventory) {
      throw new Error(`Cannot record waste for item "${item}" because it does not exist in inventory.`);
    }

    const newInventoryQty =
      action === "merge"
        ? existingInventory.qty - qty // subtract only the new qty for merge
        : action === "override"
        ? existingInventory.qty - qty + (existingWaste ? existingWaste.qty : 0) // adjust for replaced value
        : existingInventory.qty - finalQty;

    if (newInventoryQty < 0) {
      throw new Error(`Cannot reduce inventory of "${item}" below 0.`);
    }

    updateInventory.run(newInventoryQty, item);
  }

  return { success: true };
});

function promptDuplicate(event, { type, date, item }) {
  return new Promise((resolve) => {
    // generate a unique response channel
    const responseChannel = `prompt-response-${type}-${date}-${item}-${Date.now()}`;

    // Listen once for the response
    ipcMain.once(responseChannel, (evt, choice) => {
      resolve(choice || "cancel");
    });

    // Send request to renderer
    event.sender.send("prompt-duplicate", { type, date, item, responseChannel });
  });
}

ipcMain.handle("get-inventory", () => {
  try {
    // Fetch all items from the SQLite database
    const items = db.prepare("SELECT * FROM inventory").all();
    return items;
  } catch (error) {
    console.error("Database error:", error);
    return [];
  }
});

// Fetch all orders between two dates (inclusive)
ipcMain.handle("get-orders-between-dates", (event, { startDate, endDate }) => {
  try {
    const stmt = db.prepare(`
      SELECT *
      FROM orders
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC
    `);
    const orders = stmt.all(startDate, endDate);
    return orders; // array of order objects
  } catch (error) {
    console.error("Error fetching orders between dates:", error);
    return [];
  }
});

// Fetch all waste records between two dates (inclusive)
ipcMain.handle("get-waste-between-dates", (event, { startDate, endDate }) => {
  try {
    const stmt = db.prepare(`
      SELECT *
      FROM waste
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC
    `);
    const wasteRecords = stmt.all(startDate, endDate);
    return wasteRecords; // array of waste objects
  } catch (error) {
    console.error("Error fetching waste between dates:", error);
    return [];
  }
});

ipcMain.handle("get-all-orders", () => {
  try {
    const stmt = db.prepare("SELECT * FROM orders ORDER BY date ASC");
    return stmt.all();
  } catch (error) {
    console.error("Error fetching all orders:", error);
    return [];
  }
});

ipcMain.handle("get-all-waste", () => {
  try {
    const stmt = db.prepare("SELECT * FROM waste ORDER BY date ASC");
    return stmt.all();
  } catch (error) {
    console.error("Error fetching all waste:", error);
    return [];
  }
});

app.whenReady().then(createWindow);