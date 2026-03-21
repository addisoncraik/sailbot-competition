/**
 * algorithm.js
 * * Data Structures Expected:
 * - getCurrentInventory(): [{item: string, qty: number}, ...]
 * - getOrdersBetween(d1, d2): [{date: Date, item: string, qty_existing: number, qty_ordered: number}, ...]
 * - getWasteData(d1, d2): [{date: Date, item: string, qty_waste: number}, ...]
 */

const STOCKOUT_BUFFER = 1.20; // 20% increase if we ran out last time
const ORDER_THRESHOLD = 0.1;

export async function generatePredictedOrder(targetDate = new Date()) {
    const inventory = await getCurrentInventory();
    const results = [];

    for (const entry of inventory) {
        const itemName = entry.item;
        const currentQty = entry.qty;

        // 1. Find the historical window (Year -> Month -> Week)
        const history = await findHistoricalWindow(itemName, targetDate);

        if (!history) {
            results.push({
                item: itemName,
                current_qty: currentQty,
                predicted_order: 0,
                note: "Insufficient history"
            });
            continue;
        }

        const { orderA, orderB } = history;

        // 2. Calculate Consumption
        // Qty After Order A = (Existing at time of A + Amount Ordered at A)
        const qtyAfterA = orderA.qty_existing + orderA.qty_ordered;
        // Qty Before Order B = (Existing at time of B)
        const qtyBeforeB = orderB.qty_existing;

        const totalUsed = qtyAfterA - qtyBeforeB;

        // 3. Subtract Waste in this specific window
        const wasteRecords = await getWasteData(orderA.date, orderB.date);
        const itemWaste = wasteRecords
            .filter(w => w.item === itemName)
            .reduce((sum, w) => sum + w.qty_waste, 0);

        const quantityNeeded = totalUsed - itemWaste;

        if (currentQty == 0) {
            quantityNeeded *= STOCKOUT_BUFFER; // If we hit zero, increase the needed quantity by the buffer
        }

        const orderAmount = quantityNeeded - currentQty;

        if (orderAmount > ORDER_THRESHOLD) {
            results.push({
                item: itemName,
                current_qty: currentQty,
                predicted_order: Math.ceil(orderAmount * 100) / 100 // Round to 2 decimals
            });
        }
    }

    return results;
}

/**
 * Looks for the two consecutive orders closest to the specific lookback period
 */
async function findHistoricalWindow(itemName, targetDate) {
    const intervals = [365, 30, 7]; // Year, Month, Week

    for (const days of intervals) {
        const lookbackDate = new Date(targetDate);
        lookbackDate.setDate(lookbackDate.getDate() - days);

        // Define a wider search window to ensure we catch enough orders
        const startSearch = new Date(lookbackDate.getTime() - (15 * 24 * 60 * 60 * 1000));
        const endSearch = new Date(lookbackDate.getTime() + (15 * 24 * 60 * 60 * 1000));

        const allOrders = await getOrdersBetween(startSearch, endSearch);
        
        // 1. Filter and sort ALL item orders chronologically
        const itemOrders = allOrders
            .filter(o => o.item === itemName)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (itemOrders.length < 2) continue;

        // 2. Find the index of the order closest to our lookbackDate
        let closestIndex = 0;
        let minDiff = Infinity;

        itemOrders.forEach((order, index) => {
            const diff = Math.abs(new Date(order.date) - lookbackDate);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = index;
            }
        });

        // 3. Determine the "Pair" (Order A and Order B)
        // If the closest is the last one in the list, we must pair with the previous one
        let orderA, orderB;
        if (closestIndex === itemOrders.length - 1) {
            orderA = itemOrders[closestIndex - 1];
            orderB = itemOrders[closestIndex];
        } else {
            // Otherwise, we pair the closest one with the one following it
            orderA = itemOrders[closestIndex];
            orderB = itemOrders[closestIndex + 1];
        }

        return { orderA, orderB };
    }
    return null; 
}