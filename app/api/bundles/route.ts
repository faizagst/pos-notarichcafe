import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { RowDataPacket } from "mysql2";

// GET /api/bundles
export async function GET(req: NextRequest) {
  try {
    // Ambil semua menu dengan type = 'BUNDLE'
    const [bundles] = await db.query<RowDataPacket[]>(`
      SELECT m.id, m.name, m.type, m.price, m.description, m.image
      FROM menu m
      WHERE m.type = 'BUNDLE'
    `);

    if (bundles.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const bundleIds = bundles.map((b) => b.id);

    // Ambil semua komposisi bundle untuk bundleIds
    const [compositions] = await db.query<RowDataPacket[]>(
      `
      SELECT 
        mc.bundleId,
        mc.menuId,
        mc.amount AS quantity,
        m.id AS menu_id,
        m.name AS menu_name,
        m.price AS menu_price,
        m.type AS menu_type,
        m.description AS menu_description,
        m.image AS menu_image
      FROM menuComposition mc
      JOIN menu m ON mc.menuId = m.id
      WHERE mc.bundleId IN (?)
      `,
      [bundleIds]
    );

    // Kelompokkan komposisi berdasarkan bundleId
    const compositionsMap: Record<number, any[]> = {};
    for (const comp of compositions) {
      if (!compositionsMap[comp.bundleId]) {
        compositionsMap[comp.bundleId] = [];
      }

      compositionsMap[comp.bundleId].push({
        menuId: comp.menuId,
        quantity: comp.quantity,
        menu: {
          id: comp.menu_id,
          name: comp.menu_name,
          price: comp.menu_price,
          type: comp.menu_type,
          description: comp.menu_description,
          image: comp.menu_image,
        },
      });
    }

    // Gabungkan bundle dengan komposisinya
    const result = bundles.map((bundle) => ({
      ...bundle,
      bundleCompositions: compositionsMap[bundle.id] || [],
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error retrieving bundles:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
