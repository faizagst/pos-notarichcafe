import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { RowDataPacket } from "mysql2";

// --- Interfaces for API Response ---

interface AppliedModifierInfo {
    modifierId: number;
    name: string;
    quantity: number; // Kuantitas item menu induk
    unitPrice: number; // Harga satuan master modifier
    unitHpp: number;   // HPP satuan master modifier
    // Opsional: jika ingin menampilkan diskon/net sales teralokasi per modifier
    // allocatedDiscountValue?: number;
    // netSalesContribution?: number;
}

interface OrderItemDetail {
  id: number; // completedOrderItem.id
  quantity: number;
  price: number; // coi.price (harga satuan kotor gabungan menu + modifier di baris itu)
  itemDiscount: number; // coi.discountAmount (diskon spesifik untuk baris itu)
  menu: {
    id: number;
    name: string;
    price: number; // Harga satuan master menu
    hargaBakul: number; // HPP satuan master menu
  };
  modifiersApplied: AppliedModifierInfo[]; // Rincian modifier yang diterapkan
}

interface OrderDetail {
  id: number; // completedOrder.id
  createdAt: string;
  total: number; // Pendapatan kotor pesanan (co.total)
  discountAmount: number; // Total diskon di pesanan (co.discountAmount)
  taxAmount: number;
  gratuityAmount: number;
  finalTotal: number; // Uang yang diterima (co.finalTotal)
  orderItems: OrderItemDetail[];
}

interface TransactionDetail {
  id: number;
  createdAt: string;
  total: number; // Seharusnya finalTotal (uang yang diterima)
  itemCount: number;
  menus: string[]; // Nama item menu utama
}

interface GrossProfitDetailItem {
  orderId: number;
  orderDate: string;
  orderItemId: number;
  menuName: string; // Nama item menu utama
  quantity: number;
  lineGrossValue: number; // Nilai kotor baris ini (menu + modifier) sebelum diskon apapun
  totalAllocatedDiscountToLine: number; // Total diskon teralokasi ke baris ini (spesifik item + pro-rata order-level)
  netSalesForLine: number; // lineGrossValue - totalAllocatedDiscountToLine
  cogsForLine: number; // COGS baris ini (HPP menu + HPP semua modifiernya) * kuantitas
  grossProfitForLine: number; // netSalesForLine - cogsForLine
}

interface NetProfitDetailItem {
  orderId: number;
  orderDate: string;
  orderItemId: number;
  menuName: string; // Nama item menu utama
  quantity: number;
  netSalesForLine: number; 
  cogsForLine: number;     
  allocatedTaxToLine: number; 
  allocatedGratuityToLine: number; 
  netProfitForLine: number; 
}

interface SalesDetailsResponse {
  summary?: { explanation: string; [key: string]: string | number };
  details: OrderDetail[] | TransactionDetail[] | GrossProfitDetailItem[] | NetProfitDetailItem[];
  message?: string;
}


// --- Helper Functions ---
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
      const currentDayOfWeek = targetDate.getDay(); 
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

// --- API Route Handler ---
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const metric = searchParams.get("metric");
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

    const [sqlRows] = await db.execute<RowDataPacket[]>(
      `
      WITH ModifierHPPUnit AS (
          SELECT
              md.id as modifierId,
              SUM(COALESCE(ing.price, 0) * COALESCE(mi.amount, 0)) as HppPerUnit
          FROM modifier md
          LEFT JOIN modifierIngredient mi ON md.id = mi.modifierId
          LEFT JOIN ingredient ing ON mi.ingredientId = ing.id
          GROUP BY md.id
      )
      SELECT
          co.id AS order_id,
          co.createdAt AS order_date,
          co.total AS order_gross_revenue,
          co.discountAmount AS order_total_discount_amount,
          co.taxAmount AS order_tax_amount,
          co.gratuityAmount AS order_gratuity_amount,
          co.finalTotal AS order_final_total,
          
          coi.id AS order_item_id,
          coi.quantity AS item_quantity,
          coi.price AS coi_unit_price_gross_combined, 
          coi.discountAmount AS coi_line_specific_discount,
          
          m.id AS menu_id,
          m.name AS menu_name,
          m.price AS menu_master_unit_price,
          m.hargaBakul AS menu_master_hpp,
          
          coim.modifierId AS applied_modifier_id,
          md_applied.name AS applied_modifier_name,
          md_applied.price AS applied_modifier_master_price,
          mh_applied.HppPerUnit AS applied_modifier_master_hpp
          
      FROM completedOrder co
      JOIN completedOrderItem coi ON co.id = coi.orderId
      JOIN menu m ON coi.menuId = m.id
      LEFT JOIN completedOrderItemModifier coim ON coi.id = coim.completedOrderItemId
      LEFT JOIN modifier md_applied ON coim.modifierId = md_applied.id
      LEFT JOIN ModifierHPPUnit mh_applied ON coim.modifierId = mh_applied.modifierId
      WHERE co.createdAt >= ? AND co.createdAt < ?
      ORDER BY co.id, coi.id, md_applied.id; 
      `,
      [startDate, endDate]
    );

    // --- Data Processing ---
    const reconstructedOrdersMap = new Map<number, OrderDetail>();

    for (const row of sqlRows) {
        const orderId = Number(row.order_id);
        let orderDetail = reconstructedOrdersMap.get(orderId);

        if (!orderDetail) {
            orderDetail = {
                id: orderId,
                createdAt: row.order_date,
                total: Number(row.order_gross_revenue || 0),
                discountAmount: Number(row.order_total_discount_amount || 0),
                taxAmount: Number(row.order_tax_amount || 0),
                gratuityAmount: Number(row.order_gratuity_amount || 0),
                finalTotal: Number(row.order_final_total || 0),
                orderItems: [],
            };
            reconstructedOrdersMap.set(orderId, orderDetail);
        }

        const orderItemId = Number(row.order_item_id);
        let orderItemDetail = orderDetail.orderItems.find(item => item.id === orderItemId);

        if (!orderItemDetail) {
            orderItemDetail = {
                id: orderItemId,
                quantity: Number(row.item_quantity),
                price: Number(row.coi_unit_price_gross_combined),
                itemDiscount: Number(row.coi_line_specific_discount),
                menu: {
                    id: Number(row.menu_id),
                    name: String(row.menu_name),
                    price: Number(row.menu_master_unit_price),
                    hargaBakul: Number(row.menu_master_hpp),
                },
                modifiersApplied: [],
            };
            orderDetail.orderItems.push(orderItemDetail);
        }

        if (row.applied_modifier_id) {
            // Hindari duplikasi modifier jika query menghasilkan beberapa baris untuk item yang sama tanpa modifier
            // (seharusnya tidak terjadi dengan ORDER BY, tapi sebagai pengaman)
            if (!orderItemDetail.modifiersApplied.find(m => m.modifierId === Number(row.applied_modifier_id))) {
                orderItemDetail.modifiersApplied.push({
                    modifierId: Number(row.applied_modifier_id),
                    name: String(row.applied_modifier_name),
                    quantity: Number(row.item_quantity), 
                    unitPrice: Number(row.applied_modifier_master_price || 0),
                    unitHpp: Number(row.applied_modifier_master_hpp || 0),
                });
            }
        }
    }
    const reconstructedOrders = Array.from(reconstructedOrdersMap.values());

    // Hitung ringkasan per pesanan untuk distribusi diskon, pajak, gratuity
    const orderSummariesForProRata = new Map<number, {
        sumCoiLineSpecificDiscounts: number;
        baseForProRataDistribution: number; // Sum of (line gross value - line specific discount)
        trueOrderLevelDiscount?: number;
        tax: number;
        gratuity: number;
    }>();

    let overallTotalCOGS = 0;

    for (const order of reconstructedOrders) {
        let currentOrderSumCoiLineSpecificDiscounts = 0;
        let currentOrderBaseForProRata = 0;

        for (const item of order.orderItems) {
            overallTotalCOGS += item.quantity * item.menu.hargaBakul; // COGS dari menu utama
            currentOrderSumCoiLineSpecificDiscounts += item.itemDiscount;
            
            const lineGrossValueFromCoi = item.price * item.quantity; // coi.price sudah termasuk modifier
            currentOrderBaseForProRata += (lineGrossValueFromCoi - item.itemDiscount);
            
            for (const modifier of item.modifiersApplied) {
                overallTotalCOGS += modifier.quantity * modifier.unitHpp; // COGS dari modifier
            }
        }
        orderSummariesForProRata.set(order.id, {
            sumCoiLineSpecificDiscounts: currentOrderSumCoiLineSpecificDiscounts,
            baseForProRataDistribution: currentOrderBaseForProRata,
            tax: order.taxAmount,
            gratuity: order.gratuityAmount,
        });
    }
    
    orderSummariesForProRata.forEach((summary, orderId) => {
        const orderMasterDiscount = reconstructedOrdersMap.get(orderId)!.discountAmount;
        summary.trueOrderLevelDiscount = Math.max(0, orderMasterDiscount - summary.sumCoiLineSpecificDiscounts);
    });

    // Kalkulasi metrik ringkasan keseluruhan
    let overallGrossRevenue = 0;
    let overallTotalDiscounts = 0;
    let overallTotalTax = 0;
    let overallTotalGratuity = 0;
    let overallTotalCollected = 0;

    reconstructedOrders.forEach(order => {
        overallGrossRevenue += order.total;
        overallTotalDiscounts += order.discountAmount;
        overallTotalTax += order.taxAmount;
        overallTotalGratuity += order.gratuityAmount;
        overallTotalCollected += order.finalTotal;
    });

    const overallCalculatedNetSales = overallGrossRevenue - overallTotalDiscounts;
    const overallCalculatedGrossProfit = overallCalculatedNetSales - overallTotalCOGS;
    const overallCalculatedNetProfit = overallCalculatedGrossProfit - overallTotalTax - overallTotalGratuity;
    const overallTransactions = reconstructedOrders.length;

    // --- Konstruksi Respons Berdasarkan Metrik ---
    let responseDetails: any[] = [];
    let responseSummary: SalesDetailsResponse["summary"] = { explanation: "" };

    if (metric === "sales") {
        responseSummary = {
            explanation: "Total Collected (Uang Diterima) dihitung dari finalTotal setiap pesanan. Jumlah Pesanan adalah total transaksi unik.",
            "Total Collected": `Rp ${overallTotalCollected.toLocaleString('id-ID')}`,
            "Jumlah Pesanan": overallTransactions,
        };
        responseDetails = reconstructedOrders; // Sekarang reconstructedOrders memiliki rincian modifier
    } else if (metric === "transactions") {
        responseSummary = {
            explanation: "Jumlah transaksi dihitung berdasarkan total pesanan unik yang telah diselesaikan.",
            "Jumlah Transaksi": overallTransactions,
        };
        responseDetails = reconstructedOrders.map(order => ({
            id: order.id,
            createdAt: order.createdAt,
            total: order.finalTotal,
            itemCount: order.orderItems.reduce((sum, item) => sum + item.quantity, 0),
            menus: order.orderItems.map(item => {
                let name = item.menu.name;
                if (item.modifiersApplied.length > 0) {
                    name += " (w/ " + item.modifiersApplied.map(m => m.name).join(", ") + ")";
                }
                return name;
            }),
        }));
    } else if (metric === "gross") {
        responseSummary = {
            explanation: "Laba Kotor = (Pendapatan Kotor - Total Diskon) - Total COGS. COGS termasuk HPP menu dan modifier.",
            "Pendapatan Kotor (Gross Revenue)": `Rp ${overallGrossRevenue.toLocaleString('id-ID')}`,
            "Total Diskon": `Rp ${overallTotalDiscounts.toLocaleString('id-ID')}`,
            "Net Sales (Setelah Diskon)": `Rp ${overallCalculatedNetSales.toLocaleString('id-ID')}`,
            "Total COGS (HPP)": `Rp ${overallTotalCOGS.toLocaleString('id-ID')}`,
            "Laba Kotor (Gross Profit)": `Rp ${overallCalculatedGrossProfit.toLocaleString('id-ID')}`,
        };
        const grossProfitDetails: GrossProfitDetailItem[] = [];
        reconstructedOrders.forEach(order => {
            const orderProRataSummary = orderSummariesForProRata.get(order.id)!;
            const trueOrderLevelDiscount = orderProRataSummary.trueOrderLevelDiscount!;
            const baseForProRataOrder = orderProRataSummary.baseForProRataDistribution!;

            order.orderItems.forEach(item => {
                const lineGrossValueFromCoi = item.price * item.quantity;
                const lineSpecificDiscount = item.itemDiscount;
                const lineValueAfterItemSpecificDiscount = lineGrossValueFromCoi - lineSpecificDiscount;
                
                let allocatedOrderLevelDiscount = 0;
                if (trueOrderLevelDiscount > 0 && baseForProRataOrder > 0 && lineValueAfterItemSpecificDiscount > 0) {
                    allocatedOrderLevelDiscount = (lineValueAfterItemSpecificDiscount / baseForProRataOrder) * trueOrderLevelDiscount;
                    allocatedOrderLevelDiscount = Math.min(allocatedOrderLevelDiscount, lineValueAfterItemSpecificDiscount);
                }
                const totalAllocatedDiscountToLine = lineSpecificDiscount + allocatedOrderLevelDiscount;
                const netSalesForLine = lineGrossValueFromCoi - totalAllocatedDiscountToLine;

                let cogsForLine = item.quantity * item.menu.hargaBakul;
                item.modifiersApplied.forEach(mod => {
                    cogsForLine += mod.quantity * mod.unitHpp;
                });
                const grossProfitForLine = netSalesForLine - cogsForLine;
                
                let menuNameWithModifiers = item.menu.name;
                if (item.modifiersApplied.length > 0) {
                    menuNameWithModifiers += " (w/ " + item.modifiersApplied.map(m => m.name).join(", ") + ")";
                }

                grossProfitDetails.push({
                    orderId: order.id,
                    orderDate: order.createdAt,
                    orderItemId: item.id,
                    menuName: menuNameWithModifiers,
                    quantity: item.quantity,
                    lineGrossValue: lineGrossValueFromCoi,
                    totalAllocatedDiscountToLine: totalAllocatedDiscountToLine,
                    netSalesForLine: netSalesForLine,
                    cogsForLine: cogsForLine,
                    grossProfitForLine: grossProfitForLine,
                });
            });
        });
        responseDetails = grossProfitDetails;

    } else if (metric === "net") {
         responseSummary = {
            explanation: "Laba Bersih = Laba Kotor - Pajak - Gratuity. Pajak & Gratuity dialokasikan per item baris.",
            "Laba Kotor (Gross Profit)": `Rp ${overallCalculatedGrossProfit.toLocaleString('id-ID')}`,
            "Total Pajak": `Rp ${overallTotalTax.toLocaleString('id-ID')}`,
            "Total Gratuity": `Rp ${overallTotalGratuity.toLocaleString('id-ID')}`,
            "Laba Bersih (Net Profit)": `Rp ${overallCalculatedNetProfit.toLocaleString('id-ID')}`,
        };
        const netProfitDetails: NetProfitDetailItem[] = [];
        reconstructedOrders.forEach(order => {
            const orderProRataSummary = orderSummariesForProRata.get(order.id)!;
            const trueOrderLevelDiscount = orderProRataSummary.trueOrderLevelDiscount!;
            const baseForProRataOrder = orderProRataSummary.baseForProRataDistribution!;
            
            order.orderItems.forEach(item => {
                const lineGrossValueFromCoi = item.price * item.quantity;
                const lineSpecificDiscount = item.itemDiscount;
                const lineValueAfterItemSpecificDiscount = lineGrossValueFromCoi - lineSpecificDiscount;

                let allocatedOrderLevelDiscount = 0;
                if (trueOrderLevelDiscount > 0 && baseForProRataOrder > 0 && lineValueAfterItemSpecificDiscount > 0) {
                    allocatedOrderLevelDiscount = (lineValueAfterItemSpecificDiscount / baseForProRataOrder) * trueOrderLevelDiscount;
                    allocatedOrderLevelDiscount = Math.min(allocatedOrderLevelDiscount, lineValueAfterItemSpecificDiscount);
                }
                const totalAllocatedDiscountToLine = lineSpecificDiscount + allocatedOrderLevelDiscount;
                const netSalesForLine = lineGrossValueFromCoi - totalAllocatedDiscountToLine;

                let cogsForLine = item.quantity * item.menu.hargaBakul;
                item.modifiersApplied.forEach(mod => {
                    cogsForLine += mod.quantity * mod.unitHpp;
                });
                
                let allocatedTaxToLine = 0;
                let allocatedGratuityToLine = 0;
                if (baseForProRataOrder > 0 && lineValueAfterItemSpecificDiscount > 0) {
                    // Alokasikan pajak & gratuity order berdasarkan nilai bersih item baris relatif thd total nilai bersih order
                    allocatedTaxToLine = (lineValueAfterItemSpecificDiscount / baseForProRataOrder) * order.taxAmount;
                    allocatedGratuityToLine = (lineValueAfterItemSpecificDiscount / baseForProRataOrder) * order.gratuityAmount;
                }
                
                const netProfitForLine = netSalesForLine - cogsForLine - allocatedTaxToLine - allocatedGratuityToLine;
                
                let menuNameWithModifiers = item.menu.name;
                if (item.modifiersApplied.length > 0) {
                    menuNameWithModifiers += " (w/ " + item.modifiersApplied.map(m => m.name).join(", ") + ")";
                }

                netProfitDetails.push({
                    orderId: order.id,
                    orderDate: order.createdAt,
                    orderItemId: item.id,
                    menuName: menuNameWithModifiers,
                    quantity: item.quantity,
                    netSalesForLine: netSalesForLine,
                    cogsForLine: cogsForLine,
                    allocatedTaxToLine: allocatedTaxToLine,
                    allocatedGratuityToLine: allocatedGratuityToLine,
                    netProfitForLine: netProfitForLine,
                });
            });
        });
        responseDetails = netProfitDetails;

    } else if (metric === "discounts" || metric === "tax" || metric === "gratuity") {
        responseSummary = {
            explanation: `Rincian pesanan untuk metrik ${metric}.`,
            [`Total ${metric.charAt(0).toUpperCase() + metric.slice(1)}`]: 
                metric === "discounts" ? `Rp ${overallTotalDiscounts.toLocaleString('id-ID')}` :
                metric === "tax" ? `Rp ${overallTotalTax.toLocaleString('id-ID')}` :
                `Rp ${overallTotalGratuity.toLocaleString('id-ID')}`,
        };
        responseDetails = reconstructedOrders; 
    } else {
        return NextResponse.json({
            message: "Metric tidak dikenali atau tidak disediakan. Menampilkan ringkasan metrik utama.",
            summary: {
                "Total Collected (Uang Diterima)": `Rp ${overallTotalCollected.toLocaleString('id-ID')}`,
                "Jumlah Transaksi": overallTransactions,
                "Pendapatan Kotor (Gross Revenue)": `Rp ${overallGrossRevenue.toLocaleString('id-ID')}`,
                "Total Diskon": `Rp ${overallTotalDiscounts.toLocaleString('id-ID')}`,
                "Net Sales (Setelah Diskon)": `Rp ${overallCalculatedNetSales.toLocaleString('id-ID')}`,
                "Total COGS (HPP)": `Rp ${overallTotalCOGS.toLocaleString('id-ID')}`,
                "Laba Kotor (Gross Profit)": `Rp ${overallCalculatedGrossProfit.toLocaleString('id-ID')}`,
                "Total Pajak": `Rp ${overallTotalTax.toLocaleString('id-ID')}`,
                "Total Gratuity": `Rp ${overallTotalGratuity.toLocaleString('id-ID')}`,
                "Laba Bersih (Net Profit)": `Rp ${overallCalculatedNetProfit.toLocaleString('id-ID')}`,
            },
            details: reconstructedOrders 
        }, { status: 200 });
    }

    return NextResponse.json({ summary: responseSummary, details: responseDetails });

  } catch (error) {
    console.error("Error fetching sales details:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: "Internal Server Error", message }, { status: 500 });
  }
}
