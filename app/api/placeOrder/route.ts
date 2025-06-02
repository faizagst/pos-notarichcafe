import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

interface OrderItem {
  menuId: number;
  quantity: number;
  note?: string;
  modifierIds?: number[];
}

interface ReservationData {
  namaCustomer: string;
  nomorKontak: string;
  selectedDateTime: string;
  durasiJam: number;
  durasiMenit: number;
  meja?: string;
  kodeBooking: string;
}

interface OrderDetails {
  tableNumber: string;
  items: OrderItem[];
  total: number;
  customerName: string;
  paymentMethod?: string;
  discountId?: number;
  bookingCode?: string;
  reservationData?: ReservationData;
}

// Helpers
const round2 = (num: number) => Math.round(num * 100) / 100;
const roundWhole = (num: number) => Math.round(num);
const ceilToHundreds = (num: number) => Math.ceil(num / 100) * 100;

export async function POST(req: NextRequest) {
  const conn = await db.getConnection();

  try {
    const orderDetails: OrderDetails = await req.json();
    if (!orderDetails.tableNumber || !orderDetails.items.length) {
      return NextResponse.json({ message: "Invalid order data" }, { status: 400 });
    }

    await conn.beginTransaction();

    const menuIds = orderDetails.items.map((i) => i.menuId);
    const [menus] = await conn.query(`SELECT * FROM menu WHERE id IN (${menuIds.map(() => "?").join(",")})`, menuIds);

    const modifiersMap: Record<number, any[]> = {};

    for (const menuId of menuIds) {
      const [modifiers]: any = await conn.query(
        `SELECT mo.id, mo.menuId, mo.modifierId, md.price 
         FROM menuModifier mo 
         JOIN modifier md ON mo.modifierId = md.id 
         WHERE mo.menuId = ?`,
        [menuId]
      );
      modifiersMap[menuId] = modifiers;
    }

    const [taxRows]: any = await conn.query(`SELECT * FROM tax WHERE isActive = true LIMIT 1`);
    const [gratuityRows]: any = await conn.query(`SELECT * FROM gratuity WHERE isActive = true LIMIT 1`);

    const tax = taxRows[0];
    const gratuity = gratuityRows[0];

    const orderItemsData = await Promise.all(
      orderDetails.items.map(async (item) => {
        const menu = (menus as any[]).find((m) => m.id === item.menuId);
        if (!menu) throw new Error(`Menu with ID ${item.menuId} not found`);

        let price = menu.price;
        let modifierCost = 0;

        const availableModifiers = modifiersMap[item.menuId] || [];

        if (item.modifierIds?.length) {
          const selectedMods = availableModifiers.filter((mod: any) =>
            item.modifierIds!.includes(mod.modifierId)
          );
          modifierCost = selectedMods.reduce((acc, mod) => acc + (mod.price || 0), 0);
        }

        price += modifierCost;

        // Cari diskon aktif dari menu
        let discountAmount = 0;
        const [menuDiscounts]: any = await conn.query(`
          SELECT d.* FROM discount d
          JOIN menuDiscount md ON md.discountId = d.id
          WHERE md.menuId = ? AND d.isActive = true AND d.scope = 'MENU' LIMIT 1
        `, [item.menuId]);

        if (menuDiscounts.length > 0) {
          const discount = menuDiscounts[0];
          discountAmount = discount.type === "PERCENTAGE"
            ? (discount.value / 100) * menu.price * item.quantity
            : discount.value * item.quantity;
        }

        return {
          ...item,
          price: round2(price),
          discountAmount: round2(discountAmount),
          modifiers: item.modifierIds || [],
          note: item.note || "",
        };
      })
    );

    const subtotal = round2(orderItemsData.reduce((sum, i) => sum + i.price * i.quantity, 0));
    const totalMenuDiscountAmount = round2(orderItemsData.reduce((sum, i) => sum + i.discountAmount, 0));
    const subtotalAfterMenuDiscount = round2(subtotal - totalMenuDiscountAmount);

    // Discount tambahan (diskon total)
    let totalDiscountAmount = totalMenuDiscountAmount;
    let orderDiscountId = orderDetails.discountId;

    if (orderDetails.discountId) {
      const [discountRows]: any = await conn.query(`SELECT * FROM discount WHERE id = ?`, [orderDetails.discountId]);
      const discount = discountRows[0];
      if (discount?.isActive && discount.scope === "TOTAL") {
        const additionalDiscount = discount.type === "PERCENTAGE"
          ? (discount.value / 100) * subtotalAfterMenuDiscount
          : discount.value;
        totalDiscountAmount += additionalDiscount;
      } else {
        orderDiscountId = 0;
      }
    }

    totalDiscountAmount = round2(Math.min(totalDiscountAmount, subtotalAfterMenuDiscount));

    const subtotalAfterAllDiscounts = round2(subtotalAfterMenuDiscount - (totalDiscountAmount - totalMenuDiscountAmount));

    const taxAmount = tax ? roundWhole(subtotalAfterAllDiscounts * (tax.value / 100)) : 0;
    const gratuityAmount = gratuity ? roundWhole(subtotalAfterAllDiscounts * (gratuity.value / 100)) : 0;

    const rawTotal = subtotalAfterAllDiscounts + taxAmount + gratuityAmount;
    const finalTotal = ceilToHundreds(rawTotal);
    const roundingAmount = round2(finalTotal - rawTotal);

    // Debug
    console.log("==== FINAL DEBUG ====");
    console.log({
      subtotal,
      totalMenuDiscountAmount,
      totalDiscountAmount,
      subtotalAfterAllDiscounts,
      taxAmount,
      gratuityAmount,
      finalTotal,
      roundingAmount
    });
    console.log("======================");

    let reservasiId: number | null = null;
    if (orderDetails.bookingCode && orderDetails.reservationData) {
      const [existingRes]: any = await conn.query(
        `SELECT * FROM reservasi WHERE kodeBooking = ?`,
        [orderDetails.bookingCode]
      );
      if (existingRes.length > 0) {
        await conn.query(
          `UPDATE reservasi SET status = 'RESERVED' WHERE kodeBooking = ?`,
          [orderDetails.bookingCode]
        );
        reservasiId = existingRes[0].id;
      } else {
        const result = await conn.query(
          `INSERT INTO reservasi (namaCustomer, nomorKontak, tanggalReservasi, durasiPemesanan, nomorMeja, kodeBooking, status)
           VALUES (?, ?, ?, ?, ?, ?, 'RESERVED')`,
          [
            orderDetails.reservationData.namaCustomer,
            orderDetails.reservationData.nomorKontak,
            new Date(orderDetails.reservationData.selectedDateTime),
            orderDetails.reservationData.durasiJam * 60 + orderDetails.reservationData.durasiMenit,
            orderDetails.tableNumber,
            orderDetails.bookingCode,
          ]
        );
        reservasiId = (result as any).insertId;
      }
    }

    const [orderInsert] = await conn.query(
      `INSERT INTO \`order\`
      (customerName, tableNumber, total, discountId, discountAmount, taxAmount, gratuityAmount, finalTotal, roundingAmount, status, paymentMethod, paymentStatus, reservasiId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderDetails.customerName,
        orderDetails.tableNumber,
        subtotal,
        orderDiscountId,
        totalDiscountAmount,
        taxAmount,
        gratuityAmount,
        finalTotal,
        roundingAmount,
        "pending",
        orderDetails.paymentMethod || null,
        orderDetails.paymentMethod === "ewallet" ? "paid" : "pending",
        reservasiId,
      ]
    );

    const orderId = (orderInsert as any).insertId;

    for (const item of orderItemsData) {
      const [orderItemInsert] = await conn.query(
        `INSERT INTO orderItem (orderId, menuId, quantity, note, price, discountAmount) VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.menuId, item.quantity, item.note, item.price, item.discountAmount]
      );
      const orderItemId = (orderItemInsert as any).insertId;

      for (const modifierId of item.modifiers) {
        await conn.query(
          `INSERT INTO orderItemModifier (orderItemId, modifierId) VALUES (?, ?)`,
          [orderItemId, modifierId]
        );
      }
    }

    await conn.commit();
    conn.release();

    return NextResponse.json({
      success: true,
      message: "Order placed successfully",
      order: {
        id: orderId,
        subtotal,
        totalDiscountAmount,
        taxAmount,
        gratuityAmount,
        roundingAmount,
        finalTotal,
        discountId: orderDiscountId,
        status: "pending",
        paymentStatus: orderDetails.paymentMethod === "ewallet" ? "paid" : "pending",
      },
    });
  } catch (err: any) {
    await conn.rollback?.();
    conn.release?.();
    console.error("Order placement error:", err);
    return NextResponse.json({ message: "Failed to place order", error: err.message }, { status: 500 });
  }
}
