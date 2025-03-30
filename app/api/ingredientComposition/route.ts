import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const semiIngredientId = searchParams.get("semiIngredientId");

  if (!semiIngredientId) {
    return NextResponse.json({ message: "Missing semiIngredientId" }, { status: 400 });
  }

  const semiId = parseInt(semiIngredientId);
  if (isNaN(semiId)) {
    return NextResponse.json({ message: "semiIngredientId harus berupa angka" }, { status: 400 });
  }

  try {
    const [compositions]: any = await db.execute(
      `SELECT * FROM ingredientComposition WHERE semiIngredientId = ?`,
      [semiId]
    );

    return NextResponse.json(compositions);
  } catch (error) {
    console.error("Error fetching ingredient composition:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
