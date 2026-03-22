import { useEffect, useState } from "react";
import "./App.css";

function App() {
  /* ----------------------------- */
  /* Main Page State               */
  /* ----------------------------- */
  const [items, setItems] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [algoCheckoutSession, setAlgoCheckoutSession] = useState(false);

  /* ----------------------------- */
  /* Checkout Overview State       */
  /* ----------------------------- */
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [manualCheckoutItems, setManualCheckoutItems] = useState([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [checkoutForm, setCheckoutForm] = useState({
    itemName: "",
    quantity: "",
    inStockValue: "",
  });

  /* ----------------------------- */
  /* Food Waste State              */
  /* ----------------------------- */
  const [wasteLog, setWasteLog] = useState({
    itemName: "",
    quantity: "",
    reason: "",
  });

  /* ----------------------------- */
  /* Load Inventory From Database  */
  /* ----------------------------- */
  useEffect(() => {
    window.api.invoke("get-inventory").then(setItems);
  }, []);

  /* ----------------------------- */
  /* Algorithm Prediction          */
  /* ----------------------------- */
  const [predictedOrders, setPredictedOrders] = useState([]);

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        const results = await window.api.getPrediction(new Date());
        
        const formatted = results.map((res, index) => ({
          id: `algo-pred-${index}`,
          itemName: res.item,
          suggestedOrder: Number(res.predicted_order).toFixed(2), 
          inStockValue: res.current_qty,
        }));
        
        setPredictedOrders(formatted);
      } catch (err) {
        console.error("Algorithm Prediction failed:", err);
      }
    };

    if (items.length > 0) {
      fetchPrediction();
    }
  }, [items]); 

  /* ----------------------------- */
  /* Navigation Helpers            */
  /* ----------------------------- */
  const goToDashboard = () => {
    if (algoCheckoutSession) {
      setCheckoutItems(manualCheckoutItems);
      setAlgoCheckoutSession(false);
      setShowAddForm(false);
      setEditingId(null);
    }
    setPage("dashboard");
  };

  const goToCheckout = () => {
    if (algoCheckoutSession) {
      setCheckoutItems(manualCheckoutItems);
      setAlgoCheckoutSession(false);
      setShowAddForm(false);
      setEditingId(null);
    }
    setPage("checkout");
  };

  /* ----------------------------- */
  /* Algorithm Prediction -> Checkout */
  /* ----------------------------- */
  const openPredictedCheckout = () => {
    const algoItems = predictedOrders
      .filter((entry) => entry.suggestedOrder > 0)
      .map((entry) => ({
        id: `algo-${entry.id}-${Date.now()}`,
        itemName: entry.itemName,
        quantity: entry.suggestedOrder,
        inStockValue: entry.inStockValue,
        source: "algo",
      }));

    setCheckoutItems([...manualCheckoutItems, ...algoItems]);
    setAlgoCheckoutSession(true);
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

  const handleWasteSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      date: new Date().toISOString().split('T')[0], 
      items: [{
        item: wasteLog.itemName,
        qty: Number(wasteLog.quantity)
      }]
    };

    try {
      const result = await window.api.invoke("record-waste", payload);
      if (result.success) {
        const updatedInventory = await window.api.invoke("get-inventory");
        setItems(updatedInventory);
        
        setWasteLog({ itemName: "", quantity: "", reason: "" });
        goToDashboard();
      }
    } catch (err) {
      alert("Error logging waste: " + err.message);
    }
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

    if (algoCheckoutSession) {
      setManualCheckoutItems(updatedItems.filter((item) => item.source !== "algo"));
    } else {
      setManualCheckoutItems(updatedItems);
    }
  };

  const deleteCheckoutItem = (id) => {
    const updated = checkoutItems.filter((item) => item.id !== id);
    syncManualItems(updated);

    if (editingId === id) {
      setEditingId(null);
      setCheckoutForm({
        itemName: "",
        quantity: "",
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
      inStockValue: item.inStockValue,
    });
    setShowAddForm(true);
  };

  const submitCheckoutFormItem = (e) => {
    e.preventDefault();

    const cleanedItem = {
      itemName: checkoutForm.itemName.trim(),
      quantity: Number(checkoutForm.quantity),
      inStockValue: checkoutForm.inStockValue,
    };

    if (!cleanedItem.itemName || cleanedItem.quantity < 1) {
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
      inStockValue: "",
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const submitCheckout = async () => {
    const payload = {
      date: new Date().toISOString().split('T')[0],
      items: checkoutItems.map(item => ({
        item: item.itemName,
        qtyNew: Number(item.quantity),
        qtyInStock: Number(item.inStockValue) || 0
      }))
    };

    try {
      const result = await window.api.invoke("add-order", payload);
      if (result.success) {
        const updatedInventory = await window.api.invoke("get-inventory");
        setItems(updatedInventory);
        
        setCheckoutItems([]);
        setManualCheckoutItems([]);
        setAlgoCheckoutSession(false);
        goToDashboard();
      }
    } catch (err) {
      alert("Error submitting order: " + err.message);
    }
  };

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="header-text">
          <h1>SoupPLY</h1>
          <p>Restaurant Inventory, Ordering, And Waste Tracking In One Place</p>
        </div>
      </header>

      {/* Top Navigation Tabs */}
      <div className="header-buttons">
        <button
          className={`nav-button ${page === "dashboard" ? "active" : ""}`}
          onClick={goToDashboard}
        >
          Dashboard
        </button>

        <button
          className={`nav-button ${
            page === "checkout" && !algoCheckoutSession ? "active" : ""
          }`}
          onClick={goToCheckout}
        >
          Checkout Overview
        </button>

        <button
          className={`nav-button ${page === "waste" ? "active" : ""}`}
          onClick={() => {
            if (algoCheckoutSession) {
              setCheckoutItems(manualCheckoutItems);
              setAlgoCheckoutSession(false);
            }
            setPage("waste");
          }}
        >
          Log Food Waste
        </button>
      </div>

      <main className="dashboard-grid">
        {/* Dashboard Tab */}
        {page === "dashboard" && (
          <section className="panel panel-large">
            <div className="panel-header">
              <h2>Predicted Orders</h2>
              <span>From Nathan's Algorithm</span>
            </div>

            <div className="prediction-list">
              {predictedOrders.length === 0 ? (
                <div className="empty-state">
                  Nathan’s Prediction List Will Appear Here Once Data Is Available.
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

        {/* Checkout Overview Tab */}
        {page === "checkout" && (
          <section className="panel page-panel">
            <div className="page-top">
              <div>
                <h2>{algoCheckoutSession ? "Predicted Checkout Overview" : "Checkout Overview"}</h2>
                <p className="page-subtext">
                  {algoCheckoutSession
                    ? "Algorithm Predicted Items Are Highlighted Below. You Can Still Edit, Delete, And Add Manual Items."
                    : "Review, Edit, And Submit Items To Tristan"}
                </p>
              </div>
            </div>

            <div className="checkout-top-row">
              <button
                type="button"
                className="small-action-button"
                onClick={() => {
                  setEditingId(null);
                  setCheckoutForm({
                    itemName: "",
                    quantity: "",
                    inStockValue: "",
                  });
                  setShowAddForm((prev) => !prev);
                }}
              >
                Manually Add Items
              </button>
            </div>

            {showAddForm && (
              <form
                className="pretty-form add-item-form"
                onSubmit={submitCheckoutFormItem}
              >
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

            <div className="checkout-list">
              {checkoutItems.length === 0 ? (
                <div className="empty-state">No Items In Checkout Yet.</div>
              ) : (
                checkoutItems.map((item) => (
                  <div
                    className={`checkout-item-card ${
                      item.source === "algo" ? "checkout-item-card-algo" : ""
                    }`}
                    key={item.id}
                  >
                    <div className="checkout-name-column">
                      <div className="checkout-name-block">
                        <div className="checkout-item-name-row">
                          <div className="checkout-item-name">{item.itemName}</div>
                          {item.source === "algo" && (
                            <span className="algo-badge">Predicted</span>
                          )}
                        </div>
                        <div className="checkout-stock-text">
                          In Stock: {item.inStockValue || 0}
                        </div>
                      </div>
                    </div>

                    <div className="checkout-qty-column">
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
                      <span className="checkout-unit">Units</span>
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

            <div className="center-button submit-checkout-row">
              <button className="primary-button" onClick={submitCheckout}>
                Submit Checkout
              </button>
            </div>
          </section>
        )}

        {/* Log Food Waste Tab */}
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