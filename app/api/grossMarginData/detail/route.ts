import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface SummaryRaw {
  netSales: bigint | number;
  totalHPP: bigint | number;
}

interface MenuDetail {
  menuName: string;
  sellingPrice: number;
  discount: number;
  hpp: number;
  quantity: bigint | number;
  totalSales: number;
}

interface GrossMarginDetailResponse {
  summary: {
    netSales: number;
    totalHPP: number;
    grossMargin: number;
  };
  details: MenuDetail[];
}

function getStartOfISOWeek(isoWeek: string): Date {
  const [yearStr, weekStr] = isoWeek.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dow === 0) {
    ISOweekStart.setDate(simple.getDate() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() - dow + 1);
  }
  return ISOweekStart;
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

  if (period === "daily") {
    startDate = new Date(date);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  } else if (period === "weekly") {
    startDate = getStartOfISOWeek(date);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
  } else if (period === "monthly") {
    const [year, month] = date.split("-");
    startDate = new Date(Number(year), Number(month) - 1, 1);
    endDate = new Date(Number(year), Number(month), 1);
  } else if (period === "yearly") {
    const year = Number(date);
    startDate = new Date(year, 0, 1);
    endDate = new Date(year + 1, 0, 1);
  } else {
    startDate = new Date(date);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  }

  try {
    // Query Net Sales langsung dari CompletedOrder
    const [netSalesRows] = await db.execute(
      `SELECT SUM(total - discountAmount) as netSales
   FROM CompletedOrder
   WHERE createdAt >= ? AND createdAt < ?`,
      [startDate, endDate]
    );

    // Query total HPP dari join
    const [hppRows] = await db.execute(
      `SELECT SUM(m.hargaBakul * ci.quantity) as totalHPP
   FROM CompletedOrder co
   JOIN CompletedOrderItem ci ON co.id = ci.orderId
   JOIN Menu m ON ci.menuId = m.id
   WHERE co.createdAt >= ? AND co.createdAt < ?`,
      [startDate, endDate]
    );

    // Parse hasilnya
    const netSales = Number((netSalesRows as any)[0]?.netSales || 0);
    const totalHPP = Number((hppRows as any)[0]?.totalHPP || 0);
    const grossMargin = netSales > 0 ? ((netSales - totalHPP) / netSales) * 100 : 0;


    const summary: GrossMarginDetailResponse["summary"] = {
      netSales,
      totalHPP,
      grossMargin,
    };

    const [detailRows] = await db.execute(
      `SELECT 
        m.name as menuName,
        m.price as sellingPrice,
        m.hargaBakul as hpp,
        co.discountAmount as discount,
        SUM(ci.quantity) as quantity,
        SUM(m.price * ci.quantity) as totalSales
      FROM CompletedOrder co
      JOIN CompletedOrderItem ci ON co.id = ci.orderId
      JOIN Menu m ON ci.menuId = m.id
      WHERE co.createdAt >= ? AND co.createdAt < ?
      GROUP BY m.id`,
      [startDate, endDate]
    );

    const details = detailRows as MenuDetail[];

    const response: GrossMarginDetailResponse = {
      summary,
      details,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching gross margin detail:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
