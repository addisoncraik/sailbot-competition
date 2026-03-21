import { useEffect, useMemo, useState } from "react";
import "./App.css";

function App() {
  /* ----------------------------- */
  /* Main Page State               */
  /* ----------------------------- */
  const [items, setItems] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [aiCheckoutSession, setAiCheckoutSession] = useState(false);

  /* ----------------------------- */
  /* Checkout Overview State       */
  /* ----------------------------- */
  const [checkoutItems, setCheckoutItems] = useState([
    {
      id: 1,
      itemName: "Tomatoes",
      quantity: 12,
      unit: "Units",
      inStockValue: "Replace This With In Stock Value",
      source: "manual",
    },
    {
      id: 2,
      itemName: "Chicken Breast",
      quantity: 8,
      unit: "Kg",
      inStockValue: "Replace This With In Stock Value",
      source: "manual",
    },
    {
      id: 3,
      itemName: "Rice",
      quantity: 4,
      unit: "Boxes",
      inStockValue: "Replace This With In Stock Value",
      source: "manual",
    },
  ]);

  const [manualCheckoutItems, setManualCheckoutItems] = useState([
    {
      id: 1,
      itemName: "Tomatoes",
      quantity: 12,
      unit: "Units",
      inStockValue: "Replace This With In Stock Value",
      source: "manual",
    },
    {
      id: 2,
      itemName: "Chicken Breast",
      quantity: 8,
      unit: "Kg",
      inStockValue: "Replace This With In Stock Value",
      source: "manual",
    },
    {
      id: 3,
      itemName: "Rice",
      quantity: 4,
      unit: "Boxes",
      inStockValue: "Replace This With In Stock Value",
      source: "manual",
    },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [checkoutForm, setCheckoutForm] = useState({
    itemName: "",
    quantity: "",
    unit: "",
    inStockValue: "",
  });

  /* ----------------------------- */
  /* Food Waste State              */
  /* ----------------------------- */
  const [wasteLog, setWasteLog] = useState({
    itemName: "",
    quantity: "",
    unit: "Units",
    reason: "",
  });

  /* ----------------------------- */
  /* Load Inventory From Tristan   */
  /* ----------------------------- */
  useEffect(() => {
    window.api.invoke("get-inventory").then(setItems);
  }, []);

  /* ----------------------------- */
  /* Nathan Prediction Placeholder */
  /* ----------------------------- */
  const predictedOrders = useMemo(() => {
    return items.map((item) => {
      const predictedNeeded = Math.max(item.quantity + 5, 10);
      const suggestedOrder = Math.max(predictedNeeded - item.quantity, 0);

      return {
        id: item.id,
        itemName: item.name,
        suggestedOrder,
        unit: "Units",
        inStockValue: item.quantity ?? "Replace This With In Stock Value",
      };
    });
  }, [items]);

  /* ----------------------------- */
  /* Navigation Helpers            */
  /* ----------------------------- */
  const goToDashboard = () => {
    if (aiCheckoutSession) {
      setCheckoutItems(manualCheckoutItems);
      setAiCheckoutSession(false);
      setShowAddForm(false);
      setEditingId(null);
    }
    setPage("dashboard");
  };

  const goToCheckout = () => {
    if (aiCheckoutSession) {
      setCheckoutItems(manualCheckoutItems);
      setAiCheckoutSession(false);
      setShowAddForm(false);
      setEditingId(null);
    }
    setPage("checkout");
  };

  /* ----------------------------- */
  /* AI Prediction -> Checkout     */
  /* ----------------------------- */
  const openPredictedCheckout = () => {
    const aiItems = predictedOrders
      .filter((entry) => entry.suggestedOrder > 0)
      .map((entry) => ({
        id: `ai-${entry.id}-${Date.now()}`,
        itemName: entry.itemName,
        quantity: entry.suggestedOrder,
        unit: entry.unit || "Units",
        inStockValue: entry.inStockValue,
        source: "ai",
      }));

    setCheckoutItems([...manualCheckoutItems, ...aiItems]);
    setAiCheckoutSession(true);
    setShowAddForm(false);
    setEditingId(null);
    setPage("checkout");
  };

  /* ----------------------------- */
  /* Waste Handlers                */
  /* ----------------------------- */
  const handleWasteChange = (e) => {
    const { name, value } = e.target;
    setWasteLog((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleWasteSubmit = (e) => {
    e.preventDefault();

    const payload = {
      ...wasteLog,
      quantity: Number(wasteLog.quantity),
      sendTo: "Tristan",
      type: "Food Waste Log",
    };

    console.log("Food Waste Sent To Tristan:", payload);

    setWasteLog({
      itemName: "",
      quantity: "",
      unit: "Units",
      reason: "",
    });

    goToDashboard();
  };

  /* ----------------------------- */
  /* Checkout Form Handlers        */
  /* ----------------------------- */
  const handleCheckoutFormChange = (e) => {
    const { name, value } = e.target;
    setCheckoutForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const syncManualItems = (updatedItems) => {
    setCheckoutItems(updatedItems);

    if (aiCheckoutSession) {
      setManualCheckoutItems(updatedItems.filter((item) => item.source !== "ai"));
    } else {
      setManualCheckoutItems(updatedItems);
    }
  };

  const increaseCheckoutQty = (id) => {
    const updated = checkoutItems.map((item) =>
      item.id === id ? { ...item, quantity: item.quantity + 1 } : item
    );
    syncManualItems(updated);
  };

  const decreaseCheckoutQty = (id) => {
    const updated = checkoutItems.map((item) =>
      item.id === id
        ? { ...item, quantity: Math.max(1, item.quantity - 1) }
        : item
    );
    syncManualItems(updated);
  };

  const deleteCheckoutItem = (id) => {
    const updated = checkoutItems.filter((item) => item.id !== id);
    syncManualItems(updated);

    if (editingId === id) {
      setEditingId(null);
      setCheckoutForm({
        itemName: "",
        quantity: "",
        unit: "",
        inStockValue: "",
      });
      setShowAddForm(false);
    }
  };

  const editCheckoutItem = (item) => {
    setEditingId(item.id);
    setCheckoutForm({
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      inStockValue: item.inStockValue,
    });
    setShowAddForm(true);
  };

  const submitCheckoutFormItem = (e) => {
    e.preventDefault();

    const cleanedItem = {
      itemName: checkoutForm.itemName.trim(),
      quantity: Number(checkoutForm.quantity),
      unit: checkoutForm.unit,
      inStockValue: checkoutForm.inStockValue,
    };

    if (!cleanedItem.itemName || !cleanedItem.unit || cleanedItem.quantity < 1) {
      return;
    }

    let updatedItems;

    if (editingId !== null) {
      updatedItems = checkoutItems.map((item) =>
        item.id === editingId ? { ...item, ...cleanedItem } : item
      );
    } else {
      const newItem = {
        id: Date.now(),
        ...cleanedItem,
        source: "manual",
      };
      updatedItems = [...checkoutItems, newItem];
    }

    syncManualItems(updatedItems);

    setCheckoutForm({
      itemName: "",
      quantity: "",
      unit: "",
      inStockValue: "",
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const submitCheckout = () => {
    const payload = {
      type: aiCheckoutSession ? "AI Checkout Overview" : "Checkout Overview",
      sendTo: "Tristan",
      items: checkoutItems,
    };

    console.log("Checkout Submitted To Tristan:", payload);
    goToDashboard();
  };

  return (
    <div className="app-shell">
      {/* ----------------------------- */}
      {/* Header                        */}
      {/* ----------------------------- */}
      <header className="app-header">
        <div className="header-text">
          <h1>SoupPLY</h1>
          <p>Restaurant Inventory, Ordering, And Waste Tracking In One Place</p>
        </div>
      </header>

      {/* ----------------------------- */}
      {/* Top Navigation Tabs           */}
      {/* ----------------------------- */}
      <div className="header-buttons">
        <button
          className={`nav-button ${page === "dashboard" ? "active" : ""}`}
          onClick={goToDashboard}
        >
          Dashboard
        </button>

        <button
          className={`nav-button ${
            page === "checkout" && !aiCheckoutSession ? "active" : ""
          }`}
          onClick={goToCheckout}
        >
          Checkout Overview
        </button>

        <button
          className={`nav-button ${page === "waste" ? "active" : ""}`}
          onClick={() => {
            if (aiCheckoutSession) {
              setCheckoutItems(manualCheckoutItems);
              setAiCheckoutSession(false);
            }
            setPage("waste");
          }}
        >
          Log Food Waste
        </button>
      </div>

      <main className="dashboard-grid">
        {/* ----------------------------- */}
        {/* Dashboard Tab                */}
        {/* ----------------------------- */}
        {page === "dashboard" && (
          <section className="panel panel-large">
            <div className="panel-header">
              <h2>Predicted Orders</h2>
              <span>From Nathan Algorithm</span>
            </div>

            <div className="prediction-list">
              {predictedOrders.length === 0 ? (
                <div className="empty-state">
                  Nathan’s Prediction List Will Appear Here.
                </div>
              ) : (
                predictedOrders.map((entry) => (
                  <div className="prediction-card" key={entry.id}>
                    <strong>{entry.itemName}</strong>
                    <span>Order {entry.suggestedOrder} Units</span>
                  </div>
                ))
              )}
            </div>

            <div className="center-button">
              <button className="primary-button" onClick={openPredictedCheckout}>
                View Predicted Order
              </button>
            </div>
          </section>
        )}

        {/* ----------------------------- */}
        {/* Checkout Overview Tab        */}
        {/* ----------------------------- */}
        {page === "checkout" && (
          <section className="panel page-panel">
            <div className="page-top">
              <div>
                <h2>{aiCheckoutSession ? "AI Checkout Overview" : "Checkout Overview"}</h2>
                <p className="page-subtext">
                  {aiCheckoutSession
                    ? "AI Predicted Items Are Highlighted Below. You Can Still Edit, Delete, And Add Manual Items."
                    : "Review, Edit, And Submit Items To Tristan"}
                </p>
              </div>
            </div>

            {/* ----------------------------- */}
            {/* Checkout Top Actions          */}
            {/* ----------------------------- */}
            <div className="checkout-top-row">
              <button
                type="button"
                className="small-action-button"
                onClick={() => {
                  setEditingId(null);
                  setCheckoutForm({
                    itemName: "",
                    quantity: "",
                    unit: "",
                    inStockValue: "",
                  });
                  setShowAddForm((prev) => !prev);
                }}
              >
                Manually Add Items
              </button>
            </div>

            {/* ----------------------------- */}
            {/* Add / Edit Checkout Form      */}
            {/* ----------------------------- */}
            {showAddForm && (
              <form
                className="pretty-form add-item-form"
                onSubmit={submitCheckoutFormItem}
              >
                <div className="form-row">
                  <div className="form-group">
                    <label>Item Name</label>
                    <input
                      type="text"
                      name="itemName"
                      value={checkoutForm.itemName}
                      onChange={handleCheckoutFormChange}
                      placeholder="Enter Item Name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Unit</label>
                    <select
                      name="unit"
                      value={checkoutForm.unit}
                      onChange={handleCheckoutFormChange}
                      required
                    >
                      <option value="" disabled>
                        Select Unit
                      </option>
                      <option value="Units">Units</option>
                      <option value="Kg">Kg</option>
                      <option value="L">L</option>
                      <option value="Boxes">Boxes</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      name="quantity"
                      value={checkoutForm.quantity}
                      onChange={handleCheckoutFormChange}
                      placeholder="Enter Quantity"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>In Stock</label>
                    <input
                      type="number"
                      min="0"
                      name="inStockValue"
                      value={checkoutForm.inStockValue}
                      onChange={handleCheckoutFormChange}
                      placeholder="Enter In Stock Quantity"
                    />
                  </div>
                </div>

                <div className="action-row">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingId(null);
                      setCheckoutForm({
                        itemName: "",
                        quantity: "",
                        unit: "",
                        inStockValue: "",
                      });
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-button">
                    {editingId !== null ? "Save Changes" : "Add Item"}
                  </button>
                </div>
              </form>
            )}

            {/* ----------------------------- */}
            {/* Checkout Item List            */}
            {/* ----------------------------- */}
            <div className="checkout-list">
              {checkoutItems.length === 0 ? (
                <div className="empty-state">No Items In Checkout Yet.</div>
              ) : (
                checkoutItems.map((item) => (
                  <div
                    className={`checkout-item-card ${
                      item.source === "ai" ? "checkout-item-card-ai" : ""
                    }`}
                    key={item.id}
                  >
                    <div className="checkout-name-column">
                      <div className="checkout-name-block">
                        <div className="checkout-item-name-row">
                          <div className="checkout-item-name">{item.itemName}</div>
                          {item.source === "ai" && (
                            <span className="ai-badge">AI</span>
                          )}
                        </div>
                        <div className="checkout-stock-text">
                          In Stock: {item.inStockValue}
                        </div>
                      </div>
                    </div>

                    <div className="checkout-qty-column">
                      <button
                        type="button"
                        className="qty-button"
                        onClick={() => decreaseCheckoutQty(item.id)}
                      >
                        −
                      </button>

                      <input
                        className="qty-box"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const nextValue = Math.max(1, Number(e.target.value) || 1);
                          const updated = checkoutItems.map((entry) =>
                            entry.id === item.id
                              ? { ...entry, quantity: nextValue }
                              : entry
                          );
                          syncManualItems(updated);
                        }}
                      />

                      <button
                        type="button"
                        className="qty-button"
                        onClick={() => increaseCheckoutQty(item.id)}
                      >
                        +
                      </button>

                      <span className="checkout-unit">{item.unit}</span>
                    </div>

                    <div className="checkout-actions-column">
                      <button
                        type="button"
                        className="icon-action-button delete-action"
                        onClick={() => deleteCheckoutItem(item.id)}
                      >
                        Delete
                      </button>

                      <button
                        type="button"
                        className="icon-action-button edit-action"
                        onClick={() => editCheckoutItem(item)}
                      >
                        ✎
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ----------------------------- */}
            {/* Checkout Submit Button        */}
            {/* ----------------------------- */}
            <div className="center-button submit-checkout-row">
              <button className="primary-button" onClick={submitCheckout}>
                Submit Checkout
              </button>
            </div>
          </section>
        )}

        {/* ----------------------------- */}
        {/* Log Food Waste Tab           */}
        {/* ----------------------------- */}
        {page === "waste" && (
          <section className="panel page-panel">
            <div className="page-top">
              <div>
                <h2>Log Food Waste</h2>
                <p className="page-subtext">
                  Record Waste Details Below To Send To Tristan
                </p>
              </div>
            </div>

            <form className="pretty-form" onSubmit={handleWasteSubmit}>
              <div className="form-group">
                <label>Item Name</label>
                <input
                  type="text"
                  name="itemName"
                  value={wasteLog.itemName}
                  onChange={handleWasteChange}
                  placeholder="Enter Item Name"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={wasteLog.quantity}
                    onChange={handleWasteChange}
                    placeholder="Enter Quantity"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Unit</label>
                  <select
                    name="unit"
                    value={wasteLog.unit}
                    onChange={handleWasteChange}
                  >
                    <option>Units</option>
                    <option>Kg</option>
                    <option>L</option>
                    <option>Boxes</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Reason</label>
                <textarea
                  name="reason"
                  value={wasteLog.reason}
                  onChange={handleWasteChange}
                  placeholder="Why Is This Being Discarded?"
                  rows="4"
                />
              </div>

              <div className="action-row">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={goToDashboard}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Log Waste
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;