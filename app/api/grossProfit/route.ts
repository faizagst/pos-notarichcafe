// app/api/gross-profit/route.ts
import { NextRequest, NextResponse } from "next/server";
import db  from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Interface untuk respons API
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
  details: {
    orderId: number;
    orderDate: string;
    menuName: string;
    sellingPrice: number;
    quantity: number;
    itemTotalSelling: number;
    hpp: number;
    itemTotalHPP: number;
  }[];
  ordersCount: number;
  startDate: string;
  endDate: string;
}

function getStartAndEndDates(period: string, dateString: string): { startDate: Date; endDate: Date } {
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

    const [orders] = await db.execute<RowDataPacket[]>(
      `
      SELECT co.id as orderId, co.createdAt as orderDate, co.discountAmount, coi.quantity,
             m.name as menuName, m.price as sellingPrice, m.hargaBakul as hpp
      FROM completedOrder co
      JOIN completedOrderItem coi ON co.id = coi.orderId
      JOIN menu m ON coi.menuId = m.id
      WHERE co.createdAt >= ? AND co.createdAt < ?
      ORDER BY co.createdAt DESC
    `,
      [startDate, endDate]
    );

    const details: GrossProfitResponse["details"] = [];
    let grossSales = 0;
    let discounts = 0;
    let cogs = 0;
    
    const uniqueOrders = new Set<number>();
    
    for (const row of orders) {
      const sellingPrice = Number(row.sellingPrice);
      const hpp = Number(row.hpp);
      const quantity = Number(row.quantity);
      const itemTotalSelling = sellingPrice * quantity;
      const itemTotalHPP = hpp * quantity;
    
      grossSales += itemTotalSelling;
      cogs += itemTotalHPP;
    
      if (!uniqueOrders.has(row.orderId)) {
        uniqueOrders.add(row.orderId);
        discounts += Number(row.discountAmount || 0);
      }
    
      details.push({
        orderId: row.orderId,
        orderDate: new Date(row.orderDate).toISOString(),
        menuName: row.menuName,
        sellingPrice,
        quantity,
        itemTotalSelling,
        hpp,
        itemTotalHPP,
      });
    }
    

    const refunds = 0;
    const netSales = grossSales - discounts - refunds;
    const grossProfit = netSales - cogs;

    const summary: GrossProfitResponse["summary"] = {
      explanation:
        "Gross Sales dihitung sebagai total penjualan normal dikurangi HPP (COGS). Net Sales dihitung sebagai Gross Sales dikurangi Discounts dan Refunds.",
      grossSales,
      discounts,
      refunds,
      netSales,
      cogs,
      grossProfit,
    };

    const response: GrossProfitResponse = {
      summary,
      details,
      ordersCount: uniqueOrders.size,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in gross-profit:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
