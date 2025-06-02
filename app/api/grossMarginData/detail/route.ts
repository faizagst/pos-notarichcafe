import db from "@/lib/db"; // Assuming this is your DB connection setup
import { NextRequest, NextResponse } from "next/server";

// Interface definitions
interface MenuDetail {
  menuName: string;
  sellingPrice: number; // Will be average GROSS selling price per unit (before any discounts)
  discount: number;     // Sum of ITEM-LEVEL discounts for this menu
  hpp: number;          // Total HPP for this menu (base + modifiers)
  quantity: number;     // Total quantity sold
  totalSales: number;   // Total GROSS sales for this menu (ci.price * ci.quantity, before any discounts)
}

interface GrossMarginDetailResponse {
  summary: {
    netSales: number;
    totalHPP: number;
    grossMargin: number;
    totalCashierDiscount: number; // Total order-level (cashier) discount value
  };
  details: MenuDetail[];
}

// Helper function for date parsing (remains unchanged)
function getStartOfISOWeek(isoWeek: string): Date {
  const [yearStr, weekStr] = isoWeek.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dow === 0) { // Sunday
    ISOweekStart.setDate(simple.getDate() + 1); // Move to Monday
  } else {
    ISOweekStart.setDate(simple.getDate() - dow + 1); // Adjust to Monday
  }
  return ISOweekStart;
}
function setStartOfDay(date: Date): Date {
  return new Date(date.setHours(0, 0, 0, 0));
}

function setEndOfDay(date: Date): Date {
  return new Date(date.setHours(23, 59, 59, 999));
}


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const period = searchParams.get("period");

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  let startDate: Date;
  let endDate: Date;

  // Date range logic (remains unchanged)
 if (period === "daily") {
  startDate = setStartOfDay(new Date(date));
  endDate = setEndOfDay(new Date(date));
} else if (period === "weekly") {
  startDate = setStartOfDay(getStartOfISOWeek(date));
  endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  endDate = setEndOfDay(endDate);
} else if (period === "monthly") {
  const [year, month] = date.split("-");
  startDate = setStartOfDay(new Date(Number(year), Number(month) - 1, 1));
  endDate = new Date(Number(year), Number(month), 0); // Last day of month
  endDate = setEndOfDay(endDate);
} else if (period === "yearly") {
  const year = Number(date);
  startDate = setStartOfDay(new Date(year, 0, 1));
  endDate = setEndOfDay(new Date(year, 11, 31));
} else {
  // Default to daily
  startDate = setStartOfDay(new Date(date));
  endDate = setEndOfDay(new Date(date));
}


  try {
    // 1. Calculate Net Sales from CompletedOrder for Summary
    // co.total is gross total, co.discountAmount is combined (item + order-level) discount
    const [netSalesRows]: [any[], any] = await db.execute(
      `SELECT SUM(co.total - co.discountAmount) as netSales
       FROM completedOrder co
       WHERE co.createdAt >= ? AND co.createdAt < ?`,
      [startDate, endDate]
    );
    const netSales = Number(netSalesRows[0]?.netSales || 0);

    // Calculate Total Cashier Discount (Order-Level Discount value) for Summary
    // This query calculates the actual monetary value of order-level discounts.
    const [cashierDiscountRows]: [any[], any] = await db.execute(
      `WITH OrderItemAggregates AS (
          -- Calculate gross total and sum of item-level discounts for each order
          SELECT
              co.id as orderId,
              co.total as orderGrossTotal, -- This is SUM(item_price * quantity) for the order
              COALESCE(SUM(ci.discountAmount), 0) as sumItemLevelDiscounts
          FROM completedOrder co
          LEFT JOIN completedOrderItem ci ON co.id = ci.orderId
          WHERE co.createdAt >= ? AND co.createdAt < ? -- Filter relevant orders
          GROUP BY co.id, co.total
      )
      SELECT SUM(
          CASE
              -- If Discount type is PERCENTAGE, apply to (orderGrossTotal - sumItemLevelDiscounts)
              WHEN d.type = 'PERCENTAGE' THEN
                  (oia.orderGrossTotal - oia.sumItemLevelDiscounts) * d.value / 100
              -- If Discount type is NORMAL, use its fixed value
              WHEN d.type = 'NORMAL' THEN
                  d.value
              ELSE 0 -- Should ideally not happen with clean data
          END
      ) as totalCalculatedCashierDiscount
      FROM completedOrder co
      -- Join with Discount table for order-level discounts only
      JOIN discount d ON co.discountId = d.id AND d.scope = 'TOTAL'
      -- Join with pre-calculated aggregates for item discounts
      JOIN OrderItemAggregates oia ON co.id = oia.orderId
      -- No additional date filter for 'co' here as 'oia' is already date-filtered.
      WHERE co.discountId IS NOT NULL; -- Only consider orders that actually have an order-level discount applied
      `,
      [startDate, endDate] // These parameters are for the OrderItemAggregates CTE
    );
    const totalCashierDiscount = Number(cashierDiscountRows[0]?.totalCalculatedCashierDiscount || 0);


    // 2. Calculate Total HPP (Menu HPP + Modifier HPP) for Summary
    const [menuHppRows]: [any[], any] = await db.execute(
      `SELECT SUM(m.hargaBakul * ci.quantity) as totalMenuHPP
       FROM completedOrder co
       JOIN completedOrderItem ci ON co.id = ci.orderId
       JOIN menu m ON ci.menuId = m.id
       WHERE co.createdAt >= ? AND co.createdAt < ?`,
      [startDate, endDate]
    );
    const totalMenuHPP = Number(menuHppRows[0]?.totalMenuHPP || 0);

    const [modifierHppRows]: [any[], any] = await db.execute(
      `SELECT SUM(ing.price * mi.amount * ci.quantity) as totalModifierHPP
       FROM completedOrder co
       JOIN completedOrderItem ci ON co.id = ci.orderId
       JOIN completedOrderItemModifier cim ON ci.id = cim.completedOrderItemId
       JOIN modifierIngredient mi ON cim.modifierId = mi.modifierId
       JOIN ingredient ing ON mi.ingredientId = ing.id
       WHERE co.createdAt >= ? AND co.createdAt < ?`,
      [startDate, endDate]
    );
    const totalModifierHPP = Number(modifierHppRows[0]?.totalModifierHPP || 0);
    const totalHPP = totalMenuHPP + totalModifierHPP;

    // 3. Calculate Gross Margin for Summary
    const grossMargin = netSales > 0 ? ((netSales - totalHPP) / netSales) * 100 : 0;

    const summary: GrossMarginDetailResponse["summary"] = {
      netSales,
      totalHPP,
      grossMargin,
      totalCashierDiscount, 
    };

    // 4. Calculate Details for each Menu Item (as per user's last provided code structure)
    // totalSales = gross sales, discount = item-level discount
    const [detailRows]: [any[], any] = await db.execute(
      `WITH OrderItemsWithHPP AS (
          SELECT
              ci.id as completedOrderItemId,
              ci.orderId,
              ci.menuId,
              ci.quantity,
              ci.price as unitPriceWithModifiers, 
              (ci.price * ci.quantity) as totalSaleForLine, -- Gross sale for the line
              ci.discountAmount as itemLineDiscount, -- Item-specific discount
              (m.hargaBakul * ci.quantity) as menuBaseHPPForLine,
              ( -- Calculate HPP for modifiers for this line item
                  COALESCE(
                      ( -- Subquery to SUM HPP of ingredients for modifiers of ONE unit of this item
                          SELECT SUM(ing.price * mi.amount) 
                          FROM completedOrderItemModifier cim_sub -- Using a different alias for subquery join
                          JOIN modifierIngredient mi ON cim_sub.modifierId = mi.modifierId
                          JOIN ingredient ing ON mi.ingredientId = ing.id
                          WHERE cim_sub.completedOrderItemId = ci.id
                      ), 0 
                  ) * ci.quantity -- Multiply unit modifier HPP by the quantity of the order item
              ) as modifierHPPForLine
          FROM completedOrderItem ci
          JOIN menu m ON ci.menuId = m.id
          JOIN completedOrder co_filter ON ci.orderId = co_filter.id
          WHERE co_filter.createdAt >= ? AND co_filter.createdAt < ?
      )
      SELECT
          m.name as menuName,
          SUM(oiwh.quantity) as quantity,
          SUM(oiwh.totalSaleForLine) as totalSales, -- Gross sales for the menu item
          SUM(oiwh.itemLineDiscount) as discount,   -- Sum of item-level discounts
          (CASE 
               WHEN SUM(oiwh.quantity) = 0 THEN 0 
               ELSE SUM(oiwh.totalSaleForLine) / SUM(oiwh.quantity) -- Avg Gross Selling Price
           END) as sellingPrice, 
          SUM(oiwh.menuBaseHPPForLine + oiwh.modifierHPPForLine) as hpp
      FROM OrderItemsWithHPP oiwh
      JOIN menu m ON oiwh.menuId = m.id
      GROUP BY m.id, m.name
      ORDER BY menuName;`,
      [startDate, endDate]
    );

    const details: MenuDetail[] = (detailRows as any[]).map(row => ({
        menuName: row.menuName,
        sellingPrice: Number(row.sellingPrice || 0), // Average gross selling price
        discount: Number(row.discount || 0),         // Item-level discount
        hpp: Number(row.hpp || 0),
        quantity: Number(row.quantity || 0),
        totalSales: Number(row.totalSales || 0),     // Gross sales
    }));

    const response: GrossMarginDetailResponse = {
      summary,
      details,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching gross margin detail:", error);
    if (error instanceof Error) {
        console.error(error.message);
        if (error.stack) console.error(error.stack);
    }
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
