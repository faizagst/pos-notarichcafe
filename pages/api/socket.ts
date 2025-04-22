// pages/api/socket.ts
import { Server as IOServer } from "socket.io";
import { Server as HttpServer } from "http";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Socket as NetSocket } from "net";

interface CustomSocket extends NetSocket {
  server: HttpServer & {
    io?: IOServer;
  };
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket) {
    console.error("Socket is not available on the response object");
    return res.status(500).json({ message: "Socket is not available" });
  }

  const socket = res.socket as CustomSocket;

  if (!socket.server.io) {
    console.log("🧠 Menginisialisasi WebSocket server...");

    const io = new IOServer(socket.server, {
      path: "/api/socket",
    });

    // Simpan ke server dan global agar bisa digunakan di tempat lain
    socket.server.io = io;
    (global as any).io = io;

    io.on("connection", (socket) => {
      console.log("🔌 Client terhubung:", socket.id);

      // Tangkap event menuUpdated dari API
      socket.on("menuUpdated", (data) => {
        console.log("📢 Menu telah diperbarui", data);
        io.emit("menuUpdated", data);  // Mengirimkan informasi menu yang diperbarui ke semua client
      });

      socket.on("reservationAdded", (newReservasi) => {
        io.emit("reservationAdded", newReservasi);
      });

      socket.on("reservationUpdated", (updatedReservasi) => {
        io.emit("reservationUpdated", updatedReservasi);
      });

      socket.on("reservationDeleted", ({ reservasiId, orderIds }) => {
        io.emit("reservationDeleted", { reservasiId, orderIds });
      });

      socket.on("ordersUpdated", (data) => {
        io.emit("ordersUpdated", data);
      });

      socket.on("paymentStatusUpdated", (updatedOrder) => {
        io.emit("paymentStatusUpdated", updatedOrder);
      });

      socket.on("disconnect", () => {
        console.log("Client terputus:", socket.id);
      });
    });

    console.log("✅ WebSocket server berhasil diinisialisasi");
  } else {
    console.log("🟡 WebSocket server sudah berjalan");
  }

  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};
