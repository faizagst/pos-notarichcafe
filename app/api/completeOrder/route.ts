import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { orderId } = body;

        if (!orderId) {
            return NextResponse.json({ message: "Order ID wajib diisi" }, { status: 400 });
        }

        // 1. Ambil data order lengkap
        const [orderRows] = await db.execute(
            `SELECT * FROM \`order\` WHERE id = ?`,
            [orderId]
        );

        const order = (orderRows as any[])[0];
        if (!order) {
            return NextResponse.json({ message: "Order tidak ditemukan" }, { status: 404 });
        }

        if (order.status === "Selesai") {
            return NextResponse.json({ message: "Pesanan sudah selesai" }, { status: 400 });
        }

        // 2. Ambil item pesanan dan modifier
        const [orderItems] = await db.execute(
            `SELECT * FROM orderItem WHERE orderId = ?`,
            [orderId]
        );

        const orderItemIds = (orderItems as any[]).map((item) => item.id);
        const placeholders = orderItemIds.map(() => '?').join(', ');

        const [itemModifiers] = orderItemIds.length > 0
            ? await db.execute(
                `SELECT * FROM orderItemModifier WHERE orderItemId IN (${placeholders})`,
                orderItemIds
            )
            : [[]]; // fallback kalau kosong

        // 3. Hitung maxBeli berdasarkan bahan
        const menuMaxBeli = new Map<number, number>();
        const menuIds = (orderItems as any[]).map((item) => item.menuId);

        if (menuIds.length === 0) {
            return NextResponse.json({ message: "Tidak ada menu dalam order ini." }, { status: 400 });
        }

        const menuPlaceholders = menuIds.map(() => '?').join(', ');
        const [menuIngredients] = await db.execute(
            `
            SELECT m.id as menuId, mi.amount, i.stock
            FROM menu m
            JOIN menuIngredient mi ON m.id = mi.menuId
            JOIN ingredient i ON mi.ingredientId = i.id
            WHERE m.id IN (${menuPlaceholders})
            `,
            menuIds
        );

        for (const menuId of menuIds) {
            const ingredients = (menuIngredients as any[]).filter((row) => row.menuId === menuId);
            let maxPurchase = Infinity;
            for (const ing of ingredients) {
                if (ing.amount <= 0) {
                    maxPurchase = 0;
                    break;
                }
                const possible = Math.floor(ing.stock / ing.amount);
                maxPurchase = Math.min(maxPurchase, possible);
            }
            if (maxPurchase === Infinity) maxPurchase = 0;
            menuMaxBeli.set(menuId, maxPurchase);

            const updateFields = [`maxBeli = ?`];
            const values = [maxPurchase];
            if (maxPurchase === 0) {
                updateFields.push(`status = 'Habis'`);
            }
            values.push(menuId);
            await db.execute(`UPDATE menu SET ${updateFields.join(", ")} WHERE id = ?`, values);
        }

        // 5. Simpan ke completedOrder
        const [result] = await db.execute(
            `
            INSERT INTO completedOrder (
                originalOrderId, tableNumber, total, discountId, discountAmount,
                taxAmount, gratuityAmount, finalTotal, paymentMethod, paymentId, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                order.id,
                order.tableNumber,
                order.total,
                order.discountId,
                order.discountAmount,
                order.taxAmount,
                order.gratuityAmount,
                order.finalTotal,
                order.paymentMethod,
                order.paymentId,
                new Date(),
            ]
        );

        const completedOrderId = (result as any).insertId;

        for (const item of orderItems as any[]) {
            const [insertItem] = await db.execute(
                `
                INSERT INTO completedOrderItem 
                (orderId, menuId, quantity, note, price, discountAmount) 
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    completedOrderId,
                    item.menuId,
                    item.quantity,
                    item.note || null,
                    item.price,
                    item.discountAmount,
                ]
            );

            const completedItemId = (insertItem as any).insertId;

            const mods = (itemModifiers as any[]).filter((m) => m.orderItemId === item.id);
            for (const mod of mods) {
                await db.execute(
                    `INSERT INTO completedOrderItemModifier (completedOrderItemId, modifierId) VALUES (?, ?)`,
                    [completedItemId, mod.modifierId]
                );
            }
        }

        // 6. Update status order menjadi "Selesai"
        await db.execute(
            `UPDATE \`order\` SET status = 'Selesai' WHERE id = ?`,
            [orderId]
        );

        return NextResponse.json({
            message: "Pesanan selesai dan tercatat di riwayat.",
            maxBeliPerMenu: Array.from(menuMaxBeli.entries()).map(([menuId, maxBeli]) => ({
                menuId,
                maxBeli,
            })),
        });
    } catch (error) {
        console.error("Error menyelesaikan pesanan:", error);
        return NextResponse.json(
            { message: "Gagal menyelesaikan pesanan.", error: (error as Error).message },
            { status: 500 }
        );
    }
}
