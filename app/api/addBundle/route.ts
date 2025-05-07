import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import multer from "multer";
import { promisify } from "util";
import { Readable } from "stream";
import db from "@/lib/db";

// Buat folder jika belum ada
const uploadDir = path.join(process.cwd(), "public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    cb(null, filename);
  },
});
const upload = multer({ storage });
const runMiddleware = promisify(upload.single("image"));

export const config = {
  api: {
    bodyParser: false,
  },
};

// Fungsi untuk convert request body ke format multer bisa baca
async function parseMultipartFormData(req: NextRequest): Promise<FormData> {
  const formData = new FormData();

  const buffers = await req.arrayBuffer();
  const stream = Readable.from(Buffer.from(buffers));

  const req_ = Object.assign(stream, {
    headers: req.headers,
    method: req.method,
    url: req.url,
  });

  const res_ = {
    setHeader: () => { },
    end: () => { },
  };

  // Jalankan multer untuk parsing
  await runMiddleware(req_ as any, res_ as any);

  return (req_ as any).body;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;
    const includedMenus = formData.get("includedMenus") as string;
    const discountId = formData.get("discountId") as string;
    const modifierIds = formData.get("modifierIds") as string;
    const imageFile = formData.get("image") as File;

    if (!name || !price) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Simpan file
    let imagePath = "";
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      fs.writeFileSync(`${uploadDir}/${filename}`, buffer);
      imagePath = `/uploads/${filename}`;
    }

    //cari HPP
    let totalHargaBakul = 0;
    if (includedMenus) {
      const parsed = JSON.parse(includedMenus); // array of { menuId, amount }

      for (const row of parsed) {
        const [rows] = await db.execute(
          `SELECT hargaBakul FROM Menu WHERE id = ?`,
          [row.menuId]
        );

        if ((rows as any[]).length === 0) continue;

        const harga = (rows as any[])[0].hargaBakul || 0;
        totalHargaBakul += harga * row.amount;
      }
    }

    // Cek nama yang sama
    const [existing] = await db.query(
      'SELECT id FROM menu WHERE name = ?',
      [name]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json({ message: 'Menu name already exists' }, { status: 400 });
    }

    // Simpan bundle ke database
    const [result] = await db.execute(
      `INSERT INTO Menu (name, description, image, price, category, Status, type, hargaBakul)
       VALUES (?, ?, ?, ?, 'bundle', 'tersedia', 'BUNDLE', ?)`,
      [name, description || null, imagePath, parseFloat(price), totalHargaBakul]
    );


    const newBundleId = (result as any).insertId;

    // Simpan menu composition jika ada
    if (includedMenus) {
      const parsed = JSON.parse(includedMenus);
      for (const row of parsed) {
        await db.execute(
          `INSERT INTO MenuComposition (bundleId, menuId, amount) VALUES (?, ?, ?)`,
          [newBundleId, row.menuId, row.amount]
        );
      }
    }

    // Simpan discount
    if (discountId && discountId.trim() !== "") {
      await db.execute(
        `INSERT INTO MenuDiscount (menuId, discountId) VALUES (?, ?)`,
        [newBundleId, parseInt(discountId)]
      );
    }

    // Simpan modifier
    if (modifierIds) {
      const parsed = JSON.parse(modifierIds);
      for (const modId of parsed) {
        await db.execute(
          `INSERT INTO MenuModifier (menuId, modifierId) VALUES (?, ?)`,
          [newBundleId, modId]
        );
      }
    }

    return NextResponse.json({
      message: "Bundle created successfully",
      bundleId: newBundleId,
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating bundle (App Router):", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
