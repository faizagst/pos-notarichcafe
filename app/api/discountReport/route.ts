import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface DiscountReportResponse {
  name: string;         // Nama program diskon atau "Diskon [Nama Menu]" atau "Diskon Manual (Kasir)"
  discount: string;     // Representasi string dari nilai diskon (mis. "10%" atau "Rp 5.000"), atau "-" untuk agregat nominal
  count: number;        // Jumlah pesanan yang menggunakan diskon ini / jumlah item menu terjual dengan diskon
  grossDiscount: number; // Total nilai nominal diskon yang diatribusikan ke kategori ini
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
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
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
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || "daily";
    const date = url.searchParams.get('date');
    const startDateQuery = url.searchParams.get('startDate');
    const endDateQuery = url.searchParams.get('endDate');
    
    const formatCurrency = (num: number): string => {
      if (isNaN(num)) return "Rp 0";
      return "Rp " + num.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

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

    // Query 1: Untuk data diskon tingkat pesanan
    const [orderLevelDataRows] = await db.execute<RowDataPacket[]>(
      `SELECT 
          co.id AS orderId, 
          co.discountId, 
          co.discountAmount AS orderGrandTotalDiscount,
          d.name AS discountProgramName,
          d.value AS discountProgramValue,
          d.type AS discountProgramType,
          (SELECT IFNULL(SUM(coi_inner.discountAmount), 0) 
           FROM completedOrderItem coi_inner 
           WHERE coi_inner.orderId = co.id) AS sumItemDiscountsInOrder
      FROM completedOrder co
      LEFT JOIN discount d ON co.discountId = d.id
      WHERE co.createdAt >= ? AND co.createdAt < ? AND co.discountAmount > 0;`,
      [startDate, endDate]
    );

    // Query 2: Untuk rincian diskon per item menu
    const [itemSpecificDiscountRows] = await db.execute<RowDataPacket[]>(
      `SELECT 
          m.id AS menuId,
          m.name AS menuName,
          coi.discountAmount AS itemDiscountValue
      FROM completedOrderItem coi
      JOIN menu m ON coi.menuId = m.id
      JOIN completedOrder co ON coi.orderId = co.id
      WHERE co.createdAt >= ? AND co.createdAt < ? AND coi.discountAmount > 0;`,
      [startDate, endDate]
    );

    const aggregated: Record<string, DiscountReportResponse> = {};

    // Proses diskon tingkat pesanan (kasir)
    for (const row of orderLevelDataRows) {
      const sumItemDiscountsInOrder = Number(row.sumItemDiscountsInOrder || 0);
      const orderGrandTotalDiscount = Number(row.orderGrandTotalDiscount || 0);
      const orderLevelOnlyDiscount = orderGrandTotalDiscount - sumItemDiscountsInOrder;

      if (orderLevelOnlyDiscount > 0) {
        let key: string;
        let name: string;
        let discountStr: string;

        if (row.discountId) { // Diskon terprogram dari kasir
          key = `order_discount_program_${row.discountId}`;
          name = String(row.discountProgramName || `Program Diskon ID ${row.discountId}`);
          const val = Number(row.discountProgramValue);
          discountStr = row.discountProgramType === "PERCENTAGE" ? `${val}%` : formatCurrency(val);
        } else { // Diskon manual dari kasir
          key = "manual_order_discount";
          name = "Diskon Manual (Kasir)";
          discountStr = "-"; // Nilai nominalnya ada di grossDiscount
        }

        if (!aggregated[key]) {
          aggregated[key] = {
            name: name,
            discount: discountStr,
            count: 0,
            grossDiscount: 0,
          };
        }
        aggregated[key].count += 1; // Menghitung jumlah pesanan yang mendapat diskon order-level ini
        aggregated[key].grossDiscount += orderLevelOnlyDiscount;
      }
    }

    // Proses diskon spesifik per item menu
    for (const row of itemSpecificDiscountRows) {
      const menuId = Number(row.menuId);
      const menuName = String(row.menuName);
      const itemDiscountValue = Number(row.itemDiscountValue || 0);
      const key = `item_menu_discount_${menuId}`;

      if (!aggregated[key]) {
        aggregated[key] = {
          name: `Diskon ${menuName}`,
          discount: "-", 
          count: 0,
          grossDiscount: 0,
        };
      }
      // Setiap baris dari query ini adalah satu item menu yang terjual dengan diskon
      aggregated[key].count += 1; 
      aggregated[key].grossDiscount += itemDiscountValue;
    }
    
    const result = Object.values(aggregated).sort((a, b) => b.grossDiscount - a.grossDiscount);
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Error in discount-report API:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error", message: message },
      { status: 500 }
    );
  }
}
