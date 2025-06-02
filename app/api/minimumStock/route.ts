// File: app/api/minimum-stock/route.ts

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const operator = searchParams.get("operator") || "lt";
    const threshold = searchParams.get("threshold")
      ? Number(searchParams.get("threshold"))
      : 20;

    if (isNaN(threshold)) {
      return NextResponse.json({ error: "Invalid threshold" }, { status: 400 });
    }

    let query = "";
    if (operator === "lt") {
      query = "SELECT id, name, stock, stockMin, unit FROM ingredient WHERE stock < ?";
    } else if (operator === "gt") {
      query = "SELECT id, name, stock, stockMin, unit FROM ingredient WHERE stock > ?";
    } else {
      return NextResponse.json(
        { error: "Invalid operator. Use 'lt' or 'gt'" },
        { status: 400 }
      );
    }

    const [results] = await db.execute(query, [threshold]);
    const ingredients = results as {
      id: number;
      name: string;
      stock: number;
      stockMin: number;
      unit: string;
    }[];

    return NextResponse.json(ingredients);
  } catch (error) {
    console.error("Error fetching minimum stock:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
