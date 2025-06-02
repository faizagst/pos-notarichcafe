import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Interface untuk respons API
interface TaxReportResponse {
  name: string;
  taxRate: string;
  taxableAmount: number;
  taxCollected: number;
}

function getStartAndEndDates(period: string, dateString?: string): { startDate: Date; endDate: Date } {
  const date = dateString ? new Date(dateString) : new Date();
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
    const date = searchParams.get("date") || undefined;
    const startDateQuery = searchParams.get("startDate");
    const endDateQuery = searchParams.get("endDate");

    let startDate: Date;
    let endDate: Date;

    if (startDateQuery) {
      startDate = new Date(startDateQuery);
      endDate = endDateQuery ? new Date(endDateQuery) : new Date(startDate);
      endDate.setDate(endDate.getDate() + 1); // Query sampai akhir hari endDate
    } else {
      ({ startDate, endDate } = getStartAndEndDates(period, date));
    }

    // Ambil pajak aktif (asumsi sistem hanya menggunakan satu jenis pajak aktif pada satu waktu untuk laporan ini)
    // Jika ada beberapa jenis pajak yang bisa aktif dan diterapkan berbeda-beda per order,
    // logika ini perlu diubah untuk mengagregasi per jenis pajak.
    const [activeTaxes] = await db.query<RowDataPacket[]>(`SELECT id, name, value FROM tax WHERE isActive = 1`);

    if (activeTaxes.length === 0) {
      // Jika tidak ada pajak aktif, kembalikan array kosong atau respons yang sesuai
      return NextResponse.json([], { status: 200 });
    }

    // Untuk laporan ini, kita akan menggunakan pajak aktif pertama yang ditemukan
    // atau jika ada beberapa, mungkin perlu logika tambahan untuk memilih atau mengagregasi.
    // Saat ini, kita asumsikan laporan ini untuk satu jenis pajak utama.
    const primaryActiveTax = activeTaxes[0]; 
    const taxName = primaryActiveTax.name;
    const taxRateValue = Number(primaryActiveTax.value);
    const taxRateString = `${taxRateValue}%`;

    // Ambil data order yang memiliki taxAmount > 0 dalam periode yang ditentukan
    const [orders] = await db.query<RowDataPacket[]>(
      `
      SELECT 
        co.id AS orderId,
        co.total AS orderGrossTotal, -- Total harga kotor pesanan (menu + modifier, sebelum diskon)
        co.discountAmount AS orderTotalDiscount, -- Total diskon pada pesanan
        co.taxAmount AS orderTaxCollected -- Pajak yang terkumpul untuk pesanan ini
      FROM completedOrder co
      WHERE co.createdAt >= ? AND co.createdAt < ? AND co.taxAmount > 0
      `,
      [startDate, endDate]
    );

    if (orders.length === 0) {
      // Jika tidak ada order dengan pajak, kembalikan array kosong atau respons yang sesuai
      // Namun, kita tetap ingin menampilkan nama pajak jika ada pajak aktif, dengan nilai 0.
       const emptyResult: TaxReportResponse[] = [{
            name: taxName,
            taxRate: taxRateString,
            taxableAmount: 0,
            taxCollected: 0,
       }];
       return NextResponse.json(emptyResult, { status: 200 });
    }

    let totalTaxableAmount = 0;
    let totalTaxCollected = 0;

    for (const order of orders) {
      const orderGrossTotal = Number(order.orderGrossTotal || 0);
      const orderTotalDiscount = Number(order.orderTotalDiscount || 0);
      const orderTaxCollected = Number(order.orderTaxCollected || 0);

      // Taxable Amount untuk order ini adalah (Total Kotor Order - Total Diskon Order)
      const taxableAmountForThisOrder = orderGrossTotal - orderTotalDiscount;
      
      totalTaxableAmount += taxableAmountForThisOrder;
      totalTaxCollected += orderTaxCollected;
    }

    // Hasilnya akan selalu satu baris per jenis pajak aktif yang utama
    // Jika ada beberapa pajak aktif dan ingin dirinci, struktur result perlu diubah.
    const result: TaxReportResponse[] = [
      {
        name: taxName,
        taxRate: taxRateString,
        taxableAmount: totalTaxableAmount,
        taxCollected: totalTaxCollected,
      },
    ];

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/tax-report:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error", message },
      { status: 500 }
    );
  }
}
