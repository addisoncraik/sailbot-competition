import { useEffect, useState } from "react";

function App() {
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [waste, setWaste] = useState([]);

  // Form states
  const [orderDate, setOrderDate] = useState("");
  const [orderItem, setOrderItem] = useState("");
  const [qtyNew, setQtyNew] = useState(0);
  const [qtyInStock, setQtyInStock] = useState(0);

  const [wasteDate, setWasteDate] = useState("");
  const [wasteItem, setWasteItem] = useState("");
  const [wasteQty, setWasteQty] = useState(0);

  // Fetch tables
  const fetchInventory = async () => setInventory(await window.api.invoke("get-inventory"));
  const fetchOrders = async () => setOrders(await window.api.invoke("get-all-orders"));
  const fetchWaste = async () => setWaste(await window.api.invoke("get-all-waste"));

  // Make refreshAll async
  const refreshAll = async () => {
    const inv = await window.api.invoke("get-inventory");
    setInventory(inv);

    const ord = await window.api.invoke("get-all-orders");
    setOrders(ord);

    const wst = await window.api.invoke("get-all-waste");
    setWaste(wst);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    window.api.on("prompt-duplicate", (event, { type, date, item, responseChannel }) => {
      const choice = window.prompt(`${type} already exists for "${item}" on ${date}. merge / override / cancel`) || "cancel";
      window.api.send(responseChannel, choice);
    });
  }, []);

  // Add order
  const handleAddOrder = async () => {
    if (!orderDate || !orderItem) return alert("Fill in all order fields");
    await window.api.invoke("add-order", {
      date: orderDate,
      items: [{ item: orderItem, qtyNew: Number(qtyNew), qtyInStock: Number(qtyInStock) }],
    });
    refreshAll();
  };

  // Record waste
  const handleRecordWaste = async () => {
    if (!wasteDate || !wasteItem) return alert("Fill in all waste fields");
    await window.api.invoke("record-waste", {
      date: wasteDate,
      items: [{ item: wasteItem, qty: Number(wasteQty) }],
    });
    refreshAll();
  };

  // Render table helper
  const renderTable = (title, data, columns) => (
    <div style={{ marginTop: "2rem" }}>
      <h2>{title}</h2>
      <table border="1" cellPadding="5" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>{columns.map((col) => <th key={col}>{col}</th>)}</tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length}>No records</td></tr>
          ) : (
            data.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => <td key={col}>{row[col]}</td>)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Inventory Test App</h1>

      {/* Order Form */}
      <div style={{ marginBottom: "1rem" }}>
        <h2>Add Order</h2>
        <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
        <input type="text" placeholder="Item" value={orderItem} onChange={(e) => setOrderItem(e.target.value)} />
        <input type="number" placeholder="Qty New" value={qtyNew} onChange={(e) => setQtyNew(e.target.value)} />
        <input type="number" placeholder="Qty In Stock" value={qtyInStock} onChange={(e) => setQtyInStock(e.target.value)} />
        <button onClick={handleAddOrder}>Submit Order</button>
      </div>

      {/* Waste Form */}
      <div style={{ marginBottom: "1rem" }}>
        <h2>Record Waste</h2>
        <input type="date" value={wasteDate} onChange={(e) => setWasteDate(e.target.value)} />
        <input type="text" placeholder="Item" value={wasteItem} onChange={(e) => setWasteItem(e.target.value)} />
        <input type="number" placeholder="Qty" value={wasteQty} onChange={(e) => setWasteQty(e.target.value)} />
        <button onClick={handleRecordWaste}>Submit Waste</button>
      </div>

      <button onClick={refreshAll}>Refresh All Tables</button>

      {/* Live displays */}
      {renderTable("Inventory", inventory, ["item", "qty"])}
      {renderTable("Orders", orders, ["date", "item", "qtyNew", "qtyInStock"])}
      {renderTable("Waste", waste, ["date", "item", "qty"])}
    </div>
  );
}

export default App;