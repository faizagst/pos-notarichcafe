import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { IncomingForm } from "formidable";

export const dynamic = "force-dynamic";

const uploadDir = path.join(process.cwd(), "public/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Middleware untuk handle multipart form dengan formidable
const parseForm = async (req: NextRequest): Promise<{
  fields: Record<string, any>;
  files: Record<string, any>;
}> => {
  const form = new IncomingForm({
    multiples: false,
    uploadDir,
    keepExtensions: true,
    filename: (name, ext, part) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      return `${name}-${unique}${ext}`;
    },
  });

  return new Promise((resolve, reject) => {
    form.parse(req as any, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

// PUT: Update bundle
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const id = Number(context.params.id);
  if (!id) return NextResponse.json({ message: "Missing bundle id" }, { status: 400 });

  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const { fields, files } = await parseForm(req);
      const { name, description, price, includedMenus } = fields;

      if (!name || !price) {
        return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
      }

      let parsedMenus: { menuId: number; amount: number }[] = [];
      if (includedMenus) {
        parsedMenus = typeof includedMenus === "string" ? JSON.parse(includedMenus) : includedMenus;
      }

      let imagePath: string | undefined;
      if (files.image && files.image[0]) {
        const filename = path.basename(files.image[0].filepath);
        imagePath = `/uploads/${filename}`;
      }

      // Update menu
      await db.execute(
        `UPDATE menu SET name = ?, description = ?, price = ?, ${imagePath ? "image = ?," : ""} updatedAt = NOW() WHERE id = ?`,
        imagePath
          ? [name, description || null, price, imagePath, id]
          : [name, description || null, price, id]
      );

      // Delete existing compositions
      await db.execute(`DELETE FROM menuComposition WHERE bundleId = ?`, [id]);

      // Insert new ones
      if (parsedMenus.length > 0) {
        const values = parsedMenus.map((m) => [id, m.menuId, m.amount]);
        await db.query(`INSERT INTO menuComposition (bundleId, menuId, amount) VALUES ?`, [values]);
      }

      // Fetch result
      const [bundleRows]: any = await db.query(
        `SELECT * FROM menu WHERE id = ?`,
        [id]
      );
      const bundle = bundleRows[0];

      const [compositions]: any = await db.query(
        `SELECT mc.*, m.* FROM menuComposition mc JOIN menu m ON mc.menuId = m.id WHERE mc.bundleId = ?`,
        [id]
      );

      const formattedCompositions = compositions.map((row: any) => ({
        id: row.id,
        bundleId: row.bundleId,
        menuId: row.menuId,
        amount: row.amount,
        menu: {
          id: row.menuId,
          name: row.name,
          price: row.price,
          type: row.type,
          image: row.image,
        },
      }));

      return NextResponse.json({
        message: "Bundle updated successfully",
        bundle: { ...bundle, bundleCompositions: formattedCompositions },
      });
    } else {
      // Handle toggle status (JSON body)
      const body = await req.json();
      const { isActive } = body;
      if (isActive === undefined) {
        return NextResponse.json({ message: "Missing isActive field" }, { status: 400 });
      }

      await db.execute(`UPDATE menu SET isActive = ? WHERE id = ?`, [isActive, id]);
      const [rows]: any = await db.query(`SELECT * FROM menu WHERE id = ?`, [id]);

      return NextResponse.json({
        message: "Bundle status updated successfully",
        bundle: rows[0],
      });
    }
  } catch (error) {
    console.error("PUT /bundles/[id] error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Soft delete bundle
export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const id = Number(context.params.id);
  if (!id) return NextResponse.json({ message: "Missing bundle id" }, { status: 400 });

  try {
    await db.execute(`UPDATE menu SET isActive = false WHERE id = ?`, [id]);
    const [rows]: any = await db.query(`SELECT * FROM menu WHERE id = ?`, [id]);

    return NextResponse.json({
      message: "Bundle deleted successfully",
      bundle: rows[0],
    });
  } catch (error) {
    console.error("DELETE /bundles/[id] error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
