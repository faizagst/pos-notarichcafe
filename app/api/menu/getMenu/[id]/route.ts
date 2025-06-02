
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const menuId = Number(params.id);
    if (isNaN(menuId)) {
        return NextResponse.json({ message: "ID tidak valid" }, { status: 400 });
    }

    try {
        const [rows]: any = await db.query(
            `
      SELECT 
        m.*, 
        mi.id as menuIngredientId,
        i.*
      FROM menu m
      LEFT JOIN menuIngredient mi ON mi.menuId = m.id
      LEFT JOIN ingredient i ON mi.ingredientId = i.id
      WHERE m.id = ?
    `,
            [menuId]
        );

        if (!Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ message: "Menu tidak ditemukan" }, { status: 404 });
        }

        // Rekonstruksi struktur menu dan ingredients
        const menu = {
            id: rows[0].id,
            Name: rows[0].Name,
            Price: rows[0].Price,
            Status: rows[0].Status,
            // ... field lainnya jika ada
            ingredients: rows[0].menuIngredientId
                ? rows.map((row: any) => ({
                    id: row.menuIngredientId,
                    ingredient: {
                        id: row.ingredientId,
                        Name: row.Name_1,
                        Unit: row.Unit,
                        // tambahkan field lainnya jika ada
                    },
                }))
                : [],
        };

        return NextResponse.json(menu, { status: 200 });
    } catch (error) {
        console.error("Error fetching menu:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const menuId = Number(params.id);
    if (isNaN(menuId)) {
        return NextResponse.json({ message: "ID tidak valid" }, { status: 400 });
    }

    try {
        await db.beginTransaction();

        await db.query(`DELETE FROM menuIngredient WHERE menuId = ?`, [menuId]);
        await db.query(`DELETE FROM menuModifier WHERE menuId = ?`, [menuId]);
        await db.query(`DELETE FROM menuDiscount WHERE menuId = ?`, [menuId]);
        await db.query(`DELETE FROM menuComposition WHERE menuId = ?`, [menuId]);

        const [result] = await db.query(`DELETE FROM menu WHERE id = ?`, [menuId]);

        await db.commit();

        if ((result as any).affectedRows === 0) {
            return NextResponse.json({ message: "Menu tidak ditemukan" }, { status: 404 });
        }

        return NextResponse.json({
            message: "Menu dan data terkait berhasil dihapus",
        });
    } catch (error) {
        await db.rollback();
        console.error("Error deleting menu:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const menuId = Number(id);

    if (isNaN(menuId)) {
        return NextResponse.json({ message: "ID tidak valid" }, { status: 400 });
    }

    try {
        const body = await req.json();
        const { Status, isActive } = body;

        // Validasi: Status harus "Tersedia" atau "Habis" (jika dikirim)
        if (Status && !["Tersedia", "Habis"].includes(Status)) {
            return NextResponse.json(
                { message: 'Status harus "Tersedia" atau "Habis"' },
                { status: 400 }
            );
        }

        // Validasi: isActive harus boolean (jika dikirim)
        if (isActive !== undefined && typeof isActive !== "boolean") {
            return NextResponse.json(
                { message: "isActive harus berupa boolean" },
                { status: 400 }
            );
        }

        // Siapkan field dan value untuk query update dinamis
        const fields = [];
        const values = [];

        if (Status) {
            fields.push("Status = ?");
            values.push(Status);
        }

        if (isActive !== undefined) {
            fields.push("isActive = ?");
            values.push(isActive);
        }

        if (fields.length === 0) {
            return NextResponse.json(
                { message: "Tidak ada data yang diubah" },
                { status: 400 }
            );
        }

        values.push(menuId);

        const [result] = await db.query(
            `UPDATE menu SET ${fields.join(", ")} WHERE id = ?`,
            values
        );

        if ((result as any).affectedRows === 0) {
            return NextResponse.json({ message: "Menu tidak ditemukan" }, { status: 404 });
        }

        return NextResponse.json({
            message: "Menu berhasil diperbarui",
            menu: { id: menuId, Status, isActive },
        });
    } catch (error) {
        console.error("Error updating menu:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

