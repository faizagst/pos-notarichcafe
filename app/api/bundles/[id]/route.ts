import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import multer from "multer";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

// Disable body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = path.join(process.cwd(), "public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });
const uploadMiddleware = upload.single("image");

function runMiddleware(req: any, res: any, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) return reject(result);
      resolve(result);
    });
  });
}

// Convert NextRequest to Node.js Readable stream
async function toNodeReadable(req: NextRequest): Promise<Readable> {
  const stream = req.body as ReadableStream<Uint8Array>;
  const reader = stream.getReader();
  return new Readable({
    async read() {
      const { done, value } = await reader.read();
      this.push(done ? null : Buffer.from(value));
    },
  });
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing bundle id" }, { status: 400 });

  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const nodeReadable = await toNodeReadable(req);
      const mockReq: any = Object.assign(nodeReadable, {
        headers: Object.fromEntries(req.headers.entries()),
        method: req.method,
        url: "",
      });

      const mockRes = {
        end: () => { },
        setHeader: () => { },
        getHeader: () => { },
      };

      await runMiddleware(mockReq, mockRes, uploadMiddleware);

      const { name, description, price, includedMenus, discountId, modifierIds } = mockReq.body;
      const parsedMenuRows = includedMenus
        ? typeof includedMenus === "string"
          ? JSON.parse(includedMenus)
          : includedMenus
        : [];

      const imageUrl = mockReq.file ? `/uploads/${mockReq.file.filename}` : undefined;

      if (!name || !price) {
        return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
      }

      // Build dynamic query
      const fields = ["name = ?", "description = ?", "price = ?"];
      const values = [name, description || null, parseFloat(price)];

      // Hitung total hargaBakul dari semua menu yang termasuk
      let totalHargaBakul = 0;
      for (const row of parsedMenuRows) {
        const [rows]: any = await db.execute(
          `SELECT hargaBakul FROM menu WHERE id = ?`,
          [row.menuId]
        );
        if (rows.length > 0) {
          const harga = rows[0].hargaBakul || 0;
          totalHargaBakul += harga * row.amount;
        }
      }
      fields.push("hargaBakul = ?");
      values.push(totalHargaBakul);

      if (imageUrl) {
        fields.push("image = ?");
        values.push(imageUrl);
      }

      values.push(id);

      // Jika user ingin mengubah nama, cek apakah nama sudah dipakai oleh bundles lain
      if (name) {
        const [existingRows]: any = await db.query(
          'SELECT id FROM menu WHERE name = ? AND id != ?',
          [name, id]
        );
        if (existingRows.length > 0) {
          return NextResponse.json({ message: 'Bundle name already exists' }, { status: 409 });
        }
      }
      const updateQuery = `UPDATE menu SET ${fields.join(", ")} WHERE id = ?`;

      await db.execute(updateQuery, values);


      await db.execute("DELETE FROM menuComposition WHERE bundleId = ?", [id]);

      if (parsedMenuRows.length > 0) {
        const values = parsedMenuRows.map((row: any) => [id, row.menuId, row.amount]);
        await db.query("INSERT INTO menuComposition (bundleId, menuId, amount) VALUES ?", [values]);
      }

      const [result]: any = await db.query(
        `SELECT m.*, mc.menuId, mc.amount, mm.name as menuName
         FROM menu m
         LEFT JOIN menuComposition mc ON m.id = mc.bundleId
         LEFT JOIN menu mm ON mc.menuId = mm.id
         WHERE m.id = ?`,
        [id]
      );

      // Hapus relasi lama terlebih dahulu
      await db.execute("DELETE FROM menuDiscount WHERE menuId = ?", [id]);
      await db.execute("DELETE FROM menuModifier WHERE menuId = ?", [id]);

      // Tambahkan diskon jika ada
      if (discountId) {
        await db.execute("INSERT INTO menuDiscount (menuId, discountId) VALUES (?, ?)", [id, discountId]);
      }

      // Tambahkan modifier jika ada
      let parsedModifiers: number[] = [];
      if (modifierIds) {
        try {
          parsedModifiers = typeof modifierIds === 'string' ? JSON.parse(modifierIds) : modifierIds;
          if (Array.isArray(parsedModifiers) && parsedModifiers.length > 0) {
            const values = parsedModifiers.map(modId => [id, modId]);
            await db.query("INSERT INTO menuModifier (menuId, modifierId) VALUES ?", [values]);
          }
        } catch (err) {
          console.error("Gagal parsing modifierIds:", err);
        }
      }


      return NextResponse.json({
        message: "Bundle updated successfully",
        bundle: result,
      });
    } else {
      const body = await req.json();
      const { isActive } = body;

      if (typeof isActive === "undefined") {
        return NextResponse.json({ message: "Missing isActive field" }, { status: 400 });
      }

      await db.execute("UPDATE menu SET isActive = ? WHERE id = ?", [isActive, id]);

      const [updated]: any = await db.query("SELECT * FROM menu WHERE id = ?", [id]);

      return NextResponse.json({
        message: "Bundle status updated successfully",
        bundle: updated[0],
      });
    }
  } catch (error) {
    console.error("Error updating bundle:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing bundle id" }, { status: 400 });

  try {
    const body = await req.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json({ message: "Missing or invalid isActive field" }, { status: 400 });
    }

    await db.execute("UPDATE menu SET isActive = ? WHERE id = ?", [isActive, id]);

    const [result]: any = await db.query("SELECT * FROM menu WHERE id = ?", [id]);
    const updatedMenu = result[0];

    // 🔄 Emit ke semua client (kasir) via WebSocket
    if (typeof (global as any).io !== "undefined") {
      (global as any).io.emit("menuUpdated", {
        id: updatedMenu.id,
        name: updatedMenu.name,
        type: updatedMenu.type,
        isActive: updatedMenu.isActive,
      });
    }

    return NextResponse.json({
      message: "Status bundle berhasil diperbarui",
      bundle: updatedMenu,
    });
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing bundle id" }, { status: 400 });

  try {
     const [usedInOrder] = await db.query(
      `SELECT id FROM completedOrderItem WHERE menuId = ? LIMIT 1`,
      [id]
    );

    if ((usedInOrder as any[]).length > 0) {
      return NextResponse.json({
        message: "Bundle tidak bisa dihapus karena sudah digunakan dalam transaksi",
      }, { status: 409 });
    }
    // Hapus terlebih dahulu relasi yang terkait
    await db.query("DELETE FROM menuComposition WHERE bundleId = ?", [id]);
    await db.query("DELETE FROM menuModifier WHERE menuId = ?", [id]);
    await db.query("DELETE FROM menuDiscount WHERE menuId = ?", [id]);
    await db.query("DELETE FROM menuIngredient WHERE menuId = ?", [id]);

    // Hapus data menu dari tabel utama
    const [result]: any = await db.query("DELETE FROM menu WHERE id = ?", [id]);

    return NextResponse.json({
      message: "Bundle/menu deleted permanently",
      menuId: id,
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting bundle:", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}

