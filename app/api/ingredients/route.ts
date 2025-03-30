// app/api/ingredient/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// GET: Fetch active ingredients
export async function GET(req: NextRequest) {
  try {
    const [ingredients] = await db.query(
      "SELECT * FROM ingredient WHERE isActive = true"
    );

    return NextResponse.json(ingredients, { status: 200 });
  } catch (error) {
    console.error("Error fetching ingredients:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
