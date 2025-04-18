import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// Helper untuk query database
async function query(sql: string, values?: any[]) {
    const [results] = await db.query(sql, values);
    return results;
}

export async function GET(req: NextRequest) {
    try {
        const orders: any = await query(`
      SELECT o.*, 
        d.name AS discount_name, 
        r.namaCustomer AS reservasi_name 
      FROM \`order\` o
      LEFT JOIN discount d ON o.discountId = d.id
      LEFT JOIN reservasi r ON o.reservasiId = r.id
      ORDER BY o.createdAt DESC
    `);

        for (const order of orders) {
            const orderItems: any = await query(`
        SELECT oi.*, 
          m.name AS menu_name, m.type AS menu_type, m.category AS menu_category,m.price AS menu_price, m.image AS menu_image,
          dmo.modifierId, mo.name AS modifier_name, mo.price AS modifier_price
        FROM orderItem oi
        JOIN menu m ON oi.menuId = m.id
        LEFT JOIN orderItemModifier dmo ON dmo.orderItemId = oi.id
        LEFT JOIN modifier mo ON dmo.modifierId = mo.id
        WHERE oi.orderId = ?
      `, [order.id]);

            // Organize modifiers per item
            const itemsMap: { [id: number]: any } = {};
            for (const item of orderItems) {
                itemsMap[item.id] = {
                    ...item,
                    menu: {
                        id: item.menuId,
                        name: item.menu_name,
                        category: item.menu_category,
                        price: item.menu_price,
                        type: item.menu_type,
                        image: item.menu_image || null, // tambahkan ini jika ada
                    },
                    modifiers: [],
                };



                if (item.modifierId) {
                    itemsMap[item.id].modifiers.push({
                        modifier: {
                            id: item.modifierId,
                            name: item.modifier_name,
                            price: item.modifier_price,
                        }
                    });

                }
                if (item.menu_type.toLowerCase() === "bundle") {
                    const bundleCompositions: any = await query(`
                        SELECT mc.id, mc.bundleId, mc.menuId, mc.amount,
                            m.name AS bundled_menu_name, m.category AS bundled_menu_category
                        FROM menucomposition mc
                        JOIN menu m ON mc.menuId = m.id
                        WHERE mc.bundleId = ?
                    `, [item.menuId]);
                
                    // Menyusun bundleCompositions sesuai dengan struktur yang diberikan
                    itemsMap[item.id].menu.bundleCompositions = bundleCompositions.map((bc: any) => ({
                        id: bc.id,
                        bundleId: bc.bundleId,
                        menuId: bc.menuId,
                        amount: bc.amount,
                        menu: {
                            id: bc.menuId,
                            name: bc.bundled_menu_name,
                            category: bc.bundled_menu_category,
                        },
                    }));
                }
                

            }

            order.orderItems = Object.values(itemsMap);
        }

        return NextResponse.json({
            orders,
            message: orders.length ? "Pesanan berhasil diambil" : "Tidak ada pesanan ditemukan",
        });
    } catch (error: any) {
        console.error("Error fetching orders:", error);
        return NextResponse.json({ message: "Gagal mengambil data pesanan", error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const { orderId, paymentMethod, paymentId, discountId, cashGiven, change } = await req.json();

    if (!orderId || !paymentMethod) {
        return NextResponse.json({ message: "Order ID dan metode pembayaran wajib diisi" }, { status: 400 });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Ambil order dan detail item
        const [order] = await conn.query(
            `SELECT * FROM \`order\` WHERE id = ?`, [orderId]
        ).then((res: any) => res[0]);


        if (!order) {
            await conn.rollback();
            return NextResponse.json({ message: "Pesanan tidak ditemukan" }, { status: 404 });
        }

        const orderItems: any = await query(`
      SELECT oi.*, m.price AS menu_price
      FROM orderItem oi
      JOIN menu m ON oi.menuId = m.id
      WHERE oi.orderId = ?
    `, [orderId]);

        let subtotal = 0;
        let modifierTotal = 0;

        for (const item of orderItems) {
            const itemModifiers: any = await query(`
        SELECT mo.price
        FROM orderItemModifier oim
        JOIN modifier mo ON oim.modifierId = mo.id
        WHERE oim.orderItemId = ?
      `, [item.id]);

            const modifierSum = itemModifiers.reduce((sum: number, mod: any) => sum + Number(mod.price || 0), 0);
            subtotal += (item.price - modifierSum) * item.quantity;
            modifierTotal += modifierSum * item.quantity;
        }

        // Hitung diskon
        let menuDiscountAmount = orderItems.reduce((sum: number, item: any) => sum + Number(item.discountAmount || 0), 0);
        let totalDiscountAmount = Number(order.discountAmount || 0);

        if (discountId && discountId !== order.discountId) {
            const [discount]: any = await query(`SELECT * FROM discount WHERE id = ?`, [discountId]);
            if (discount && discount.isActive && discount.scope === "TOTAL") {
                const afterMenuDiscount = subtotal - menuDiscountAmount;
                const additionalDiscount = discount.type === "PERCENTAGE"
                    ? (discount.value / 100) * afterMenuDiscount
                    : discount.value;
                totalDiscountAmount = menuDiscountAmount + additionalDiscount;
            }
        }

        const base = subtotal + modifierTotal - totalDiscountAmount;
        const taxAmount = base * 0.10;
        const gratuityAmount = base * 0.02;
        const finalTotal = base + taxAmount + gratuityAmount;

        // Update order
        const status = (order.status === "pending" || order.status === "paid") ? "Sedang Diproses" : order.status;
        await conn.query(`
      UPDATE \`order\` SET 
        paymentMethod = ?, 
        paymentId = ?, 
        discountId = ?, 
        discountAmount = ?, 
        taxAmount = ?, 
        gratuityAmount = ?, 
        finalTotal = ?, 
        cashGiven = ?, 
        \`change\` = ?, 
        status = ?
      WHERE id = ?
    `, [
            paymentMethod,
            paymentMethod !== "tunai" ? paymentId : null,
            discountId || order.discountId,
            totalDiscountAmount,
            taxAmount,
            gratuityAmount,
            finalTotal,
            cashGiven ? Number(cashGiven) : null,
            change ? Number(change) : null,
            status,
            orderId,
        ]);

        // Kurangi stok bahan untuk setiap item menu
        for (const item of orderItems) {
            // Ambil bahan dari menu
            const menuIngredients: any = await query(`
              SELECT ingredientId, amount 
              FROM menuingredient 
              WHERE menuId = ?
            `, [item.menuId]);

            for (const ing of menuIngredients) {
                const totalUsage = ing.amount * item.quantity;

                // Update pengurangan bahan
                await conn.query(`
                UPDATE ingredient 
                SET used = used + ?, stock = stock - ?
                WHERE id = ?
              `, [totalUsage, totalUsage, ing.ingredientId]);
            }

            // Ambil modifier dari item ini
            const itemModifiers: any = await query(`
              SELECT modifierId FROM orderItemModifier WHERE orderItemId = ?
            `, [item.id]);

            for (const mod of itemModifiers) {
                // Ambil bahan dari modifier
                const modIngredients: any = await query(`
                SELECT ingredientId, amount 
                FROM modifieringredient 
                WHERE modifierId = ?
              `, [mod.modifierId]);

                for (const ing of modIngredients) {
                    const totalUsage = ing.amount * item.quantity;

                    // Update pengurangan bahan
                    await conn.query(`
                  UPDATE ingredient 
                  SET used = used + ?, stock = stock - ?
                  WHERE id = ?
                `, [totalUsage, totalUsage, ing.ingredientId]);
                }
            }
        }

        await conn.commit();

        // Ambil order yang sudah diperbarui + item
        const updatedOrder: any = await query(`
    SELECT o.*, d.name AS discount_name, r.namaCustomer AS reservasi_name
    FROM \`order\` o
    LEFT JOIN discount d ON o.discountId = d.id
    LEFT JOIN reservasi r ON o.reservasiId = r.id
    WHERE o.id = ?
  `, [orderId]);

        if (updatedOrder.length) {
            const order = updatedOrder[0];

            const orderItems: any = await query(`
      SELECT oi.*, 
        m.name AS menu_name, m.type AS menu_type, m.category AS menu_category, m.price AS menu_price, m.image AS menu_image,
        dmo.modifierId, mo.name AS modifier_name, mo.price AS modifier_price
      FROM orderItem oi
      JOIN menu m ON oi.menuId = m.id
      LEFT JOIN orderItemModifier dmo ON dmo.orderItemId = oi.id
      LEFT JOIN modifier mo ON dmo.modifierId = mo.id
      WHERE oi.orderId = ?
    `, [order.id]);

            const itemsMap: { [id: number]: any } = {};
            for (const item of orderItems) {
                if (!itemsMap[item.id]) {
                    itemsMap[item.id] = {
                        ...item,
                        menu: {
                            id: item.menuId,
                            name: item.menu_name,
                            category: item.menu_category,
                            price: item.menu_price,
                            type: item.menu_type,
                            image: item.menu_image || null,
                        },
                        modifiers: [],
                    };

                }

                if (item.modifierId) {
                    itemsMap[item.id].modifiers.push({
                        modifier: {
                            id: item.modifierId,
                            name: item.modifier_name,
                            price: item.modifier_price,
                        }
                    });
                }

                if (item.menu_type.toLowerCase() === "bundle") {
                    const bundleCompositions: any = await query(`
                        SELECT mc.id, mc.bundleId, mc.menuId, mc.amount,
                            m.name AS bundled_menu_name, m.category AS bundled_menu_category
                        FROM menucomposition mc
                        JOIN menu m ON mc.menuId = m.id
                        WHERE mc.bundleId = ?
                    `, [item.menuId]);
                
                    // Menyusun bundleCompositions sesuai dengan struktur yang diberikan
                    itemsMap[item.id].menu.bundleCompositions = bundleCompositions.map((bc: any) => ({
                        id: bc.id,
                        bundleId: bc.bundleId,
                        menuId: bc.menuId,
                        amount: bc.amount,
                        menu: {
                            id: bc.menuId,
                            name: bc.bundled_menu_name,
                            category: bc.bundled_menu_category,
                        },
                    }));
                }
                

            }

            order.orderItems = Object.values(itemsMap);

            return NextResponse.json({
                success: true,
                message: "Pembayaran dikonfirmasi",
                updatedOrder: order,
            });
        }

        return NextResponse.json({ message: "Gagal mendapatkan order selesai" }, { status: 500 });


    } catch (error: any) {
        await conn.rollback();
        console.error("Error during PUT:", error);
        return NextResponse.json({ message: "Gagal memproses pembayaran", error: error.message }, { status: 500 });
    } finally {
        conn.release();
    }
}
