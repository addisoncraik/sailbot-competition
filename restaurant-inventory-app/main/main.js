const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const db = require("./database"); // 👈 1. Import your database

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

app.whenReady().then(createWindow);