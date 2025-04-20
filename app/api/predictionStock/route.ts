import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const periodParam = request.nextUrl.searchParams.get('period');
    const leadTimeParam = request.nextUrl.searchParams.get('leadTime');

    const reviewPeriod = parseInt(periodParam || '14', 10); // default 14 hari
    const leadTime = parseInt(leadTimeParam || '3', 10);     // default 3 hari
    const totalDays = reviewPeriod + leadTime;

    const [rows] = await db.query(
      `
      SELECT 
        i.id AS ingredientId,
        i.name,
        i.stock,
        i.unit,
        i.type,
        ROUND(IFNULL(u.total_avg_daily, 0), 2) AS avgDailyUsage,
        ROUND(IFNULL(u.total_avg_daily, 0) * ${totalDays}, 2) AS predictedUsage,
        ROUND(IFNULL(u.total_avg_daily, 0) * ${totalDays} * 0.1, 2) AS safetyStock,
        ROUND(IFNULL(u.total_avg_daily, 0) * ${totalDays} * 1.1, 2) AS totalRequired,
        i.stock - ROUND(IFNULL(u.total_avg_daily, 0) * ${totalDays} * 1.1, 2) AS stockAfterReview,
        IF(i.stock < ROUND(IFNULL(u.total_avg_daily, 0) * ${totalDays} * 1.1), 1, 0) AS shouldRestock,
        GREATEST(ROUND(IFNULL(u.total_avg_daily, 0) * ${totalDays} * 1.1, 2) - i.stock, 0) AS recommendedOrder,
        ROUND(IFNULL(i.stock / NULLIF(u.total_avg_daily, 0), 9999), 0) AS daysUntilStockOut

      FROM ingredient i
      LEFT JOIN (
        SELECT ingredientId, SUM(avg_daily) AS total_avg_daily FROM (
          -- Menu utama
          SELECT 
            mi.ingredientId,
            SUM(coi.quantity * mi.amount) / ${totalDays} AS avg_daily
          FROM completedorderitem coi
          JOIN menuingredient mi ON coi.menuId = mi.menuId
          JOIN completedorder co ON co.id = coi.orderId
          WHERE co.createdAt >= DATE_SUB(CURDATE(), INTERVAL ${totalDays} DAY)
          GROUP BY mi.ingredientId
          
          UNION ALL

          -- Modifier
          SELECT 
            mfi.ingredientId,
            SUM(1 * mfi.amount) / ${totalDays} AS avg_daily
          FROM completedorderitemmodifier coimod
          JOIN modifieringredient mfi ON coimod.modifierId = mfi.modifierId
          JOIN completedorderitem coi ON coi.id = coimod.completedOrderItemId
          JOIN completedorder co ON co.id = coi.orderId
          WHERE co.createdAt >= DATE_SUB(CURDATE(), INTERVAL ${totalDays} DAY)
          GROUP BY mfi.ingredientId
        ) AS all_usage
        GROUP BY ingredientId
      ) u ON i.id = u.ingredientId
      WHERE i.isActive = 1
      ORDER BY stockAfterReview ASC
      `
    );

    return NextResponse.json({ reviewPeriod, leadTime, totalDays, data: rows });
  } catch (err) {
    console.error('Prediction API error:', err);
    return NextResponse.json({ error: 'Gagal menghitung prediksi stok' }, { status: 500 });
  }
}
