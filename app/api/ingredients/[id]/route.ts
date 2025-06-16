import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const ingredientId = Number(id);
    if (!ingredientId) {
        return NextResponse.json({ message: 'Invalid ingredient id' }, { status: 400 });
    }

    const {
        name,
        start,
        stockIn,
        used,
        wasted,
        stockMin,
        unit,
        isActive,
        price,
        categoryId,
        type,
    } = await req.json();

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const [ingredientRows] = await connection.query('SELECT * FROM ingredient WHERE id = ?', [ingredientId]);
        const ingredient: any = Array.isArray(ingredientRows) ? ingredientRows[0] : null;
        if (!ingredient) {
            await connection.rollback();
            connection.release();
            return NextResponse.json({ message: 'Ingredient not found' }, { status: 404 });
        }

        const newStart = start !== undefined ? Number(start) : ingredient.start;
        const newStockIn = stockIn !== undefined ? Number(stockIn) : ingredient.stockIn;
        const newUsed = used !== undefined ? Number(used) : ingredient.used;
        const newWasted = wasted !== undefined ? Number(wasted) : ingredient.wasted;
        const newStock = newStart + newStockIn - newUsed - newWasted;
        const newPrice = price !== undefined ? Number(price) : ingredient.price;

        if (name) {
            const [existingRows]: any = await connection.query(
                'SELECT id FROM ingredient WHERE name = ? AND id != ?',
                [name, ingredientId]
            );
            if (existingRows.length > 0) {
                await connection.rollback();
                connection.release();
                return NextResponse.json({ message: 'Ingredient name already exists' }, { status: 409 });
            }
        }

        // Periksa gudang jika stockIn berubah
        let updatedGudang = null;
        if (stockIn !== undefined) {
            const [gudangRows] = await connection.query('SELECT * FROM gudang WHERE ingredientId = ?', [ingredientId]);
            const gudang: any = Array.isArray(gudangRows) ? gudangRows[0] : null;

            if (gudang) {
                const increment = newStockIn - ingredient.stockIn;
                if (increment > 0 && increment > gudang.stock) {
                    await connection.rollback();
                    connection.release();
                    return NextResponse.json({
                        message: `Stok gudang untuk ${ingredient.name} tidak mencukupi. Ingin menambahkan ${increment}, tapi hanya tersedia ${gudang.stock}`,
                    }, { status: 400 });
                }

                const newGudangUsed = gudang.used + increment;
                const newGudangStock = gudang.start + gudang.stockIn - newGudangUsed - gudang.wasted;

                if (newGudangStock < 0) {
                    await connection.rollback();
                    connection.release();
                    return NextResponse.json({
                        message: `Stock untuk ingredient gudang ${ingredient.name} akan negatif`,
                    }, { status: 400 });
                }

                await connection.query(
                    'UPDATE gudang SET used = ?, stock = ? WHERE ingredientId = ?',
                    [newGudangUsed, newGudangStock, ingredientId]
                );
                updatedGudang = { ...gudang, used: newGudangUsed, stock: newGudangStock };
            }
        }

        await connection.query(`
            UPDATE ingredient SET
                name = ?, start = ?, stockIn = ?, used = ?, wasted = ?, stock = ?,
                stockMin = ?, unit = ?, isActive = ?, price = ?, categoryId = ?, type = ?,
                finishedUnit = '-' WHERE id = ?
        `, [
            name, newStart, newStockIn, newUsed, newWasted, newStock,
            stockMin, unit, isActive, newPrice, categoryId, type, ingredientId
        ]);

        const [updatedRows] = await connection.query('SELECT * FROM ingredient WHERE id = ?', [ingredientId]);
        const updatedIngredient: any = Array.isArray(updatedRows) ? updatedRows[0] : null;

        // Hitung ulang harga jika SEMI_FINISHED
        if (updatedIngredient.type === 'SEMI_FINISHED') {
            const [compositions] = await connection.query('SELECT * FROM ingredientComposition WHERE semiIngredientId = ?', [ingredientId]);
            let calculatedPrice = 0;
            for (const comp of compositions as any[]) {
                const [raw] = await connection.query('SELECT * FROM ingredient WHERE id = ?', [comp.rawIngredientId]);
                const rawIngredient: any = Array.isArray(raw) ? raw[0] : null;
                if (rawIngredient) calculatedPrice += rawIngredient.price * comp.amount;
            }
            if (calculatedPrice !== updatedIngredient.price) {
                await connection.query('UPDATE ingredient SET price = ? WHERE id = ?', [calculatedPrice, ingredientId]);
                updatedIngredient.price = calculatedPrice;
            }
        } else {
            const [affectedComps] = await connection.query(
                'SELECT DISTINCT semiIngredientId FROM ingredientComposition WHERE rawIngredientId = ?',
                [ingredientId]
            );
            for (const comp of affectedComps as any[]) {
                const [comps] = await connection.query('SELECT * FROM ingredientComposition WHERE semiIngredientId = ?', [comp.semiIngredientId]);
                let calcPrice = 0;
                for (const c of comps as any[]) {
                    const [raw] = await connection.query('SELECT * FROM ingredient WHERE id = ?', [c.rawIngredientId]);
                    const rawIngredient: any = Array.isArray(raw) ? raw[0] : null;
                    if (rawIngredient) calcPrice += rawIngredient.price * c.amount;
                }
                await connection.query('UPDATE ingredient SET price = ? WHERE id = ?', [calcPrice, comp.semiIngredientId]);
            }
        }

        let notificationMessage = '';
        if (newStock <= updatedIngredient.stockMin && newStock !== 0) {
            notificationMessage = `Manager harus melakukan stock in, stock ${ingredient.name} di cafe sudah mencapai batas minimal`;
        } else if (newStock === 0) {
            await connection.query(`
                UPDATE menu SET Status = 'Habis' 
                WHERE id IN (
                    SELECT menuId FROM menuIngredient WHERE ingredientId = ?
                )
            `, [ingredientId]);
        } else {
            await connection.query(`
                UPDATE menu SET Status = 'Tersedia' 
                WHERE id IN (
                    SELECT menuId FROM menuIngredient WHERE ingredientId = ? AND Status = 'Habis'
                )
            `, [ingredientId]);
        }

        const [menus] = await connection.query(`
            SELECT m.id FROM menu m
            JOIN menuIngredient mi ON mi.menuId = m.id
            WHERE mi.ingredientId = ?
        `, [ingredientId]);

        for (const menu of menus as any[]) {
            const [ingredients] = await connection.query(`
                SELECT mi.amount, i.stock FROM menuIngredient mi
                JOIN ingredient i ON mi.ingredientId = i.id
                WHERE mi.menuId = ?
            `, [menu.id]);
            let newMaxBeli = Infinity;
            for (const mi of ingredients as any[]) {
                if (mi.amount > 0) {
                    const possible = Math.floor(mi.stock / mi.amount);
                    newMaxBeli = Math.min(newMaxBeli, possible);
                }
            }
            await connection.query('UPDATE menu SET maxBeli = ? WHERE id = ?', [isFinite(newMaxBeli) ? newMaxBeli : 0, menu.id]);
        }

        await connection.commit();
        connection.release();

        return NextResponse.json({
            message: 'Ingredient berhasil diupdate',
            ingredient: updatedIngredient,
            notificationMessage,
            gudang: updatedGudang,
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Error updating ingredient:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const ingredientId = Number(id);
    if (!ingredientId) {
        return NextResponse.json({ message: 'Invalid ingredient id' }, { status: 400 });
    }

    try {
        const [usedInMenu]: any = await db.query(
            `SELECT id FROM menuIngredient WHERE ingredientId = ?`,
            [ingredientId]
        );

        if (usedInMenu.length > 0) {
            return NextResponse.json({
                message: "Ingredient tidak dapat dihapus karena masih digunakan dalam menu",
            }, { status: 409 });
        }

        const [gudangRows] = await db.query('SELECT id FROM gudang WHERE ingredientId = ?', [ingredientId]);
        const gudangIds = (gudangRows as any[]).map(g => g.id);

        if (gudangIds.length > 0) {
            await db.query(`DELETE FROM dailyGudangStock WHERE gudangId IN (${gudangIds.map(() => '?').join(',')})`, gudangIds);
        }

        await db.query('DELETE FROM gudang WHERE ingredientId = ?', [ingredientId]);
        await db.query('DELETE FROM menuIngredient WHERE ingredientId = ?', [ingredientId]);
        await db.query('DELETE FROM ingredientComposition WHERE semiIngredientId = ? OR rawIngredientId = ?', [ingredientId, ingredientId]);
        await db.query('DELETE FROM dailyIngredientStock WHERE ingredientId = ?', [ingredientId]);
        await db.query('DELETE FROM purchaseOrder WHERE ingredientId = ?', [ingredientId]);
        await db.query('DELETE FROM ingredient WHERE id = ?', [ingredientId]);

        return NextResponse.json({
            message: 'Ingredient berhasil dihapus (hard delete)',
            ingredient: { id: ingredientId },
        });
    } catch (error) {
        console.error('Error deleting ingredient:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
