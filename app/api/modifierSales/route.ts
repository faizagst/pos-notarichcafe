import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// Interface untuk respons API
interface ModifierSalesResponse {
  modifierId: number;
  modifierName: string;
  categoryName: string;
  quantity: number;     // Total unit modifier ini terjual
  totalSales: number;   // Total pendapatan dari modifier ini (Harga Jual * Kuantitas)
  totalHpp: number;     // Total HPP untuk modifier ini (HPP Satuan * Kuantitas)
  grossProfit: number;  // totalSales - totalHpp
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
    case "weekly": {
      const day = date.getDay(); // 0 (Minggu) - 6 (Sabtu)
      // Set ke Senin minggu ini
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
      startDate = new Date(date.getFullYear(), date.getMonth(), diff); // Versi aman
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

    const [rows] = await db.execute<RowDataPacket[]>(
      `
      WITH ModifierHPPUnit AS (
        SELECT
          md.id as modifierId,
          SUM(COALESCE(ing.price, 0) * COALESCE(mi.amount, 0)) as unitHpp
        FROM modifier md
        LEFT JOIN modifierIngredient mi ON md.id = mi.modifierId
        LEFT JOIN ingredient ing ON mi.ingredientId = ing.id
        GROUP BY md.id
      )
      SELECT 
        md.id AS modifierId,
        md.name AS modifierName,
        mc.name AS categoryName,
        oi.quantity AS parentItemQuantity, 
        md.price AS modifierUnitPrice,
        mh.unitHpp AS modifierUnitHpp
      FROM completedOrder co
      JOIN completedOrderItem oi ON co.id = oi.orderId
      JOIN completedOrderItemModifier coim ON oi.id = coim.completedOrderItemId
      JOIN modifier md ON coim.modifierId = md.id
      JOIN modifierCategory mc ON md.categoryId = mc.id
      LEFT JOIN ModifierHPPUnit mh ON md.id = mh.modifierId
      WHERE co.createdAt >= ? AND co.createdAt < ?
      `, 
      [startDate, endDate]
    );

    const aggregatedData: Record<number, {
      modifierId: number;
      modifierName: string;
      categoryName: string;
      quantity: number;
      totalSales: number;
      totalHpp: number;
    }> = {};

    for (const row of rows) {
      const modifierId = Number(row.modifierId);
      const modifierName = String(row.modifierName);
      const categoryName = String(row.categoryName);
      const parentItemQuantity = Number(row.parentItemQuantity);
      const modifierUnitPrice = Number(row.modifierUnitPrice || 0);
      const modifierUnitHpp = Number(row.modifierUnitHpp || 0);
      
      if (!aggregatedData[modifierId]) {
        aggregatedData[modifierId] = {
          modifierId,
          modifierName,
          categoryName,
          quantity: 0,
          totalSales: 0,
          totalHpp: 0,
        };
      }

      aggregatedData[modifierId].quantity += parentItemQuantity;
      aggregatedData[modifierId].totalSales += modifierUnitPrice * parentItemQuantity;
      aggregatedData[modifierId].totalHpp += modifierUnitHpp * parentItemQuantity;
    }

    const result: ModifierSalesResponse[] = Object.values(aggregatedData).map(item => ({
      ...item,
      grossProfit: item.totalSales - item.totalHpp,
    })).sort((a, b) => b.totalSales - a.totalSales); // Urutkan berdasarkan total penjualan

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/modifier-sales:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error", message },
      { status: 500 }
    );
  }
}
