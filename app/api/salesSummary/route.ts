import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "daily";
    const date = searchParams.get("date");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let startDate: Date;
    let endDate: Date;

    // Helper function to determine start and end dates based on period
    function getStartAndEndDates(
      period: string,
      dateString: string
    ): { startDate: Date; endDate: Date } {
      const date = new Date(dateString);
      let startDate: Date;
      let endDate: Date;
      switch (period) {
        case "daily":
          startDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
          );
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 1);
          break;
        case "weekly": {
          const day = date.getDay();
          // Adjust to Monday as start of the week (Sunday is 0, Monday is 1)
          const diff = date.getDate() - (day === 0 ? 6 : day - 1);
          startDate = new Date(date.getFullYear(), date.getMonth(), diff);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 7);
          break;
        }
        case "monthly":
          startDate = new Date(date.getFullYear(), date.getMonth(), 1);
          endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
          break;
        case "yearly":
          startDate = new Date(date.getFullYear(), 0, 1);
          endDate = new Date(date.getFullYear() + 1, 0, 1);
          break;
        default:
          throw new Error("Invalid period");
      }
      return { startDate, endDate };
    }

    // Determine the date range for the query
    if (startDateParam) {
      startDate = new Date(startDateParam);
      if (endDateParam) {
        endDate = new Date(endDateParam);
        endDate.setDate(endDate.getDate() + 1);
      } else {
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 1);
      }
    } else {
      const dateString = date || new Date().toISOString();
      ({ startDate, endDate } = getStartAndEndDates(period, dateString));
    }

    // SQL query to fetch order details including menu items and their modifiers
    const [ordersData] = await db.execute(
      `
      SELECT 
        co.id AS order_id,
        co.discountAmount,
        co.taxAmount,
        co.gratuityAmount,
        co.roundingAmount, -- Added roundingAmount from completedOrder
        coi.id AS order_item_id, 
        coi.quantity,
        m.price AS menu_price,
        m.hargaBakul AS menu_cost,
        md.price AS modifier_price 
      FROM completedOrder co
      LEFT JOIN completedOrderItem coi ON co.id = coi.orderId
      LEFT JOIN menu m ON coi.menuId = m.id
      LEFT JOIN completedOrderItemModifier coim ON coi.id = coim.completedOrderItemId 
      LEFT JOIN modifier md ON coim.modifierId = md.id 
      WHERE co.createdAt >= ? AND co.createdAt < ?
      `,
      [startDate, endDate]
    );

    // Type definition for a row from the SQL query result
    type OrderRow = {
      order_id: number;
      discountAmount: string | number | null;
      taxAmount: string | number | null;
      gratuityAmount: string | number | null;
      roundingAmount: string | number | null;
      order_item_id: number | null;
      quantity: number | null;
      menu_price: string | number | null;
      menu_cost: string | number | null;
      modifier_price: string | number | null;
    };

    const groupedOrders: Record<number, OrderRow[]> = {};
    for (const row of ordersData as OrderRow[]) {
      if (!groupedOrders[row.order_id]) {
        groupedOrders[row.order_id] = [];
      }
      groupedOrders[row.order_id].push(row);
    }

    let grossSales = 0;
    let discounts = 0;
    let tax = 0;
    let gratuity = 0;
    let totalRoundingFromOrders = 0;

    for (const orderIdKey in groupedOrders) {
      const orderRows = groupedOrders[orderIdKey];
      const processedOrderItemsForThisOrder = new Set<number>();
      let orderHasBeenProcessedForOrderLevelValues = false;

      let currentOrderGrossSales = 0;

      if (orderRows.length > 0) {
        for (const item of orderRows) {
          if (!item || typeof item.quantity !== 'number' || !item.order_item_id) {
            continue;
          }
          const quantity = item.quantity;

          if (!processedOrderItemsForThisOrder.has(item.order_item_id)) {
            const menuItemPrice = Number(item.menu_price || 0);
            currentOrderGrossSales += menuItemPrice * quantity;
            processedOrderItemsForThisOrder.add(item.order_item_id);
          }

          const modifierPrice = Number(item.modifier_price || 0);
          if (modifierPrice > 0) {
            currentOrderGrossSales += modifierPrice * quantity;
          }
        }
        grossSales += currentOrderGrossSales;
        if (!orderHasBeenProcessedForOrderLevelValues && orderRows[0]) {
            const sampleOrderRow = orderRows[0];
            discounts += Number(sampleOrderRow.discountAmount || 0);
            tax += Number(sampleOrderRow.taxAmount || 0);
            gratuity += Number(sampleOrderRow.gratuityAmount || 0);
            totalRoundingFromOrders += Number(sampleOrderRow.roundingAmount || 0);
            orderHasBeenProcessedForOrderLevelValues = true;
        }
      }
    }

    const refunds = 0;
    const netSales = grossSales - discounts - refunds;
    const rounding = totalRoundingFromOrders;
    const totalCollected = netSales + tax + gratuity + rounding;

    const response = {
      grossSales,
      discounts,
      refunds,
      netSales,
      gratuity,
      tax,
      rounding,
      totalCollected,
      ordersCount: Object.keys(groupedOrders).length,
      startDate: startDate.toISOString(),
      reportEndDate: new Date(endDate.getTime() - (24 * 60 * 60 * 1000)).toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in GET sales-summary:", error);
    let errorMessage = "Internal server error.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
