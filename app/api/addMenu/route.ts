import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import multer from "multer";
import fs from "fs";
import path from "path";
import { Anybody } from "next/font/google";

const uploadDir = path.join(process.cwd(), "public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "./public/uploads");
  },
  filename: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });
const runMiddleware = (req: any, res: any, fn: any) =>
  new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        reject(result);
      }
      resolve(result);
    });
  });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;

    const filePath = path.join(uploadDir, file.name);
    fs.writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));

    const imagePath = `/uploads/${file.name}`;
    const name = formData.get("name") as string;
    const price = parseFloat(formData.get("price") as string);
    const description = formData.get("description") || null;
    const category = formData.get("category") || null;
    const Status = formData.get("Status") || null;
    const ingredients = JSON.parse(formData.get("ingredients") as string || "[]");
    const modifierIds = JSON.parse(formData.get("modifierIds") as string || "[]");
    const discountId = formData.get("discountId") || null;

    if (!name || isNaN(price) || !imagePath) {
      return NextResponse.json(
        { message: "Name, Price, dan Image wajib diisi" },
        { status: 400 }
      );
    }

    // Cek nama yang sama
    const [existing] = await db.query(
      'SELECT id FROM menu WHERE name = ?',
      [name]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json({ message: 'Menu name already exists' }, { status: 400 });
    }

    // Create menu
    const [result]: any = await db.query(
      `INSERT INTO menu (name, description, price, image, category, Status, hargaBakul) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, imagePath, category, Status, 2000]
    );

    const menuId = result.insertId;

    // Insert ingredients
    if (ingredients.length > 0) {
      const ingredientValues = ingredients
        .map((ing: any) => `(${menuId}, ${ing.ingredientId}, ${ing.amount})`)
        .join(",");
      await db.query(
        `INSERT INTO menuIngredient (menuId, ingredientId, amount) VALUES ${ingredientValues}`
      );
    }

    // Insert modifiers
    if (modifierIds.length > 0) {
      const modifierValues = modifierIds
        .map((modId: number) => `(${menuId}, ${modId})`)
        .join(",");
      await db.query(
        `INSERT INTO menuModifier (menuId, modifierId) VALUES ${modifierValues}`
      );
    }

    // Insert discount
    if (discountId) {
      await db.query(
        `INSERT INTO menuDiscount (menuId, discountId) VALUES (?, ?)`,
        [menuId, discountId]
      );
    }

    // Calculate maxBeli
    const [ingredientsData]: any = await db.query(
      `SELECT i.stock, mi.amount 
       FROM menuIngredient mi 
       JOIN ingredient i ON mi.ingredientId = i.id 
       WHERE mi.menuId = ?`,
      [menuId]
    );

    let maxBeli = ingredientsData.reduce((acc: number, ing: any) => {
      const possible = Math.floor(ing.stock / ing.amount);
      return Math.min(acc, possible);
    }, Infinity);

    maxBeli = maxBeli === Infinity ? 0 : maxBeli;
    await db.query(`UPDATE menu SET maxBeli = ? WHERE id = ?`, [maxBeli, menuId]);

    return NextResponse.json({ message: "Menu berhasil dibuat", menuId });
  } catch (error: any) {
    console.error("Error handling POST request:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    let imagePath: string | null = null;

    if (file && file.name) {
      const filePath = path.join(uploadDir, file.name);
      fs.writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));
      imagePath = `/uploads/${file.name}`;
    }

    const id = parseInt(formData.get("id") as string);
    const name = formData.get("name") as string;
    const price = parseFloat(formData.get("price") as string);
    const description = formData.get("description") || null;
    const category = formData.get("category") || null;
    const Status = formData.get("Status") || null;
    const ingredients = JSON.parse(formData.get("ingredients") as string || "[]");
    const modifierIds = JSON.parse(formData.get("modifierIds") as string || "[]");
    const discountId = formData.get("discountId") || null;

    if (!id || !name || isNaN(price)) {
      return NextResponse.json(
        { message: "ID, Name, dan Price wajib diisi" },
        { status: 400 }
      );
    }

    // Jika user ingin mengubah nama, cek apakah nama sudah dipakai oleh gratuity lain
    if (name) {
      const [existingRows]: any = await db.query(
        'SELECT id FROM menu WHERE name = ? AND id != ?',
        [name, id]
      );
      if (existingRows.length > 0) {
        return NextResponse.json({ message: 'Menu name already exists' }, { status: 409 });
      }
    }


    // Update menu
    const updateFields = [`name = ?`, `description = ?`, `price = ?`, `category = ?`, `Status = ?`];
    const values: any[] = [name, description, price, category, Status];

    if (imagePath) {
      updateFields.push(`image = ?`);
      values.push(imagePath);
    }

    values.push(id);
    await db.query(
      `UPDATE menu SET ${updateFields.join(", ")} WHERE id = ?`,
      values
    );

    // Update ingredients
    await db.query(`DELETE FROM menuIngredient WHERE menuId = ?`, [id]);
    if (ingredients.length > 0) {
      const ingredientValues = ingredients
        .map((ing: any) => `(${id}, ${ing.ingredientId}, ${ing.amount})`)
        .join(",");
      await db.query(
        `INSERT INTO menuIngredient (menuId, ingredientId, amount) VALUES ${ingredientValues}`
      );
    }

    // Update modifiers
    await db.query(`DELETE FROM menuModifier WHERE menuId = ?`, [id]);
    if (modifierIds.length > 0) {
      const modifierValues = modifierIds
        .map((modId: number) => `(${id}, ${modId})`)
        .join(",");
      await db.query(
        `INSERT INTO menuModifier (menuId, modifierId) VALUES ${modifierValues}`
      );
    }

    // Update discount
    await db.query(`DELETE FROM menuDiscount WHERE menuId = ?`, [id]);
    if (discountId) {
      await db.query(
        `INSERT INTO menuDiscount (menuId, discountId) VALUES (?, ?)`,
        [id, discountId]
      );
    }

    // Calculate maxBeli
    const [ingredientsData]: any = await db.query(
      `SELECT i.stock, mi.amount 
       FROM menuIngredient mi 
       JOIN ingredient i ON mi.ingredientId = i.id 
       WHERE mi.menuId = ?`,
      [id]
    );

    let maxBeli = ingredientsData.reduce((acc: number, ing: any) => {
      const possible = Math.floor(ing.stock / ing.amount);
      return Math.min(acc, possible);
    }, Infinity);

    maxBeli = maxBeli === Infinity ? 0 : maxBeli;
    await db.query(`UPDATE menu SET maxBeli = ? WHERE id = ?`, [maxBeli, id]);

    return NextResponse.json({ message: "Menu berhasil diperbarui", id });
  } catch (error: any) {
    console.error("Error handling PUT request:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
