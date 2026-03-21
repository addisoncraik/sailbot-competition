import { useEffect, useState } from "react";

function App() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    window.api.invoke("get-inventory").then(setItems);
  }, []);

  return (
    <div>
      <h1>Inventory</h1>
      {items.map(item => (
        <div key={item.id}>
          {item.name} - {item.quantity}
        </div>
      ))}
    </div>
  );
}

export default App;