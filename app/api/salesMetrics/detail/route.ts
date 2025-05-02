import { NextRequest, NextResponse } from "next/server";
import db  from "@/lib/db";

type OrderItem = {
  id: number;
  quantity: number;
  price: number;
  itemDiscount: number;
  menu: {
    id: number;
    name: string;
    price: number;
    hargaBakul: number;
  };
};

type Order = {
  id: number;
  createdAt: string;
  total: number;
  discountAmount: number;
  taxAmount: number;
  gratuityAmount: number;
  finalTotal: number;
  orderItems: OrderItem[];
};

type TransactionDetail = {
  id: number;
  createdAt: string;
  total: number;
  itemCount: number;
  menus: string[];
};

type GrossDetail = {
  orderId: number;
  orderDate: string;
  menuName: string;
  itemId: number;
  sellingPrice: number;
  discount: number;
  quantity: number;
  itemTotalSelling: number;
  hpp: number;
  itemTotalHPP: number;
};

type NetDetail = {
  orderId: number;
  orderDate: string;
  menuName: string;
  itemId: number;
  sellingPrice: number;
  discount: number;
  hpp: number;
  tax: number;
  gratuity: number;
  quantity: number;
  itemNetProfit: number;
};

type SalesDetailsResponse = {
  summary?: { explanation: string; [key: string]: string | number };
  details: Order[] | TransactionDetail[] | GrossDetail[] | NetDetail[];
  message?: string;
};

function getStartAndEndDates(period: string, dateString: string): {
  startDate: Date;
  endDate: Date;
} {
  const date = new Date(dateString);
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case "daily":
    case "daily-prev":
      startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      break;
    case "weekly":
    case "weekly-prev":
      const day = date.getDay();
      const diff = date.getDate() - (day === 0 ? 6 : day - 1);
      startDate = new Date(date.getFullYear(), date.getMonth(), diff);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
    case "monthly":
    case "monthly-prev":
      startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      break;
    case "yearly":
    case "yearly-prev":
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
    const metric = searchParams.get("metric");
    const period = searchParams.get("period") || "daily";
    const date = searchParams.get("date") || new Date().toISOString();

    const { startDate, endDate } = getStartAndEndDates(period, date);

    // Ambil orders dan orderItems sekaligus
    const [ordersRaw] = await db.query(
      `
      SELECT o.*, oi.id AS itemId, oi.quantity, oi.price AS itemPrice, oi.discountAmount AS itemDiscount,
             m.id AS menuId, m.name AS menuName, m.price AS menuPrice, m.hargaBakul
      FROM completedOrder o
      JOIN completedOrderItem oi ON o.id = oi.orderId
      JOIN menu m ON oi.menuId = m.id
      WHERE o.createdAt >= ? AND o.createdAt < ?
      ORDER BY o.createdAt DESC
    `,
      [startDate, endDate]
    );

    const ordersMap = new Map<number, Order>();

    for (const row of ordersRaw as any[]) {
      const orderId = row.id;
      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          id: row.id,
          createdAt: row.createdAt,
          total: row.total,
          discountAmount: row.discountAmount,
          taxAmount: row.taxAmount,
          gratuityAmount: row.gratuityAmount,
          finalTotal: row.finalTotal,
          orderItems: [],
        });
      }

      ordersMap.get(orderId)!.orderItems.push({
        id: row.itemId,
        quantity: row.quantity,
        price: row.itemPrice,
        itemDiscount: row.itemDiscount,
        menu: {
          id: row.menuId,
          name: row.menuName,
          price: row.menuPrice,
          hargaBakul: row.hargaBakul,
        },
      });
    }

    const orders = Array.from(ordersMap.values());

    if (metric === "sales") {
      const totalSales = orders.reduce((acc, order) => acc + Number(order.finalTotal), 0);
      return NextResponse.json({
        summary: {
          explanation:
            "Total collected dihitung dengan menjumlahkan nilai total dari setiap order yang berhasil diselesaikan, termasuk efek diskon, pajak, dan gratuity.",
          "Total Collected": `Rp ${Number(totalSales).toLocaleString()}`,
          "Jumlah Pesanan": orders.length,
        },
        details: orders,
      });
    }

    if (metric === "transactions") {
      const details: TransactionDetail[] = orders.map((order) => ({
        id: order.id,
        createdAt: order.createdAt,
        total: order.finalTotal,
        itemCount: order.orderItems.reduce((acc, item) => acc + item.quantity, 0),
        menus: order.orderItems.map((item) => item.menu.name),
      }));
      return NextResponse.json({
        summary: {
          explanation:
            "Jumlah transaksi dihitung berdasarkan total order yang telah diselesaikan dalam periode ini.",
          "Jumlah Transaksi": orders.length,
        },
        details,
      });
    }

    if (metric === "gross") {
      let totalNetSales = 0;
      let totalHPP = 0;
      const details: GrossDetail[] = [];
    
      for (const order of orders) {
        const totalQuantity = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
        const fallbackDiscountPerUnit = totalQuantity ? order.discountAmount / totalQuantity : 0;
        const isItemDiscountEmpty = order.orderItems.every((item) => item.itemDiscount === 0);
    
        for (const item of order.orderItems) {
          const sellingPrice = item.menu.price;
          const hpp = item.menu.hargaBakul;
          const quantity = item.quantity;
    
          const itemDiscount = isItemDiscountEmpty ? fallbackDiscountPerUnit : item.itemDiscount;
    
          const netSellingPrice = sellingPrice - itemDiscount;
          const itemTotalNetSales = netSellingPrice * quantity;
          const itemTotalHPP = hpp * quantity;
    
          totalNetSales += itemTotalNetSales;
          totalHPP += itemTotalHPP;
    
          details.push({
            orderId: order.id,
            orderDate: order.createdAt,
            menuName: item.menu.name,
            itemId: item.id,
            sellingPrice: sellingPrice,
            discount: itemDiscount,
            quantity,
            itemTotalSelling: itemTotalNetSales,
            hpp,
            itemTotalHPP,
          });
        }
      }
    
      return NextResponse.json({
        summary: {
          explanation: "Laba Kotor = Net Sales - HPP, di mana Net Sales = Harga Jual - Diskon.",
          "Total Net sales": `Rp ${Number(totalNetSales).toLocaleString()}`,
          "Total HPP": `Rp ${Number(totalHPP).toLocaleString()}`,
          "Laba Kotor": `Rp ${Number(totalNetSales - totalHPP).toLocaleString()}`,
        },
        details,
      });
    }
    

    if (metric === "net") {
        let totalSelling = 0;
        let totalHPP = 0;
        let totalDiscounts = 0;
        let totalTax = 0;
        let totalGratuity = 0;
        const details: NetDetail[] = [];
      
        for (const order of orders) {
          const totalQuantity = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
      
          const fallbackDiscountPerUnit = totalQuantity ? order.discountAmount / totalQuantity : 0;
          const taxPerUnit = totalQuantity ? order.taxAmount / totalQuantity : 0;
          const gratuityPerUnit = totalQuantity ? order.gratuityAmount / totalQuantity : 0;
      
          const isItemDiscountEmpty = order.orderItems.every((item) => item.itemDiscount === 0);
      
          for (const item of order.orderItems) {
            const sellingPrice = item.menu.price;
            const hpp = item.menu.hargaBakul;
            const quantity = item.quantity;
      
            const itemDiscount = isItemDiscountEmpty
              ? fallbackDiscountPerUnit
              : item.itemDiscount;
      
            const itemTax = taxPerUnit;
            const itemGratuity = gratuityPerUnit;
      
            const itemTotalSelling = sellingPrice * quantity;
            const itemTotalHPP = hpp * quantity;
            const itemTotalDiscount = itemDiscount * quantity;
            const itemTotalTax = itemTax * quantity;
            const itemTotalGratuity = itemGratuity * quantity;
      
            const itemNetProfit =
              (sellingPrice - hpp - itemDiscount - itemTax - itemGratuity) * quantity;
      
            totalSelling += itemTotalSelling;
            totalHPP += itemTotalHPP;
            totalDiscounts += itemTotalDiscount;
            totalTax += itemTotalTax;
            totalGratuity += itemTotalGratuity;
      
            details.push({
              orderId: order.id,
              orderDate: order.createdAt,
              menuName: item.menu.name,
              itemId: item.id,
              sellingPrice,
              discount: itemDiscount,
              hpp,
              tax: itemTax,
              gratuity: itemGratuity,
              quantity,
              itemNetProfit,
              
            });
          }
        }
        return NextResponse.json({
          summary: {
            explanation:
              "Laba Bersih = Net Sales - HPP - Pajak - Gratuity, di mana Net Sales = Harga Jual - Diskon.",
            "Total Net Sales": `Rp ${Number(totalSelling - totalDiscounts).toLocaleString()}`,
            "Total HPP": `Rp ${Number(totalHPP).toLocaleString()}`,
            "Total Diskon": `Rp ${Number(totalDiscounts).toLocaleString()}`,
            "Total Pajak": `Rp ${Number(totalTax).toLocaleString()}`,
            "Total Gratuity": `Rp ${Number(totalGratuity).toLocaleString()}`,
            "Laba Bersih":
              `Rp ${Number(totalSelling - totalDiscounts - totalHPP - totalTax - totalGratuity).toLocaleString()}`,
            Formula: "Laba Bersih = (Harga Jual - Diskon - HPP - Pajak - Gratuity) * jumlah item",
          },
          details,
        });
      }
      
      
      

    if (metric === "discounts") {
      const totalDiscounts = orders.reduce((acc, order) => acc + Number(order.discountAmount || 0), 0);
      return NextResponse.json({
        summary: {
          explanation: "Total diskon dari semua order.",
          "Total Diskon": `Rp ${Number(totalDiscounts).toLocaleString()}`,
        },
        details: orders,
      });
    }

    if (metric === "tax") {
      const totalTax = orders.reduce((acc, order) => acc + Number(order.taxAmount || 0), 0);
      return NextResponse.json({
        summary: {
          explanation: "Total pajak dari semua order.",
          "Total Pajak": `Rp ${Number(totalTax).toLocaleString()}`,
        },
        details: orders,
      });
    }

    if (metric === "gratuity") {
      const totalGratuity = orders.reduce((acc, order) => acc + Number(order.gratuityAmount || 0), 0);
      return NextResponse.json({
        summary: {
          explanation: "Total gratuity dari semua order.",
          "Total Gratuity": `Rp ${Number(totalGratuity).toLocaleString()}`,
        },
        details: orders,
      });
    }

    return NextResponse.json({
      message: "Metric tidak dikenali. Menampilkan data order secara default.",
      details: orders,
    });
  } catch (error) {
    console.error("Error fetching sales details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
