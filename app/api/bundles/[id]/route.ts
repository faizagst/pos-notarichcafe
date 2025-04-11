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
  const { id } = await context.params; // 👈 ini kuncinya!
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
        end: () => {},
        setHeader: () => {},
        getHeader: () => {},
      };

      await runMiddleware(mockReq, mockRes, uploadMiddleware);

      const { name, description, price, includedMenus } = mockReq.body;
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

      if (imageUrl) {
        fields.push("image = ?");
        values.push(imageUrl);
      }

      values.push(id);
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

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; // 👈 juga pakai await
  if (!id) return NextResponse.json({ message: "Missing bundle id" }, { status: 400 });

  try {
    await db.execute("UPDATE menu SET isActive = false WHERE id = ?", [id]);
    const [result]: any = await db.query("SELECT * FROM menu WHERE id = ?", [id]);

    return NextResponse.json({
      message: "Bundle deleted successfully",
      bundle: result[0],
    });
  } catch (error) {
    console.error("Error deleting bundle:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
