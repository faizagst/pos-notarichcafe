// app/api/add-bundle/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import { IncomingForm } from "formidable";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Setup folder uploads
const uploadDir = path.join(process.cwd(), "public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Helper: Simpan file upload
async function saveFile(file: any) {
  const ext = path.extname(file.originalFilename);
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const filepath = path.join(uploadDir, filename);

  const data = fs.readFileSync(file.filepath);
  fs.writeFileSync(filepath, data);
  return `/uploads/${filename}`;
}

// Helper: Parse form-data
function parseForm(req: NextRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ uploadDir, keepExtensions: true });
    form.parse(req as any, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await parseForm(req);
    const { fields, files } = formData;

    const {
      name,
      description,
      price,
      includedMenus,
      discountId,
      modifierIds,
    } = fields;

    if (!name || !price) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const imagePath = files.image ? await saveFile(files.image[0]) : "";

    // Buat bundle menu
    const [result] = await db.execute(
      `INSERT INTO menu (name, description, image, price, category, Status, type)
       VALUES (?, ?, ?, ?, 'bundle', 'tersedia', 'BUNDLE')`,
      [name, description || null, imagePath, parseFloat(price)]
    );

    const newBundleId = (result as any).insertId;

    // Handle includedMenus
    let parsedMenus: { menuId: number; amount: number }[] = [];
    if (includedMenus) {
      parsedMenus = typeof includedMenus === "string"
        ? JSON.parse(includedMenus)
        : includedMenus;
      for (const row of parsedMenus) {
        await db.execute(
          `INSERT INTO menuComposition (bundleId, menuId, amount) VALUES (?, ?, ?)`,
          [newBundleId, row.menuId, row.amount]
        );
      }
    }

    // Handle discountId
    if (discountId && discountId.toString().trim() !== "") {
      await db.execute(
        `INSERT INTO menuDiscount (menuId, discountId) VALUES (?, ?)`,
        [newBundleId, parseInt(discountId)]
      );
    }

    // Handle modifierIds
    if (modifierIds) {
      const parsedModifierIds = typeof modifierIds === "string"
        ? JSON.parse(modifierIds)
        : modifierIds;

      for (const modId of parsedModifierIds) {
        await db.execute(
          `INSERT INTO menuModifier (menuId, modifierId) VALUES (?, ?)`,
          [newBundleId, modId]
        );
      }
    }

    // Fetch created bundle detail
    const [bundleRows] = await db.query(
      `SELECT * FROM menu WHERE id = ?`,
      [newBundleId]
    );

    const [compositionRows] = await db.query(
      `SELECT mc.*, m.* FROM menuComposition mc
       JOIN menu m ON mc.menuId = m.id
       WHERE mc.bundleId = ?`,
      [newBundleId]
    );

    return NextResponse.json({
      message: "Bundle created successfully",
      bundle: {
        ...(Array.isArray(bundleRows) && bundleRows[0]),
        bundleCompositions: compositionRows,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating bundle:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
