// app/api/gross-profit/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { RowDataPacket } from "mysql2";

interface DetailItem {
  orderId: number;
  orderDate: string;
  menuName: string;
  sellingPrice: number;
  quantity: number;
  itemTotalSelling: number;
  hpp: number; // HPP Gabungan (Menu Utama + Modifier) per unit item
  itemTotalHPP: number; // HPP Gabungan * Kuantitas
}

interface GrossProfitResponse {
  summary: {
    explanation: string;
    grossSales: number;
    discounts: number;
    refunds: number;
    netSales: number;
    grossProfit: number;
    cogs: number;
  };
  details: DetailItem[];
  ordersCount: number;
  startDate: string;
  endDate: string;
}

function getStartAndEndDates(
  period: string,
  dateString: string
): { startDate: Date; endDate: Date } {
  const date = new Date(dateString);
  let startDate: Date;
  let endDate: Date;
  switch (period) {
    case "daily":
      startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      break;
    case "weekly": {
      const day = date.getDay();
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "daily";
    const dateParam = searchParams.get("date");
    const startDateQuery = searchParams.get("startDate");
    const endDateQuery = searchParams.get("endDate");

    let startDate: Date;
    let endDate: Date;

    if (startDateQuery) {
      startDate = new Date(startDateQuery);
      endDate = endDateQuery ? new Date(endDateQuery) : new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      const dateStr = dateParam || new Date().toISOString();
      ({ startDate, endDate } = getStartAndEndDates(period, dateStr));
    }

    const [orderRows] = await db.execute<RowDataPacket[]>(
      `
      WITH ModifierHPP AS (
          SELECT
              md.id as modifierId,
              SUM(COALESCE(ing.price, 0) * COALESCE(mi.amount, 0)) as modifierHppValue
          FROM modifier md
          LEFT JOIN modifierIngredient mi ON md.id = mi.modifierId
          LEFT JOIN ingredient ing ON mi.ingredientId = ing.id
          GROUP BY md.id
      )
      SELECT 
          co.id as orderId, 
          co.createdAt as orderDate, 
          co.discountAmount,
          coi.id as orderItemId,
          coi.quantity,
          m.name as menuName,
          m.price as menuSellingPrice,
          m.hargaBakul as menuHpp,
          md.id as modifierId,      
          md.price as modifierSellingPrice,
          md.name as modifierName,
          mh.modifierHppValue        -- HPP per unit modifier dari CTE
      FROM completedOrder co
      JOIN completedOrderItem coi ON co.id = coi.orderId
      JOIN menu m ON coi.menuId = m.id
      LEFT JOIN completedOrderItemModifier coim ON coi.id = coim.completedOrderItemId
      LEFT JOIN modifier md ON coim.modifierId = md.id
      LEFT JOIN ModifierHPP mh ON md.id = mh.modifierId -- Join CTE untuk HPP modifier
      WHERE co.createdAt >= ? AND co.createdAt < ?
      ORDER BY co.id, coi.id, md.id
      `,
      [startDate, endDate]
    );

    const aggregatedDetails: Record<string, DetailItem> = {};
    let totalGrossSales = 0;
    let totalCogs = 0;
    let totalDiscounts = 0;
    const processedOrderIdsForDiscount = new Set<number>();

    for (const row of orderRows) {
      const orderId = Number(row.orderId);
      const orderItemId = Number(row.orderItemId);
      const quantity = Number(row.quantity);
      const baseMenuSellingPrice = Number(row.menuSellingPrice);
      const baseMenuHpp = Number(row.menuHpp);
      const modifierPrice = Number(row.modifierSellingPrice || 0);
      const modifierHppPerUnit = Number(row.modifierHppValue || 0);

      if (!aggregatedDetails[orderItemId]) {
        aggregatedDetails[orderItemId] = {
          orderId: orderId,
          orderDate: new Date(row.orderDate).toISOString(),
          menuName: row.menuName,
          sellingPrice: baseMenuSellingPrice, // Harga jual dasar menu
          quantity: quantity,
          itemTotalSelling: baseMenuSellingPrice * quantity,
          hpp: baseMenuHpp, // HPP awal adalah HPP menu dasar
          itemTotalHPP: baseMenuHpp * quantity,
        };
        totalGrossSales += baseMenuSellingPrice * quantity;
        totalCogs += baseMenuHpp * quantity;
      }

      if (row.modifierId) { // Cek apakah baris ini memiliki data modifier
        aggregatedDetails[orderItemId].itemTotalSelling += modifierPrice * quantity;
        aggregatedDetails[orderItemId].hpp += modifierHppPerUnit; // Tambah HPP modifier ke HPP item
        aggregatedDetails[orderItemId].itemTotalHPP += modifierHppPerUnit * quantity;
        
        totalGrossSales += modifierPrice * quantity;
        totalCogs += modifierHppPerUnit * quantity;
      }

      if (!processedOrderIdsForDiscount.has(orderId)) {
        totalDiscounts += Number(row.discountAmount || 0);
        processedOrderIdsForDiscount.add(orderId);
      }
    }

    const finalDetailsArray = Object.values(aggregatedDetails);
    const refunds = 0;
    const netSales = totalGrossSales - totalDiscounts - refunds;
    const grossProfit = netSales - totalCogs;

    const summary: GrossProfitResponse["summary"] = {
      explanation:
        "Gross Sales: Total pendapatan dari penjualan semua item menu dan modifiernya. COGS: Total Harga Pokok Penjualan (HPP) untuk item menu utama dan semua modifiernya. Discounts: Total diskon yang diberikan pada pesanan. Refunds: Total pengembalian dana (saat ini diasumsikan 0). Net Sales: Gross Sales - Discounts - Refunds. Gross Profit: Net Sales - COGS.",
      grossSales: totalGrossSales,
      discounts: totalDiscounts,
      refunds,
      netSales,
      cogs: totalCogs,
      grossProfit,
    };
    
    const reportEndDate = new Date(endDate);
    reportEndDate.setDate(reportEndDate.getDate() -1);

    const response: GrossProfitResponse = {
      summary,
      details: finalDetailsArray,
      ordersCount: processedOrderIdsForDiscount.size,
      startDate: startDate.toISOString(),
      endDate: reportEndDate.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in GET gross-profit:", error);
    let errorMessage = "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
