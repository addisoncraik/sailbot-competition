const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

// IMPORT: Only import these once
const db = require("./database"); 
const { generatePredictedOrder } = require('./algorithm');

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

  win.webContents.openDevTools();

  win.loadURL("http://localhost:5173").catch(() => {
    console.log("Vite not ready yet, retrying in 2 seconds...");
    setTimeout(() => {
      win.loadURL("http://localhost:5173");
    }, 2000);
  });
}

/* ----------------------------- */
/* IPC HANDLERS                  */
/* ----------------------------- */

// 1. NATHAN'S PREDICTION
ipcMain.handle("get-prediction", async (event, date) => {
  try {
    return await generatePredictedOrder(date);
  } catch (error) {
    console.error("Prediction Error:", error);
    return [];
  }
});

// 2. GET INVENTORY (For App.jsx useEffect)
ipcMain.handle("get-inventory", () => {
  return db.prepare("SELECT item, qty FROM inventory").all();
});

// 3. RECORD WASTE
ipcMain.handle("record-waste", async (event, { date, items }) => {
  const stmt = db.prepare("INSERT OR REPLACE INTO waste (date, item, qty) VALUES (?, ?, ?)");
  const updateInv = db.prepare("UPDATE inventory SET qty = qty - ? WHERE item = ?");

  for (const { item, qty } of items) {
    stmt.run(date, item, qty);
    updateInv.run(qty, item);
  }
  return { success: true };
});

// 4. ADD ORDER (Checkout)
ipcMain.handle("add-order", async (event, { date, items }) => {
  const stmt = db.prepare("INSERT OR REPLACE INTO orders (date, item, qtyNew, qtyInStock) VALUES (?, ?, ?, ?)");
  const updateInv = db.prepare("INSERT INTO inventory (item, qty) VALUES (?, ?) ON CONFLICT(item) DO UPDATE SET qty = excluded.qty");

  for (const { item, qtyNew, qtyInStock } of items) {
    stmt.run(date, item, qtyNew, qtyInStock);
    updateInv.run(item, qtyNew + qtyInStock);
  }
  return { success: true };
});

app.whenReady().then(createWindow);