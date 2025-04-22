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

    try {
        const [ingredientRows] = await db.query('SELECT * FROM ingredient WHERE id = ?', [ingredientId]);
        const ingredient: any = Array.isArray(ingredientRows) ? ingredientRows[0] : null;
        if (!ingredient) return NextResponse.json({ message: 'Ingredient not found' }, { status: 404 });

        const newStart = start !== undefined ? Number(start) : ingredient.start;
        const newStockIn = stockIn !== undefined ? Number(stockIn) : ingredient.stockIn;
        const newUsed = used !== undefined ? Number(used) : ingredient.used;
        const newWasted = wasted !== undefined ? Number(wasted) : ingredient.wasted;
        const newStock = newStart + newStockIn - newUsed - newWasted;
        const newPrice = price !== undefined ? Number(price) : ingredient.price;

        // Update ingredient
        await db.query(`
      UPDATE ingredient SET
        name = ?,
        start = ?,
        stockIn = ?,
        used = ?,
        wasted = ?,
        stock = ?,
        stockMin = ?,
        unit = ?,
        isActive = ?,
        price = ?,
        categoryId = ?,
        type = ?,
        finishedUnit = '-'
      WHERE id = ?
    `, [
            name,
            newStart,
            newStockIn,
            newUsed,
            newWasted,
            newStock,
            stockMin,
            unit,
            isActive,
            newPrice,
            categoryId,
            type,
            ingredientId
        ]);

        // Ambil data updated ingredient
        const [updatedRows] = await db.query('SELECT * FROM ingredient WHERE id = ?', [ingredientId]);
        const updatedIngredient: any = Array.isArray(updatedRows) ? updatedRows[0] : null;

        // SEMI_FINISHED price calculation
        if (updatedIngredient.type === 'SEMI_FINISHED') {
            const [compositions] = await db.query(
                'SELECT * FROM ingredientComposition WHERE semiIngredientId = ?',
                [updatedIngredient.id]
            );

            let calculatedPrice = 0;
            for (const comp of compositions as any[]) {
                const [raw] = await db.query('SELECT * FROM ingredient WHERE id = ?', [comp.rawIngredientId]);
                const rawIngredient: any = Array.isArray(raw) ? raw[0] : null;
                if (rawIngredient) calculatedPrice += rawIngredient.price * comp.amount;
            }

            if (calculatedPrice !== updatedIngredient.price) {
                await db.query('UPDATE ingredient SET price = ? WHERE id = ?', [calculatedPrice, updatedIngredient.id]);
                updatedIngredient.price = calculatedPrice;
            }

        } else {
            // Update all affected SEMI_FINISHED ingredients
            const [affectedComps] = await db.query(
                'SELECT DISTINCT semiIngredientId FROM ingredientComposition WHERE rawIngredientId = ?',
                [updatedIngredient.id]
            );

            for (const comp of affectedComps as any[]) {
                const [comps] = await db.query(
                    'SELECT * FROM ingredientComposition WHERE semiIngredientId = ?',
                    [comp.semiIngredientId]
                );

                let calcPrice = 0;
                for (const c of comps as any[]) {
                    const [raw] = await db.query('SELECT * FROM ingredient WHERE id = ?', [c.rawIngredientId]);
                    const rawIngredient: any = Array.isArray(raw) ? raw[0] : null;
                    if (rawIngredient) calcPrice += rawIngredient.price * c.amount;
                }

                await db.query('UPDATE ingredient SET price = ? WHERE id = ?', [calcPrice, comp.semiIngredientId]);
            }
        }

        // Update gudang if stockIn is affected
        let updatedGudang = null;
        if (stockIn !== undefined) {
            const [gudangRows] = await db.query('SELECT * FROM gudang WHERE ingredientId = ?', [ingredientId]);
            const gudang: any = Array.isArray(gudangRows) ? gudangRows[0] : null;

            if (gudang) {
                const increment = newStockIn - ingredient.stockIn;
                const newGudangUsed = gudang.used + increment;
                const newGudangStock = gudang.start + gudang.stockIn - newGudangUsed - gudang.wasted;

                await db.query(`
          UPDATE gudang SET used = ?, stock = ? WHERE ingredientId = ?
        `, [newGudangUsed, newGudangStock, ingredientId]);

                updatedGudang = { ...gudang, used: newGudangUsed, stock: newGudangStock };
            }
        }

        // Handle menu status
        let notificationMessage = '';
        if (newStock <= updatedIngredient.stockMin && newStock !== 0) {
            notificationMessage = `Manager harus melakukan stock in, stock ${ingredient.name} di cafe sudah mencapai batas minimal`;
        } else if (newStock === 0) {
            await db.query(`
        UPDATE menu SET Status = 'Habis' 
        WHERE id IN (
          SELECT m.id FROM menu m
          JOIN menuIngredient mi ON mi.menuId = m.id
          WHERE mi.ingredientId = ?
        )
      `, [ingredientId]);
        } else {
            await db.query(`
        UPDATE menu SET Status = 'Tersedia' 
        WHERE id IN (
          SELECT m.id FROM menu m
          JOIN menuIngredient mi ON mi.menuId = m.id
          WHERE mi.ingredientId = ? AND m.Status = 'Habis'
        )
      `, [ingredientId]);
        }

        // Update maxBeli
        const [menus] = await db.query(`
      SELECT m.id, m.name FROM menu m
      JOIN menuIngredient mi ON mi.menuId = m.id
      WHERE mi.ingredientId = ?
    `, [ingredientId]);

        for (const menu of menus as any[]) {
            const [ingredients] = await db.query(`
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

            await db.query('UPDATE menu SET maxBeli = ? WHERE id = ?', [isFinite(newMaxBeli) ? newMaxBeli : 0, menu.id]);
        }

        return NextResponse.json({
            message: 'Ingredient berhasil diupdate',
            ingredient: updatedIngredient,
            notificationMessage,
            gudang: updatedGudang,
        });
    } catch (error) {
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
        // 1. Ambil semua gudangId untuk ingredient ini
        const [gudangRows] = await db.query('SELECT id FROM gudang WHERE ingredientId = ?', [ingredientId]);
        const gudangIds = (gudangRows as any[]).map(g => g.id);

        // 2. Hapus dailygudangstock yang berkaitan
        if (gudangIds.length > 0) {
            await db.query(`DELETE FROM dailygudangstock WHERE gudangId IN (${gudangIds.map(() => '?').join(',')})`, gudangIds);
        }

        // 3. Hapus gudang
        await db.query('DELETE FROM gudang WHERE ingredientId = ?', [ingredientId]);

        // 4. Hapus relasi dari menuIngredient dan ingredientComposition (jika ada)
        await db.query('DELETE FROM menuIngredient WHERE ingredientId = ?', [ingredientId]);
        await db.query('DELETE FROM ingredientComposition WHERE semiIngredientId = ? OR rawIngredientId = ?', [ingredientId, ingredientId]);

        // 5. Hapus data dari dailyingredientstock
        await db.query('DELETE FROM dailyingredientstock WHERE ingredientId = ?', [ingredientId]);

        // 6. Hapus ingredient utama
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


