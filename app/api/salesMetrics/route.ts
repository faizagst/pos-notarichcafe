import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { RowDataPacket } from "mysql2";

interface Metrics {
  totalSales: number;    // Uang yang diterima (SUM(co.finalTotal))
  transactions: number;
  grossProfit: number;   // (Gross Revenue - Discounts) - COGS
  netProfit: number;     // Gross Profit - Tax - Gratuity
  discounts: number;
  tax: number;
  gratuity: number;
}

function calculatePeriodDates(basePeriod: string, targetDate: Date): { startDate: Date; endDate: Date } {
  let startDate: Date;
  let endDate: Date;
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const day = targetDate.getDate();

  switch (basePeriod.toLowerCase()) {
    case "daily":
      startDate = new Date(year, month, day);
      endDate = new Date(year, month, day + 1);
      break;
    case "weekly": {
      const currentDayOfWeek = targetDate.getDay(); // 0 (Sunday) - 6 (Saturday)
      const diffToMonday = day - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1);
      startDate = new Date(year, month, diffToMonday);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 7);
      break;
    }
    case "monthly":
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 1);
      break;
    case "yearly":
      startDate = new Date(year, 0, 1);
      endDate = new Date(year + 1, 0, 1);
      break;
    default:
      throw new Error(`Invalid base period: ${basePeriod}`);
  }
  return { startDate, endDate };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periodInput = searchParams.get("period") || "daily";
    const dateParam = searchParams.get("date") || new Date().toISOString();

    let effectiveDate = new Date(dateParam);
    let basePeriod = periodInput;

    if (periodInput.endsWith("-prev")) {
        basePeriod = periodInput.split("-")[0];
        switch (basePeriod) {
            case "daily": effectiveDate.setDate(effectiveDate.getDate() - 1); break;
            case "weekly": effectiveDate.setDate(effectiveDate.getDate() - 7); break;
            case "monthly": effectiveDate.setMonth(effectiveDate.getMonth() - 1); break;
            case "yearly": effectiveDate.setFullYear(effectiveDate.getFullYear() - 1); break;
            default: throw new Error(`Invalid period specifier: ${periodInput}`);
        }
    }
    const { startDate, endDate } = calculatePeriodDates(basePeriod, effectiveDate);

    // Query utama untuk mengambil data order dan COGS per item baris
    const [orderItemRows] = await db.execute<RowDataPacket[]>(
      `
      WITH ModifierHPPUnit AS (
          SELECT
              md.id as modifierId,
              SUM(COALESCE(ing.price, 0) * COALESCE(mi.amount, 0)) as HppPerUnit
          FROM modifier md
          LEFT JOIN modifierIngredient mi ON md.id = mi.modifierId
          LEFT JOIN ingredient ing ON mi.ingredientId = ing.id
          GROUP BY md.id
      ),
      OrderItemLineCOGS AS (
          SELECT
              coi.id as orderItemId,
              coi.orderId,
              coi.quantity,
              m.hargaBakul AS menuHpp,
              COALESCE(
                  (SELECT SUM(mh_inner.HppPerUnit)
                   FROM completedOrderItemModifier coim_inner
                   JOIN ModifierHPPUnit mh_inner ON coim_inner.modifierId = mh_inner.modifierId
                   WHERE coim_inner.completedOrderItemId = coi.id),
              0) AS totalModifiersHppPerParentItemUnit
          FROM completedOrderItem coi
          JOIN menu m ON coi.menuId = m.id
      )
      SELECT
          co.id AS order_id,
          co.total AS order_gross_revenue,      -- Pendapatan kotor per pesanan (sebelum diskon)
          co.discountAmount AS order_discount_amount,
          co.taxAmount AS order_tax_amount,
          co.gratuityAmount AS order_gratuity_amount,
          co.finalTotal AS order_final_total,      -- Uang yang diterima untuk pesanan ini
          oilc.quantity AS item_quantity,
          oilc.menuHpp AS item_menu_hpp,
          oilc.totalModifiersHppPerParentItemUnit AS item_modifiers_hpp_sum_per_unit
      FROM completedOrder co
      LEFT JOIN OrderItemLineCOGS oilc ON co.id = oilc.orderId -- LEFT JOIN jika ada order tanpa item (seharusnya tidak terjadi)
      WHERE co.createdAt >= ? AND co.createdAt < ?;
      `,
      [startDate, endDate]
    );

    let sumOrderGrossRevenue = 0;
    let sumTotalDiscounts = 0;
    let sumTotalTax = 0;
    let sumTotalGratuity = 0;
    let sumTotalCollected = 0; // Untuk uang yang diterima
    let sumTotalCOGS = 0;
    const processedOrderIds = new Set<number>();

    for (const row of orderItemRows) {
      const orderId = Number(row.order_id);

      if (!processedOrderIds.has(orderId)) {
        // Akumulasi nilai tingkat pesanan hanya sekali per pesanan
        sumOrderGrossRevenue += Number(row.order_gross_revenue || 0);
        sumTotalDiscounts += Number(row.order_discount_amount || 0);
        sumTotalTax += Number(row.order_tax_amount || 0);
        sumTotalGratuity += Number(row.order_gratuity_amount || 0);
        sumTotalCollected += Number(row.order_final_total || 0); // Akumulasi finalTotal
        processedOrderIds.add(orderId);
      }

      // Akumulasi COGS untuk setiap item baris (termasuk modifier)
      // Perlu dicek jika oilc.* bisa null karena LEFT JOIN
      if (row.item_quantity !== null && row.item_quantity !== undefined) {
          const itemQuantity = Number(row.item_quantity);
          const itemMenuHpp = Number(row.item_menu_hpp || 0);
          const itemModifiersHppSumPerUnit = Number(row.item_modifiers_hpp_sum_per_unit || 0);
          
          const cogsForItemLine = itemQuantity * (itemMenuHpp + itemModifiersHppSumPerUnit);
          sumTotalCOGS += cogsForItemLine;
      }
    }

    const calculatedNetSales = sumOrderGrossRevenue - sumTotalDiscounts; // Net Sales = Pendapatan Kotor - Diskon
    const calculatedGrossProfit = calculatedNetSales - sumTotalCOGS;    // Laba Kotor = Net Sales - COGS
    const calculatedNetProfit = calculatedGrossProfit - sumTotalTax - sumTotalGratuity; // Laba Bersih (sederhana)

    const response: Metrics = {
      totalSales: sumTotalCollected,
      transactions: processedOrderIds.size,
      grossProfit: calculatedGrossProfit,
      netProfit: calculatedNetProfit,
      discounts: sumTotalDiscounts,
      tax: sumTotalTax,
      gratuity: sumTotalGratuity,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching sales metrics:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: "Internal server error", message }, { status: 500 });
  }
}
