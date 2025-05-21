import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Ambil parameter periode review (period) dan lead time (leadTime) dari query URL
    // Jika tidak ada, gunakan default 14 hari untuk periode dan 3 hari untuk lead time
    const periodParam = request.nextUrl.searchParams.get('period');
    const leadTimeParam = request.nextUrl.searchParams.get('leadTime');

    // Tingkat layanan Z untuk service level 95% (nilai Z pada distribusi normal)
    const serviceLevelZ = 1.65;

    // Konversi parameter ke integer
    const reviewPeriod = parseInt(periodParam || '14', 10);  // T, interval pemesanan (hari)
    const leadTime = parseInt(leadTimeParam || '3', 10);     // LT, lead time (hari)

    // Total hari yang dihitung (periode review + lead time)
    const totalDays = reviewPeriod + leadTime;

    // Akar kuadrat dari totalDays, digunakan dalam perhitungan safety stock
    const sqrtTotalDays = Math.sqrt(totalDays);

    // Query utama untuk menghitung prediksi stok bahan baku
    const [rows] = await db.query(
      `
      -- Buat kalender tanggal selama periode totalDays (T + LT)
      WITH RECURSIVE calendar AS (
        SELECT CURDATE() - INTERVAL ${totalDays} DAY AS cal_date
        UNION ALL
        SELECT cal_date + INTERVAL 1 DAY FROM calendar WHERE cal_date + INTERVAL 1 DAY <= CURDATE()
      ),

      -- Hitung pemakaian harian untuk setiap bahan baku berdasarkan order NORMAL, BUNDLE, dan modifier
      daily_usage AS (
        SELECT 
          usage_date,
          ingredientId,
          SUM(usage_amount) AS usage_amount
        FROM (
          -- Pemakaian dari menu NORMAL
          SELECT 
            DATE(co.createdAt) AS usage_date,
            mi.ingredientId,
            coi.quantity * mi.amount AS usage_amount
          FROM completedorderitem coi
          JOIN menu m ON m.id = coi.menuId AND m.type = 'NORMAL'
          JOIN menuingredient mi ON mi.menuId = m.id
          JOIN completedorder co ON co.id = coi.orderId
          WHERE co.createdAt >= CURDATE() - INTERVAL ${totalDays} DAY

          UNION ALL

          -- Pemakaian dari menu BUNDLE (komposisi menu bundle)
          SELECT 
            DATE(co.createdAt) AS usage_date,
            mi.ingredientId,
            coi.quantity * mc.amount * mi.amount AS usage_amount
          FROM completedorderitem coi
          JOIN menu m_bundle ON m_bundle.id = coi.menuId AND m_bundle.type = 'BUNDLE'
          JOIN menucomposition mc ON mc.bundleId = m_bundle.id
          JOIN menuingredient mi ON mi.menuId = mc.menuId
          JOIN completedorder co ON co.id = coi.orderId
          WHERE co.createdAt >= CURDATE() - INTERVAL ${totalDays} DAY

          UNION ALL

          -- Pemakaian dari modifier (tambahan bahan baku dari modifier)
          SELECT 
            DATE(co.createdAt) AS usage_date,
            mfi.ingredientId,
            mfi.amount AS usage_amount
          FROM completedorderitemmodifier coimod
          JOIN modifieringredient mfi ON coimod.modifierId = mfi.modifierId
          JOIN completedorderitem coi ON coi.id = coimod.completedOrderItemId
          JOIN completedorder co ON co.id = coi.orderId
          WHERE co.createdAt >= CURDATE() - INTERVAL ${totalDays} DAY
        ) combined_usage
        GROUP BY usage_date, ingredientId
      ),

      -- Gabungkan kalender dengan data pemakaian harian agar hari tanpa pemakaian dianggap 0
      usage_with_calendar AS (
        SELECT 
          i.id AS ingredientId,
          c.cal_date,
          IFNULL(d.usage_amount, 0) AS daily_usage
        FROM ingredient i
        CROSS JOIN calendar c
        LEFT JOIN daily_usage d ON d.usage_date = c.cal_date AND d.ingredientId = i.id
        WHERE i.isActive = 1
      ),

      -- Hitung rata-rata dan standar deviasi pemakaian harian dengan semua hari dihitung,
      -- termasuk hari tanpa pemakaian (0)
      stats AS (
        SELECT
          ingredientId,
          AVG(daily_usage) AS avg_daily,
          STDDEV_SAMP(daily_usage) AS stddev_daily
        FROM usage_with_calendar
        GROUP BY ingredientId
      )

      -- Select utama: hitung kebutuhan restock berdasarkan rumus periodic review
      SELECT
        i.id AS ingredientId,
        i.name,
        i.stock,
        i.unit,
        i.type,

        -- Estimasi berapa hari stok akan habis jika pemakaian rata-rata tetap
        ROUND(
          IF(IFNULL(s.avg_daily, 0) = 0, 0, i.stock / IFNULL(s.avg_daily, 0)),
          1
        ) AS daysUntilOutOfStock,

        -- Rata-rata pemakaian harian (D)
        ROUND(IFNULL(s.avg_daily, 0), 2) AS avgDailyUsage,

        -- Standar deviasi pemakaian harian (σ)
        ROUND(IFNULL(s.stddev_daily, 0), 2) AS stddevDailyUsage,

        -- Safety Stock = Z × σ × √(T + LT)
        ROUND(${serviceLevelZ} * IFNULL(s.stddev_daily, 0) * ${sqrtTotalDays}, 2) AS safetyStock,

        -- Permintaan rata-rata selama periode T + LT
        ROUND(IFNULL(s.avg_daily, 0) * ${totalDays}, 2) AS meanDemand,

        -- Target stok = mean demand + safety stock
        ROUND(
          IFNULL(s.avg_daily, 0) * ${totalDays} + ${serviceLevelZ} * IFNULL(s.stddev_daily, 0) * ${sqrtTotalDays},
          2
        ) AS targetStockLevel,

        -- Stok saat ini
        i.stock AS currentStock,

        -- Jumlah yang perlu diorder agar stok mencapai target stok
        ROUND(
          GREATEST(
            IFNULL(s.avg_daily, 0) * ${totalDays} + ${serviceLevelZ} * IFNULL(s.stddev_daily, 0) * ${sqrtTotalDays} - i.stock,
            0
          ),
          2
        ) AS restockQty,

        -- Flag apakah perlu restock (1 = ya, 0 = tidak)
        IF(
          i.stock < ROUND(IFNULL(s.avg_daily, 0) * ${totalDays} + ${serviceLevelZ} * IFNULL(s.stddev_daily, 0) * ${sqrtTotalDays}, 2),
          1,
          0
        ) AS shouldRestock
      FROM ingredient i
      LEFT JOIN stats s ON i.id = s.ingredientId
      WHERE i.isActive = 1
      ORDER BY restockQty DESC
      `
    );

    // Kirim response JSON berisi parameter dan data hasil perhitungan
    return NextResponse.json({
      reviewPeriod,
      leadTime,
      totalDays,
      serviceLevelZ,
      data: rows,
    });
  } catch (err) {
    // Tangani error dengan logging dan response error
    console.error('Prediction API error:', err);
    return NextResponse.json({ error: 'Gagal menghitung prediksi stok' }, { status: 500 });
  }
}
