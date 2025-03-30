import { NextRequest, NextResponse } from "next/server";
import db from '@/lib/db';

// Interface untuk respons API
interface ModifierSalesResponse {
    modifierName: string;
    quantity: number;
    totalSales: number;
    hpp: number;
    grossSales: number;
  }
  

function getStartAndEndDates(period: string, dateString: string): { startDate: Date; endDate: Date } {
    const date = new Date(dateString);
    let startDate: Date;
    let endDate: Date;

  switch (period.toLowerCase()) {
    case "daily":
      startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      break;
    case "weekly":
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(date.setDate(diff));
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "daily";
    const date = searchParams.get("date");
    const startDateQuery = searchParams.get("startDate");
    const endDateQuery = searchParams.get("endDate");

    let startDate: Date;
    let endDate: Date;

    if (startDateQuery) {
      startDate = new Date(startDateQuery);
      endDate = endDateQuery ? new Date(endDateQuery) : new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      const dateStr = date || new Date().toISOString();
      ({ startDate, endDate } = getStartAndEndDates(period, dateStr));
    }

   
    const [completedOrders]:any = await db.execute(
      `SELECT co.id AS orderId, oi.quantity, m.id AS modifierId, m.name AS modifierName, 
              m.price AS modifierPrice, ing.price AS ingredientPrice, mi.amount AS ingredientAmount
       FROM completedOrder co
       JOIN completedOrderItem oi ON co.id = oi.orderId
       JOIN completedOrderItemModifier om ON oi.id = om.completedOrderItemId
       JOIN modifier m ON om.modifierId = m.id
       LEFT JOIN modifierIngredient mi ON m.id = mi.modifierId
       LEFT JOIN ingredient ing ON mi.ingredientId = ing.id
       WHERE co.createdAt >= ? AND co.createdAt < ?`, 
      [startDate, endDate]
    );


    // Agregasi data per modifier
    const aggregatedData: Record<number, ModifierSalesResponse> = {};

    for (const row of completedOrders) {
      const { modifierId, modifierName, quantity, modifierPrice, ingredientPrice, ingredientAmount } = row;
      
      if (!aggregatedData[modifierId]) {
        aggregatedData[modifierId] = {
          modifierName,
          quantity: 0,
          totalSales: 0,
          hpp: 0,
          grossSales: 0,
        };
      }

      const totalSales = modifierPrice * quantity;
      const hpp = (ingredientPrice || 0) * (ingredientAmount || 0) * quantity;

      aggregatedData[modifierId].quantity += quantity;
      aggregatedData[modifierId].totalSales += totalSales;
      aggregatedData[modifierId].hpp += hpp;
      aggregatedData[modifierId].grossSales += totalSales - hpp;
    }

    const result = Object.values(aggregatedData).sort((a, b) => b.totalSales - a.totalSales);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
