"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiBell } from "react-icons/fi";
import { AlertTriangle, ShoppingCart, X } from "lucide-react";
import { useNotifications, MyNotification } from "../../contexts/NotificationContext";
import CombinedPaymentForm from "@/components/cashier/CombinedPaymentForm";
import { jsPDF } from "jspdf";
import io from "socket.io-client";
// import { useRouter } from "next/navigation";

interface Menu {
  id: number;
  name: string;
  type: string;
  description?: string;
  image: string;
  price: number;
  category: string;
  Status: string;
  discounts: { discount: Discount }[];
  modifiers: Modifier[];
  maxBeli: number;
  isActive: boolean;
  bundleCompositions: {
    id: number;
    bundleId: number;
    menuId: number;
    amount: number;
    menu: {
      id: number;
      name: string;
      category: string;
      // Tambahkan field lain dari Menu jika diperlukan
    };
  }[];
}

interface Discount {
  id: number;
  name: string;
  type: "PERCENTAGE" | "NORMAL";
  scope: "MENU" | "TOTAL";
  value: number;
  isActive: boolean;
}

interface OrderItem {
  id: number;
  menuId: number;
  quantity: number;
  note?: string;
  price: number;
  discountAmount: number;
  menu: Menu;
  modifiers: {
    id: number;
    modifierId: number;
    modifier: {
      id: number;
      name: string;
      price: number;
      category: {
        id: number;
        name: string;
      };
    };
  }[];
}

export interface Order {
  id: number | string;
  customerName: string;
  tableNumber: string;
  total: number;
  discountId?: number;
  discountAmount: number;
  taxAmount: number;
  gratuityAmount: number;
  finalTotal: number;
  status: string;
  paymentMethod?: string;
  paymentId?: string;
  cashGiven?: number;
  change?: number;
  createdAt: string;
  orderItems: OrderItem[];
  discount?: Discount;
  paymentStatus?: string;
  paymentStatusText?: string; // Properti baru
  reservasi?: {
    id: number;
    kodeBooking: string;
  };
}
interface Ingredient {
  id: number;
  name: string;
  stock: number;
  unit: string;
}

interface Modifier {
  modifier: {
    id: number;
    name: string;
    price: number;
    category: {
      id: number;
      name: string;
    };
  };
}

interface CartItem {
  menu: Menu;
  quantity: number;
  note: string;
  modifierIds: { [categoryId: number]: number | null };
  uniqueKey: string;
}

const SOCKET_URL = "http://localhost:3000";

export default function KasirPage() {
  // const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [actualStocks, setActualStocks] = useState<Record<number, number>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const { notifications, setNotifications } = useNotifications();
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedMenuItems, setSelectedMenuItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [tableNumberInput, setTableNumberInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isNewOrderPaymentModalOpen, setIsNewOrderPaymentModalOpen] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("tunai");
  const [paymentId, setPaymentId] = useState<string>("");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [change, setChange] = useState<number>(0);
  const [selectedDiscountIdNewOrder, setSelectedDiscountIdNewOrder] = useState<number | null>(null);
  const [pendingOrderData, setPendingOrderData] = useState<{
    customerName: string;
    tableNumber: string;
    items: { menuId: number; quantity: number; note: string; modifierIds?: number[] }[];
    total: number;
  } | null>(null);
  const [isModifierPopupOpen, setIsModifierPopupOpen] = useState(false);
  const [currentMenu, setCurrentMenu] = useState<Menu | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<number[]>([]);
  const [isDiscountPopupOpen, setIsDiscountPopupOpen] = useState(false);

  const unreadCount = notifications.filter((notif) => !notif.isRead).length;
  const [isPaymentMethodPopupOpen, setIsPaymentMethodPopupOpen] = useState(false);
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
   useEffect(() => {
      const fetchUser = async () => {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser({
            username: data.user.username,
            role: data.user.role,
          });
        }
      };
      fetchUser();
    }, []);

  const handleResetDailyStock = async () => {
    const confirmed = confirm("Apakah Anda yakin ingin mereset stok harian?");
    if (!confirmed) return;
    try {
      const res = await fetch("/api/rekap/dailyStock", { method: "POST" });
      const result = await res.json();
      alert(result.message);
      if (res.ok) {
        toast.success("berhasil rekap stok cafe");
      }
    } catch (error) {
      console.error("Error resetting daily stock:", error);
    }
  };

  const handleResetDailyStockGudang = async () => {
    const confirmed = confirm("Apakah Anda yakin ingin mereset stok harian?");
    if (!confirmed) return;
    try {
      const res = await fetch("/api/rekap/stockRoom", {
        method: "POST",
      });
      const result = await res.json();
      alert(result.message);
      if (res.ok) {
        toast.success("berhasil rekap stok gudang");
      }
    } catch (error) {
      console.error("Error resetting daily stock:", error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/orders");
      if (!response.ok) throw new Error("Gagal mengambil data pesanan");
      const data = await response.json();
      setOrders(data.orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError("Gagal memuat data pesanan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Perbarui useEffect untuk WebSocket
  useEffect(() => {
    const fetchMenusAndDiscounts = async () => {
      try {
        const menuResponse = await fetch("/api/getMenu");
        if (!menuResponse.ok) throw new Error(`Failed to fetch menus: ${menuResponse.status}`);
        const menuData = await menuResponse.json();
        setMenus(menuData);
  
        const discountResponse = await fetch("/api/discount");
        if (!discountResponse.ok) throw new Error(`Failed to fetch discounts: ${discountResponse.status}`);
        const discountData = await discountResponse.json();
        setDiscounts(discountData.filter((d: Discount) => d.isActive));
      } catch (error) {
        console.error("Error fetching menus or discounts:", error);
      }
    };
  
    fetchMenusAndDiscounts();
    fetchOrders();
  
    const socketIo = io(SOCKET_URL, {
      path: "/api/socket",
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 5000,
    });
  
    socketIo.on("connect", () => console.log("Terhubung ke WebSocket server:", socketIo.id));
  
    socketIo.on("menuUpdated", (data) => {
      console.log("Menu telah diperbarui:", data);
      
      setMenus((prevMenus) =>
        prevMenus.map((menu) =>
          menu.id === data.menuId
            ? { ...menu, Status: data.Status, isActive: data.isActive }  
            : menu
        )
      );
      fetchMenusAndDiscounts();
    });
  
    socketIo.on("ordersUpdated", (data: any) => {
      console.log("Pesanan diperbarui di Kasir:", data);
      fetchOrders();
    });
  
    socketIo.on("paymentStatusUpdated", (updatedOrder: Order) => {
      console.log("Status pembayaran diperbarui:", updatedOrder);
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === updatedOrder.id
            ? {
              ...order,
              ...updatedOrder,
              paymentStatusText:
                updatedOrder.paymentStatus === "paid" && updatedOrder.paymentMethod === "ewallet"
                  ? "Status Payment: Paid via E-Wallet"
                  : order.paymentStatusText,
            }
            : order
        )
      );
    });
  
    socketIo.on("reservationDeleted", ({ reservasiId, orderId }) => {
      console.log("Reservasi dihapus di Kasir:", { reservasiId, orderId });
      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId));
      fetchOrders();
    });
  
    socketIo.on("reservationUpdated", (updatedReservasi) => {
      console.log("Reservasi diperbarui:", updatedReservasi);
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.reservasi?.id === updatedReservasi.id
            ? { ...order, reservasi: updatedReservasi }
            : order
        )
      );
    });
  
    socketIo.on("tableStatusUpdated", ({ tableNumber }) => {
      console.log(`Status meja diperbarui di Kasir: ${tableNumber}`);
      fetchOrders();
    });
  
    socketIo.on("disconnect", () => console.log("Socket terputus"));
  
    setSocket(socketIo);
  
    return () => {
      socketIo.disconnect();
      console.log("WebSocket disconnected");
    };
  }, []);
  

  const confirmPayment = async (
    orderId: number,
    paymentMethod: string,
    paymentId?: string,
    discountId?: number | null,
    cashGiven?: number,
    change?: number
  ) => {
    setLoading(true);
    setError(null);
    try {
      if (paymentMethod === "tunai" && cashGiven !== undefined && change !== undefined) {
        await updateCartWithPayment(cashGiven.toString(), change);
      }

      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentMethod,
          paymentId: paymentMethod !== "tunai" ? paymentId : null,
          discountId: discountId || null,
          cashGiven,
          change,
          status: "Sedang Diproses", // Ubah status menjadi "Sedang Diproses" setelah konfirmasi
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Gagal mengonfirmasi pembayaran");
      }

      const data = await res.json();
      const updatedOrder = data.updatedOrder;

      setOrders((prevOrders) =>
        prevOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
      );
      toast.success("Pembayaran berhasil dikonfirmasi!");
      printKitchenAndBarOrders(updatedOrder);
      setPaymentMethod("tunai");
      setPaymentId("");
      setCashGiven("");
      setChange(0);
    } catch (error) {
      console.error("Error:", error);
      setError("Gagal mengonfirmasi pembayaran. Silakan coba lagi.");
      toast.error("Gagal mengonfirmasi pembayaran");
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = (uniqueKey: string) => {
    setSelectedMenuItems((prev) => {
      const updatedCart = prev
        .map((item) =>
          item.uniqueKey === uniqueKey
            ? { ...item, quantity: Math.max(0, item.quantity - 1) }
            : item
        )
        .filter((item) => item.quantity > 0);

      fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItems: updatedCart }),
      })
        .then((res) => res.json())
        .then((data) => console.log("Cart updated after removal:", data))
        .catch((err) => console.error("Error updating cart:", err));

      return updatedCart;
    });
  };

  const markOrderAsCompleted = async (orderId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/completeOrder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Gagal menyelesaikan pesanan");
      }

      toast.success("Pesanan berhasil diselesaikan dan tercatat di riwayat!");
      fetchOrders();
      if (socket) {
        socket.emit("orderCompleted", { orderId });
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Terjadi kesalahan saat menyelesaikan pesanan.");
    } finally {
      setLoading(false);
    }
  };

  const updateCartWithPayment = async (cashGiven: string, change: number) => {
    try {
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: selectedMenuItems,
          cashGiven: parseFloat(cashGiven) || 0,
          change,
        }),
      });
    } catch (error) {
      console.error("Error updating cart with payment info:", error);
    }
  };

  const generateUniqueKey = (menuId: number, modifierIds: { [categoryId: number]: number | null }) => {
    return `${menuId}-${JSON.stringify(modifierIds)}`;
  };

  const addToCart = (menu: Menu, modifierIds: { [categoryId: number]: number | null } = {}) => {
    setSelectedMenuItems((prevCart) => {
      const uniqueKey = generateUniqueKey(menu.id, modifierIds);
      const existingItemIndex = prevCart.findIndex(
        (item) => item.uniqueKey === uniqueKey
      );
  
      const maxBeli = menu.maxBeli ?? Infinity; // Jika tidak ada, default ke tak terbatas
  
      let updatedCart;
  
      if (existingItemIndex !== -1) {
        const existingItem = prevCart[existingItemIndex];
        if (existingItem.quantity >= maxBeli) {
          // Bisa munculkan toast di sini
          alert(`Maksimum pembelian untuk ${menu.name} adalah ${maxBeli}`);
          return prevCart;
        }
  
        updatedCart = prevCart.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        updatedCart = [...prevCart, {
          menu,
          quantity: 1,
          note: "",
          modifierIds,
          uniqueKey,
        }];
      }
  
      fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItems: updatedCart }),
      })
        .then((res) => res.json())
        .then((data) => console.log("Cart sent to API:", data))
        .catch((err) => console.error("Error sending cart:", err));
  
      return updatedCart;
    });
  };
  

  const handleModifierToggle = (modifierId: number) => {
    setSelectedModifiers((prev) =>
      prev.includes(modifierId)
        ? prev.filter((id) => id !== modifierId)
        : [...prev, modifierId]
    );
  };

  const saveModifiersToCart = () => {
    if (currentMenu) {
      const modifierIds: { [categoryId: number]: number | null } = {};
      selectedModifiers.forEach((modifierId) => {
        const modifier = currentMenu.modifiers.find((m) => m.modifier.id === modifierId);
        if (modifier) {
          modifierIds[modifier.modifier.category.id] = modifierId;
        }
      });
      addToCart(currentMenu, modifierIds);
    }
    setIsModifierPopupOpen(false);
    setSelectedModifiers([]);
    setCurrentMenu(null);
  };

  const handleNewOrderPayment = async (
    paymentMethod: string,
    paymentId?: string,
    cashGiven?: number,
    change?: number
  ) => {
    if (!pendingOrderData) return;

    setLoading(true);
    try {
      if (paymentMethod === "tunai" && cashGiven !== undefined && change !== undefined) {
        await updateCartWithPayment(cashGiven.toString(), change);
      }

      const response = await fetch("/api/placeOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: pendingOrderData.customerName,
          tableNumber: pendingOrderData.tableNumber,
          items: pendingOrderData.items,
          total: pendingOrderData.total,
          isCashierOrder: true,
          discountId: selectedDiscountIdNewOrder || null,
          paymentMethod: paymentMethod === "e-wallet" ? "ewallet" : paymentMethod,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal membuat pesanan");
      }

      const data = await response.json();
      const newOrder = data.order;

      const finalPaymentMethod = paymentMethod === "e-wallet" ? "ewallet" : paymentMethod;
      await confirmPayment(
        newOrder.id,
        finalPaymentMethod,
        paymentId,
        selectedDiscountIdNewOrder,
        cashGiven,
        change
      );

      if (finalPaymentMethod === "ewallet") {
        await fetch("/api/updatePaymentStatus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: newOrder.id,
            paymentMethod: "ewallet",
            paymentStatus: "paid",
            paymentId: paymentId || newOrder.paymentId,
            status: "paid",
          }),
        });

        // Set status pembayaran untuk E-Wallet
        setOrders((prevOrders) =>
          prevOrders.map((o) =>
            o.id === newOrder.id ? { ...o, paymentStatusText: "Status Payment: Paid via E-Wallet" } : o
          )
        );
      }

      setPendingOrderData(null);
      setPendingOrderId(null);
      setSelectedMenuItems([]);
      setCustomerName("");
      setTableNumberInput("");
      setPaymentMethod("tunai");
      setPaymentId("");
      setCashGiven("");
      setChange(0);
      setSelectedDiscountIdNewOrder(null);

      setTimeout(async () => {
        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartItems: [], cashGiven: 0, change: 0 }),
        });
      }, 5000);

      setIsNewOrderPaymentModalOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error confirming new order payment:", error);
      toast.error(" Gagal mengonfirmasi pesanan dan pembayaran");
    } finally {
      setLoading(false);
    }
  };
  const calculateChange = (given: string) => {
    const total = pendingOrderData?.total || 0;
    const givenNumber = parseFloat(given) || 0;
    const changeAmount = givenNumber - total;
    setChange(changeAmount >= 0 ? changeAmount : 0);
    return changeAmount >= 0 ? changeAmount : 0;
  };

  const cancelOrder = async (orderId: number) => {
    setLoading(true);
    setError(null);
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new Error("Pesanan tidak ditemukan");

      const isReservation = !!order.reservasi;
      const endpoint = isReservation ? "/api/resetBookingOrder" : "/api/resetTable";
      const body = isReservation ? { orderId } : { tableNumber: order.tableNumber };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Gagal membatalkan pesanan");
      }

      toast.success("Pesanan berhasil dibatalkan!");
      setOrders((prevOrders) => prevOrders.filter((o) => o.id !== orderId));

      // Emit event WebSocket secara manual jika tidak ditangani oleh API
      if (socket) {
        if (isReservation) {
          socket.emit("reservationDeleted", { reservasiId: order.reservasi?.id, orderId });
        }
        socket.emit("ordersUpdated", { deletedOrderId: orderId });
        socket.emit("tableStatusUpdated", { tableNumber: order.tableNumber });
      }
      console.log(`Cancel order ${orderId} - Reservation: ${isReservation}, Table: ${order.tableNumber}`); // Debug
    } catch (error) {
      console.error("Error cancelling order:", error);
      setError("Gagal membatalkan pesanan. Silakan coba lagi.");
      toast.error("Gagal membatalkan pesanan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const resetTable = async (tableNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/resetTable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber }),
      });

      if (res.ok) {
        toast.success(`✅ Meja ${tableNumber} berhasil direset!`);
        fetchOrders();
      } else {
        throw new Error("Gagal mereset meja");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("❌ Terjadi kesalahan saat mereset meja. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const calculateItemPrice = (menu: Menu) => {
    let basePrice = menu.price;
    const activeDiscount = menu.discounts?.find((d) => d.discount.isActive && d.discount.scope === "MENU");
    if (activeDiscount) {
      basePrice -=
        activeDiscount.discount.type === "PERCENTAGE"
          ? (activeDiscount.discount.value / 100) * menu.price
          : activeDiscount.discount.value;
    }
    return basePrice > 0 ? basePrice : 0;
  };

  const calculateCartTotals = () => {
    let subtotal = 0;
    let totalMenuDiscountAmount = 0;
    let totalModifierCost = 0;

    selectedMenuItems.forEach((item) => {
      const originalPrice = item.menu.price;
      const discountedPrice = calculateItemPrice(item.menu);
      subtotal += originalPrice * item.quantity;
      totalMenuDiscountAmount += (originalPrice - discountedPrice) * item.quantity;

      Object.entries(item.modifierIds).forEach(([_, modifierId]) => {
        if (modifierId) {
          const modifier = item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier;
          if (modifier) totalModifierCost += modifier.price * item.quantity;
        }
      });
    });

    const subtotalAfterMenuDiscount = subtotal - totalMenuDiscountAmount;
    const subtotalWithModifiers = subtotalAfterMenuDiscount + totalModifierCost;

    let totalDiscountAmount = totalMenuDiscountAmount;
    if (selectedDiscountIdNewOrder) {
      const selectedDiscount = discounts.find((d) => d.id === selectedDiscountIdNewOrder);
      if (selectedDiscount && selectedDiscount.scope === "TOTAL") {
        const additionalDiscount =
          selectedDiscount.type === "PERCENTAGE"
            ? (selectedDiscount.value / 100) * subtotalWithModifiers
            : selectedDiscount.value;
        totalDiscountAmount += additionalDiscount;
      }
    }

    totalDiscountAmount = Math.min(totalDiscountAmount, subtotalWithModifiers);

    const subtotalAfterAllDiscounts = subtotalWithModifiers - (totalDiscountAmount - totalMenuDiscountAmount);
    const taxAmount = subtotalAfterAllDiscounts * 0.10;
    const gratuityAmount = subtotalAfterAllDiscounts * 0.02;
    const finalTotal = subtotalAfterAllDiscounts + taxAmount + gratuityAmount;

    return {
      subtotal,
      totalMenuDiscountAmount,
      totalModifierCost,
      totalDiscountAmount,
      taxAmount,
      gratuityAmount,
      finalTotal,
    };
  };

  const activeOrders = orders.filter((order) => order.status !== "Selesai");
  const completedOrders = orders.filter((order) => order.status === "Selesai");

  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const res = await fetch("/api/ingredients");
        const data = await res.json();
        setIngredients(data);
      } catch (error) {
        console.error("Error fetching ingredients:", error);
      }
    };
    fetchIngredients();
  }, []);

  const handleInputChange = (id: number, value: number) => {
    setActualStocks((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm("Periksa input Anda sebelum menekan Yes, perubahan tidak akan bisa diganti!")) {
      return;
    }
    const newNotifs: MyNotification[] = [];
    ingredients.forEach((ingredient) => {
      const actual = actualStocks[ingredient.id];
      if (actual !== undefined && actual !== ingredient.stock) {
        const diff = actual - ingredient.stock;
        const message = `Selisih untuk ${ingredient.name} adalah ${diff} ${ingredient.unit}.`;
        const date = new Date().toLocaleString();
        newNotifs.push({ message, date, isRead: false });
        toast.success("Berhasil Validasi Stock Nyata", { position: "top-right" });
        toast.error(message, { position: "top-right" });
      }
    });
    if (newNotifs.length > 0) {
      setNotifications([...notifications, ...newNotifs]);
    }
    setModalOpen(false);
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((notif) => ({ ...notif, isRead: true }))
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#FFFAF0] to-[#FFE4C4]">
      <div className={`h-full fixed`}>
      </div>
      <div className={`flex-1 p-6`}>

        <h1 className="text-3xl font-bold text-center mb-6 text-[#0E0E0E]">💳 Halaman Kasir</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => setNotificationModalOpen(true)} className="relative">
            <FiBell className="text-3xl text-[#FF8A00]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setIsOrderModalOpen(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            Buat Pesanan Baru
          </button>
        </div>

        {isOrderModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Buat Pesanan Baru</h2>
                <button onClick={() => setIsOrderModalOpen(false)}>
                  <X className="w-6 h-6 text-gray-600 hover:text-red-500" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Nomor Meja</label>
                  <input
                    type="text"
                    value={tableNumberInput}
                    onChange={(e) => setTableNumberInput(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="Masukkan nomor meja"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nama Pelanggan</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="Masukkan nama pelanggan"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Cari Menu</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Cari nama menu..."
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Filter Kategori</label>
                <select
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Semua Kategori</option>
                  {Array.from(new Set(menus.map((menu) => menu.category))).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {menus
                  .filter((menu) => {
                    const statusLower = menu.Status?.toLowerCase();
                    const isAvailable = statusLower === 'tersedia' && menu.maxBeli > 0;
                    if (!isAvailable || !menu.isActive) return false;
                    if (selectedCategory && menu.category !== selectedCategory) return false;
                    if (searchQuery && !menu.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                    return true;
                  })
                  .map((menu) => {
                    const discountedPrice = calculateItemPrice(menu);
                    return (
                      <div key={menu.id} className="border p-4 rounded-lg flex flex-col items-center justify-between">
                        <img src={menu.image} alt={menu.name} className="w-24 h-24 object-cover rounded-full mb-2" />
                        <h3 className="font-semibold text-center">{menu.name}</h3>
                        <div className="text-center">
                          {discountedPrice < menu.price ? (
                            <>
                              <p className="text-sm text-gray-500 line-through">Rp {menu.price.toLocaleString()}</p>
                              <p className="text-sm font-semibold text-green-600">Rp {discountedPrice.toLocaleString()}</p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-600">Rp {menu.price.toLocaleString()}</p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setCurrentMenu(menu);
                            setSelectedModifiers([]);
                            setIsModifierPopupOpen(true);
                          }}
                          className="mt-2 bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
                        >
                          Tambah
                        </button>
                      </div>
                    );
                  })}
              </div>

              <div className="mt-6 border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Keranjang Pesanan</h3>
                {selectedMenuItems.map((item) => {
                  const basePriceAfterDiscount = calculateItemPrice(item.menu);
                  let modifierTotal = 0;
                  Object.entries(item.modifierIds).forEach(([_, modifierId]) => {
                    if (modifierId) {
                      const modifier = item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier;
                      if (modifier) modifierTotal += modifier.price;
                    }
                  });
                  const itemPrice = basePriceAfterDiscount + modifierTotal;
                  const itemTotalPrice = itemPrice * item.quantity;
                  const modifierNames = Object.entries(item.modifierIds)
                    .map(([_, modifierId]) =>
                      modifierId ? item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier.name : null
                    )
                    .filter(Boolean)
                    .join(", ");
                  const itemNameWithModifiers = modifierNames ? `${item.menu.name} (${modifierNames})` : item.menu.name;

                  return (
                    <div key={item.uniqueKey} className="flex justify-between items-center mb-3 p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="font-medium">{itemNameWithModifiers}</p>
                        <p className="text-sm text-gray-600">
                          Rp {itemPrice.toLocaleString()} x {item.quantity}
                        </p>
                        <input
                          type="text"
                          placeholder="Catatan..."
                          value={item.note}
                          onChange={(e) => {
                            setSelectedMenuItems((prev) =>
                              prev.map((prevItem) =>
                                prevItem.uniqueKey === item.uniqueKey ? { ...prevItem, note: e.target.value } : prevItem
                              )
                            );
                          }}
                          className="text-sm mt-1 p-1 border rounded w-full"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(item.uniqueKey)}
                          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => addToCart(item.menu, item.modifierIds)}
                          disabled={item.quantity >= item.menu.maxBeli}
                          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-4">
                  <div className="text-lg">
                    <p>Subtotal: Rp {calculateCartTotals().subtotal.toLocaleString()}</p>
                    <p>Modifier: Rp {calculateCartTotals().totalModifierCost.toLocaleString()}</p>
                    <p>Diskon: Rp {calculateCartTotals().totalDiscountAmount.toLocaleString()}</p>
                    <p>Pajak (10%): Rp {calculateCartTotals().taxAmount.toLocaleString()}</p>
                    <p>Gratuity (2%): Rp {calculateCartTotals().gratuityAmount.toLocaleString()}</p>
                    <p className="font-semibold">
                      Total Bayar: Rp {calculateCartTotals().finalTotal.toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-2">
                    <label className="block text-sm font-medium mb-1">Diskon Total:</label>
                    <button
                      onClick={() => setIsDiscountPopupOpen(true)}
                      className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition-all font-medium"
                    >
                      {selectedDiscountIdNewOrder
                        ? discounts.find((d) => d.id === selectedDiscountIdNewOrder)?.name || "Pilih Diskon"
                        : "Pilih Diskon"}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (!tableNumberInput || !customerName) {
                        toast.error("Harap isi nomor meja dan nama pelanggan");
                        return;
                      }
                      const totals = calculateCartTotals();
                      setPendingOrderData({
                        customerName,
                        tableNumber: tableNumberInput,
                        items: selectedMenuItems.map((item) => ({
                          menuId: item.menu.id,
                          quantity: item.quantity,
                          note: item.note,
                          modifierIds: Object.values(item.modifierIds).filter((id): id is number => id !== null),
                        })),
                        total: totals.finalTotal,
                      });
                      setIsNewOrderPaymentModalOpen(true);
                      setIsOrderModalOpen(false);
                    }}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md mt-2"
                    disabled={loading}
                  >
                    {loading ? "Menyimpan..." : "Simpan Pesanan"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isNewOrderPaymentModalOpen && pendingOrderData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">Konfirmasi Pembayaran Pesanan Baru</h2>
              <p className="text-lg mb-2">Total Bayar (termasuk pajak & gratuity): Rp {pendingOrderData.total.toLocaleString()}</p>
              <div className="space-y-4">
                <button
                  onClick={() => setIsPaymentMethodPopupOpen(true)}
                  className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition-all font-medium"
                >
                  {paymentMethod === "tunai" ? "Tunai" : paymentMethod === "kartu" ? "Kartu Kredit/Debit" : "E-Wallet"}
                </button>
                {paymentMethod !== "tunai" && (
                  <input
                    type="text"
                    placeholder="Masukkan ID Pembayaran"
                    value={paymentId}
                    onChange={(e) => setPaymentId(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  />
                )}
                {paymentMethod === "tunai" && (
                  <>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Masukkan jumlah pembayaran"
                      value={cashGiven}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^[0-9]*\.?[0-9]*$/.test(value)) {
                          setCashGiven(value);
                          const newChange = calculateChange(value);
                          updateCartWithPayment(value, newChange);
                        }
                      }}
                      className="w-full p-2 border rounded-md"
                    />
                    {change > 0 && (
                      <p className="text-green-600">Kembalian: Rp {change.toLocaleString()}</p>
                    )}
                    {change < 0 && (
                      <p className="text-red-600">Uang yang diberikan kurang: Rp {(-change).toLocaleString()}</p>
                    )}
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setPendingOrderData(null);
                    setIsNewOrderPaymentModalOpen(false);
                    updateCartWithPayment("", 0);
                  }}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    if (paymentMethod === "tunai" && (parseFloat(cashGiven) || 0) < pendingOrderData.total) {
                      toast.error("Uang yang diberikan kurang");
                      return;
                    }
                    handleNewOrderPayment(paymentMethod, paymentId, parseFloat(cashGiven) || 0, change);
                  }}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md"
                >
                  Konfirmasi Pembayaran
                </button>
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-center">{error}</p>}
        {loading ? (
          <p className="text-center text-[#979797]">Memuat data pesanan...</p>
        ) : (
          <div className="max-w-6xl mx-auto space-y-8">
            <OrderSection
              title="📌 Pesanan Aktif"
              orders={activeOrders}
              confirmPayment={confirmPayment}
              markOrderAsCompleted={markOrderAsCompleted}
              cancelOrder={cancelOrder}
              resetTable={resetTable}
              discounts={discounts}
            />
            <OrderSection
              title="✅ Pesanan Selesai"
              orders={completedOrders}
              resetTable={resetTable}
            />
          </div>
        )}
        {/* <div className="flex mt-4">
          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-3 bg-red-500 hover:bg-red-700 text-[#FCFFFC] rounded-lg text-lg font-semibold flex items-center justify-center space-x-2 transition-all duration-300"
          >
            <span>🚪 Closing</span>
          </button>
          <div className="flex items-start bg-[#FCFFFC] border-l-4 border-[#FF8A00] p-3 rounded-md ml-4">
            <AlertTriangle className="text-[#0E0E0E] w-5 h-5 mr-2 mt-1" />
            <p className="text-sm text-[#0E0E0E]">
              <span className="font-semibold text-[#FF8A00]">Perhatian:</span> Tekan tombol{" "}
              <span className="font-semibold text-[#0E0E0E]">Closing</span> hanya pada saat{" "}
              <span className="font-semibold">closing cafe</span>, untuk validasi stok cafe hari ini.
            </p>
          </div>
        </div> */}
        <div className="flex mt-4">

          <button
            onClick={handleResetDailyStock}
            className="mt-4 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition duration-200"
          >
            Rekap Stock Cafe
          </button>

          <div className="flex items-start bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded-md mt-4">
            <AlertTriangle className="text-yellow-700 w-5 h-5 mr-2 mt-1" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-yellow-900">Perhatian:</span>{" "}
              Tekan tombol{" "}
              <span className="font-semibold text-red-600">Rekap Stock Cafe</span>{" "}
              hanya pada saat <span className="font-semibold">closing cafe</span>,
              untuk menyimpan rekap pengeluaran stok Cafe hari ini.
            </p>
          </div>

          <button
            onClick={handleResetDailyStockGudang}
            className="mt-4 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition duration-200"
          >
            Rekap Stock Gudang
          </button>

          <div className="flex items-start bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded-md mt-4">
            <AlertTriangle className="text-yellow-700 w-5 h-5 mr-2 mt-1" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-yellow-900">Perhatian:</span>{" "}
              Tekan tombol{" "}
              <span className="font-semibold text-red-600">Rekap Stock Gudang</span>{" "}
              hanya pada saat <span className="font-semibold">closing cafe</span>,
              untuk menyimpan rekap pengeluaran stok gudang hari ini.
            </p>
          </div>

        </div>


        {modalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="relative bg-white p-8 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-y-auto">
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Input Stock Nyata Bahan</h2>
              <form onSubmit={handleSubmit}>
                {ingredients.map((ingredient) => (
                  <div key={ingredient.id} className="mb-5">
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      {ingredient.name} <span className="text-gray-500">({ingredient.unit})</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Masukkan stok nyata"
                      onChange={(e) => handleInputChange(ingredient.id, Number(e.target.value))}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      required
                    />
                  </div>
                ))}
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow transition"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isPaymentMethodPopupOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Pilih Metode Pembayaran</h2>
                <button
                  onClick={() => setIsPaymentMethodPopupOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-3">
                  {["tunai", "kartu", "e-wallet"].map((method) => (
                    <div
                      key={method}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={paymentMethod === method}
                          onChange={() => {
                            setPaymentMethod(method);
                            setCashGiven("");
                            setChange(0);
                            updateCartWithPayment("", 0);
                            setIsPaymentMethodPopupOpen(false);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-gray-700">
                          {method === "tunai" ? "Tunai" : method === "kartu" ? "Kartu Kredit/Debit" : "E-Wallet"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
                <button
                  onClick={() => setIsPaymentMethodPopupOpen(false)}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all font-medium"
                >
                  Simpan Metode
                </button>
              </div>
            </div>
          </div>
        )}

        {isPaymentMethodPopupOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Pilih Metode Pembayaran</h2>
                <button
                  onClick={() => setIsPaymentMethodPopupOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-3">
                  {["tunai", "kartu", "e-wallet"].map((method) => (
                    <div
                      key={method}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={paymentMethod === method}
                          onChange={() => {
                            setPaymentMethod(method);
                            setCashGiven("");
                            setChange(0);
                            updateCartWithPayment("", 0);
                            setIsPaymentMethodPopupOpen(false);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-gray-700">
                          {method === "tunai" ? "Tunai" : method === "kartu" ? "Kartu Kredit/Debit" : "E-Wallet"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
                <button
                  onClick={() => setIsPaymentMethodPopupOpen(false)}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all font-medium"
                >
                  Simpan Metode
                </button>
              </div>
            </div>
          </div>
        )}

        {notificationModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-[#FCFFFC] p-6 rounded shadow-md w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[#0E0E0E]">Notifications</h2>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="px-4 py-2 bg-[#FF8A00] hover:bg-[#975F2C] text-[#FCFFFC] rounded"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="text-[#0E0E0E]">Tidak ada notifikasi</p>
              ) : (
                <ul className="space-y-2">
                  {notifications.map((notif, idx) => (
                    <li key={idx} className="border-b border-[#92700C] pb-2">
                      <p className="text-[#0E0E0E]">{notif.message}</p>
                      <p className="text-xs text-[#979797]">{notif.date}</p>
                      {!notif.isRead && (
                        <span className="text-xs bg-red-500 text-white rounded px-2 py-0.5">NEW</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setNotificationModalOpen(false)}
                  className="px-4 py-2 bg-[#FF8A00] hover:bg-[#975F2C] text-[#FCFFFC] rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {isModifierPopupOpen && currentMenu && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">
                  Tambah Modifier - {currentMenu.name}
                </h2>
                <button
                  onClick={() => setIsModifierPopupOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto max-h-[300px]"> {/* Batasi tinggi dan tambahkan scroll */}
                <div className="space-y-3">
                  {currentMenu.modifiers.length > 0 ? (
                    currentMenu.modifiers.map((mod) => (
                      <div
                        key={mod.modifier.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedModifiers.includes(mod.modifier.id)}
                            onChange={() => handleModifierToggle(mod.modifier.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-gray-700">{mod.modifier.name}</span>
                        </div>
                        <span className="text-gray-600 text-sm">
                          +Rp {mod.modifier.price.toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center">Tidak ada modifier tersedia</p>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
                <button
                  onClick={saveModifiersToCart}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all font-medium"
                >
                  Simpan Modifier ({selectedModifiers.length} dipilih)
                </button>
              </div>
            </div>
          </div>
        )}

        {isDiscountPopupOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Pilih Diskon Total</h2>
                <button
                  onClick={() => setIsDiscountPopupOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto max-h-[300px]"> {/* Batasi tinggi dan tambahkan scroll */}
                <div className="space-y-3">
                  {discounts.filter((d) => d.scope === "TOTAL").length > 0 ? (
                    discounts
                      .filter((d) => d.scope === "TOTAL")
                      .map((discount) => (
                        <div
                          key={discount.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedDiscountIdNewOrder === discount.id}
                              onChange={() =>
                                setSelectedDiscountIdNewOrder(
                                  selectedDiscountIdNewOrder === discount.id ? null : discount.id
                                )
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />

                            <span className="text-gray-700">{discount.name}</span>
                          </div>
                          <span className="text-gray-600 text-sm">
                            {discount.type === "PERCENTAGE"
                              ? `${discount.value}%`
                              : `Rp ${discount.value.toLocaleString()}`}
                          </span>
                        </div>
                      ))
                  ) : (
                    <p className="text-gray-500 text-center">Tidak ada diskon total tersedia</p>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
                <button
                  onClick={() => setIsDiscountPopupOpen(false)}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all font-medium"
                >
                  Simpan Diskon
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}

function OrderSection({
  title,
  orders,
  confirmPayment,
  markOrderAsCompleted,
  cancelOrder,
  resetTable,
  resetBookingOrder, // Add this prop
  discounts,
}: {
  title: string;
  orders: Order[];
  confirmPayment?: (orderId: number, paymentMethod: string, paymentId?: string, discountId?: number | null, cashGiven?: number, change?: number) => void;
  markOrderAsCompleted?: (id: number) => void;
  cancelOrder?: (id: number) => void;
  resetTable?: (tableNumber: string) => void;
  resetBookingOrder?: (orderId: number) => void; // Add this prop
  discounts?: Discount[];
}) {
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [combinedTotal, setCombinedTotal] = useState<number>(0);
  const [combinedDetails, setCombinedDetails] = useState<{
    subtotal: number;
    modifier: number;
    discount: number;
    tax: number;
    gratuity: number;
  }>({ subtotal: 0, modifier: 0, discount: 0, tax: 0, gratuity: 0 });
  const [isCombinedPaymentModalOpen, setIsCombinedPaymentModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const selectedOrdersData = orders.filter((order) => selectedOrders.includes(Number(order.id)));

    const subtotal = selectedOrdersData.reduce((acc, order) => {
      return acc + order.orderItems.reduce((sum, item) => {
        const basePrice = item.price - (item.modifiers?.reduce((modSum, mod) => modSum + mod.modifier.price, 0) || 0);
        return sum + basePrice * item.quantity;
      }, 0);
    }, 0);

    const modifier = selectedOrdersData.reduce((acc, order) => {
      return acc + (order.orderItems.reduce((sum, item) => {
        return sum + (item.modifiers?.reduce((modSum, mod) => modSum + mod.modifier.price * item.quantity, 0) || 0);
      }, 0));
    }, 0);

    const discount = selectedOrdersData.reduce((acc, order) => acc + (order.discountAmount || 0), 0);
    const subtotalAfterDiscount = subtotal + modifier - discount;
    const tax = subtotalAfterDiscount * 0.10;
    const gratuity = subtotalAfterDiscount * 0.02;
    const finalTotal = subtotalAfterDiscount + tax + gratuity;

    setCombinedDetails({
      subtotal,
      modifier,
      discount,
      tax,
      gratuity,
    });
    setCombinedTotal(finalTotal);
  }, [selectedOrders, orders]);

  const handleOrderSelection = (orderId: number, isChecked: boolean) => {
    if (isChecked) {
      setSelectedOrders((prev) => [...prev, orderId]);
    } else {
      setSelectedOrders((prev) => prev.filter((id) => id !== orderId));
    }
  };

  const handleCombinedPayment = async (
    paymentMethod: string,
    paymentId?: string,
    discountId?: number | null,
    cashGiven?: number,
    change?: number
  ) => {
    const selectedOrdersData = orders.filter((order) => selectedOrders.includes(Number(order.id)));
    if (confirmPayment) {
      for (const order of selectedOrdersData) {
        await confirmPayment(
          Number(order.id),
          paymentMethod,
          paymentId,
          discountId || order.discountId,
          cashGiven,
          change
        );
      }
    }

    const combinedOrder: Order = {
      id: selectedOrdersData.map((o) => o.id).join("-"),
      customerName: "Gabungan Pesanan",
      tableNumber: selectedOrdersData.map((o) => o.tableNumber).join(", "),
      total: combinedDetails.subtotal,
      discountAmount: combinedDetails.discount,
      taxAmount: combinedDetails.tax,
      gratuityAmount: combinedDetails.gratuity,
      finalTotal: combinedTotal,
      paymentMethod,
      orderItems: selectedOrdersData.flatMap((o) => o.orderItems),
      createdAt: new Date().toISOString(),
      status: "Sedang Diproses",
      cashGiven,
      change,
    };

    generateCombinedPDF(combinedOrder);
    setSelectedOrders([]);
    setCombinedTotal(0);
    setCombinedDetails({ subtotal: 0, modifier: 0, discount: 0, tax: 0, gratuity: 0 });
    setIsCombinedPaymentModalOpen(false);
  };

  const groupedOrders = orders.reduce((acc, order) => {
    const tableNumber = order.tableNumber;
    if (!acc[tableNumber]) {
      acc[tableNumber] = [];
    }
    acc[tableNumber].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      {orders.length === 0 ? (
        <p className="text-gray-500">Tidak ada pesanan.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedOrders).map(([tableNumber, tableOrders]) => (
            <div key={tableNumber} className="bg-white shadow-md rounded-lg p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Meja {tableNumber}</h3>
                {resetTable && title === "✅ Pesanan Selesai" && (
                  <button
                    onClick={() => resetTable(tableNumber)}
                    className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md transition"
                  >
                    ⟳ Reset Meja
                  </button>
                )}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {tableOrders.map((order: Order) => (
                  <OrderItemComponent
                    key={order.id}
                    order={order}
                    confirmPayment={confirmPayment}
                    markOrderAsCompleted={markOrderAsCompleted}
                    cancelOrder={cancelOrder}
                    onSelectOrder={handleOrderSelection}
                    isSelected={selectedOrders.includes(Number(order.id))}
                    discounts={discounts || []}
                    resetBookingOrder={resetBookingOrder} // Pass the prop
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {selectedOrders.length > 0 && (
        <div className="mt-4">
          <p className="text-lg font-semibold">
            Total Gabungan: Rp {combinedTotal.toLocaleString()}
          </p>
          <button
            onClick={() => setIsCombinedPaymentModalOpen(true)}
            className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white py-2 rounded-md transition flex items-center justify-center"
          >
            💰 Gabungkan Pesanan
          </button>
        </div>
      )}
      {isCombinedPaymentModalOpen && (
        <CombinedPaymentForm
          total={combinedTotal}
          details={combinedDetails}
          onConfirmPayment={handleCombinedPayment}
          onCancel={() => {
            setSelectedOrders([]);
            setCombinedTotal(0);
            setCombinedDetails({ subtotal: 0, modifier: 0, discount: 0, tax: 0, gratuity: 0 });
            setIsCombinedPaymentModalOpen(false);
          }}
          discounts={discounts}
        />
      )}
    </div>
  );
}
function OrderItemComponent({
  order,
  confirmPayment,
  markOrderAsCompleted,
  cancelOrder,
  onSelectOrder,
  isSelected,
  discounts,
  resetBookingOrder,
}: {
  order: Order;
  confirmPayment?: (orderId: number, paymentMethod: string, paymentId?: string, discountId?: number | null, cashGiven?: number, change?: number) => void;
  markOrderAsCompleted?: (id: number) => void;
  cancelOrder?: (id: number) => void;
  onSelectOrder?: (orderId: number, isChecked: boolean) => void;
  isSelected?: boolean;
  discounts: Discount[];
  resetBookingOrder?: (orderId: number) => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<string>(order.paymentMethod || "tunai");
  const [paymentId, setPaymentId] = useState<string>(order.paymentId || "");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [change, setChange] = useState<number>(0);
  const [confirmation, setConfirmation] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [selectedDiscountId, setSelectedDiscountId] = useState<number | null>(order.discountId || null);
  const [isDiscountPopupOpen, setIsDiscountPopupOpen] = useState(false);
  const [isPaymentMethodPopupOpen, setIsPaymentMethodPopupOpen] = useState(false);
  const [paymentStatusText, setPaymentStatusText] = useState<string>(order.paymentStatusText || "");

  const isPaidOrder = order.status === "paid" || (order.paymentStatus === "paid" && order.paymentMethod === "ewallet");

  const calculateTotals = (discountId: number | null) => {
    let subtotal = 0;
    let totalModifierCost = 0;
    let totalMenuDiscountAmount = order.orderItems.reduce((sum, item) => sum + item.discountAmount, 0);

    order.orderItems.forEach((item) => {
      const basePrice = item.price - (item.modifiers?.reduce((sum, mod) => sum + mod.modifier.price, 0) || 0);
      subtotal += basePrice * item.quantity;
      totalModifierCost += (item.modifiers?.reduce((sum, mod) => sum + mod.modifier.price * item.quantity, 0) || 0);
    });

    let totalDiscountAmount = totalMenuDiscountAmount;

    if (discountId) {
      const selectedDiscount = discounts.find((d) => d.id === discountId);
      if (selectedDiscount && selectedDiscount.scope === "TOTAL") {
        const baseForDiscount = subtotal + totalModifierCost - totalMenuDiscountAmount;
        const additionalDiscount =
          selectedDiscount.type === "PERCENTAGE"
            ? (selectedDiscount.value / 100) * baseForDiscount
            : selectedDiscount.value;
        totalDiscountAmount += additionalDiscount;
      }
    }

    totalDiscountAmount = Math.min(totalDiscountAmount, subtotal + totalModifierCost);

    const baseForTaxAndGratuity = subtotal + totalModifierCost - totalDiscountAmount;
    const taxAmount = baseForTaxAndGratuity * 0.10;
    const gratuityAmount = baseForTaxAndGratuity * 0.02;
    const finalTotal = baseForTaxAndGratuity + taxAmount + gratuityAmount;

    return {
      subtotal,
      totalModifierCost,
      totalDiscountAmount,
      taxAmount,
      gratuityAmount,
      finalTotal,
    };
  };

  const totals = calculateTotals(selectedDiscountId);

  useEffect(() => {
    const newTotals = calculateTotals(selectedDiscountId);
    setLocalDiscountAmount(newTotals.totalDiscountAmount);
    setLocalFinalTotal(newTotals.finalTotal);
    setLocalTaxAmount(newTotals.taxAmount);
    setLocalGratuityAmount(newTotals.gratuityAmount);
  }, [selectedDiscountId, order]);

  const [localDiscountAmount, setLocalDiscountAmount] = useState<number>(totals.totalDiscountAmount);
  const [localFinalTotal, setLocalFinalTotal] = useState<number>(totals.finalTotal);
  const [localTaxAmount, setLocalTaxAmount] = useState<number>(totals.taxAmount);
  const [localGratuityAmount, setLocalGratuityAmount] = useState<number>(totals.gratuityAmount);

  const calculateChange = (given: string) => {
    const total = localFinalTotal;
    const givenNumber = parseFloat(given) || 0;
    const changeAmount = givenNumber - total;
    setChange(changeAmount >= 0 ? changeAmount : 0);
  };

  const handleCashGivenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(value)) {
      setCashGiven(value);
      calculateChange(value);
    }
  };

  const handlePaymentMethodSelect = (method: string) => {
    setPaymentMethod(method);
    setCashGiven("");
    setChange(0);
    setIsPaymentMethodPopupOpen(false);
  };

  const handleConfirmPayment = () => {
    if (paymentMethod === "tunai") {
      const given = parseFloat(cashGiven) || 0;
      if (given < localFinalTotal) {
        toast.error("Uang yang diberikan kurang");
        return;
      }
    }
    confirmPayment?.(Number(order.id), paymentMethod, paymentId, selectedDiscountId, Number(cashGiven), change);
    if (paymentMethod === "ewallet") {
      setPaymentStatusText("Status Payment: Paid via E-Wallet");
    } else if (paymentMethod === "tunai") {
      setPaymentStatusText("Status Payment: Paid via Cash");
    } else if (paymentMethod === "kartu") {
      setPaymentStatusText("Status Payment: Paid via Card");
    }
  };

  return (
    <div className="bg-[#FF8A00] p-3 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-medium">Order ID: {order.id}</h4>
          {order.reservasi?.kodeBooking && (
            <p className="text-sm text-white">Kode Booking: {order.reservasi.kodeBooking}</p>
          )}
          <p className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 px-4 py-2 rounded shadow-md">
            Customer: {order.customerName}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-2 text-gray-700">
        <p>Subtotal: <span className="font-semibold">Rp {totals.subtotal.toLocaleString()}</span></p>
        <p>Modifier: <span className="font-semibold">Rp {totals.totalModifierCost.toLocaleString()}</span></p>
        <p>Diskon: <span className="font-semibold">Rp {localDiscountAmount.toLocaleString()}</span></p>
        <p>Pajak: <span className="font-semibold">Rp {localTaxAmount.toLocaleString()}</span></p>
        <p>Gratuity: <span className="font-semibold">Rp {localGratuityAmount.toLocaleString()}</span></p>
        <p className="font-semibold">
          Total Bayar: Rp {localFinalTotal.toLocaleString()}
        </p>
      </div>
      <ul className="mt-3 space-y-1">
        {order.orderItems.map((item) => (
          <li key={item.id} className="flex items-center space-x-2">
            <img src={item.menu.image} alt={item.menu.name} className="w-8 h-8 object-cover rounded" />
            <span>
              {item.menu.name} - {item.quantity} pcs
              {item.discountAmount > 0 && (
                <span className="block text-sm text-green-600">
                  Diskon: Rp {(item.discountAmount / item.quantity).toLocaleString()} per item
                </span>
              )}
              {item.note && (
                <span className="block text-sm text-gray-600">Catatan: {item.note}</span>
              )}
              {item.modifiers && item.modifiers.length > 0 && (
                <span className="block text-sm text-gray-600">
                  Modifier: {item.modifiers.map((mod) => `${mod.modifier.name} (Rp${mod.modifier.price.toLocaleString()})`).join(", ")}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {isPaidOrder && order.status !== "Sedang Diproses" && order.status !== "Selesai" && (
        <div className="mt-4 space-y-2">
          {/* Tampilkan status pembayaran */}
          {(paymentStatusText || (order.paymentStatus === "paid" && order.paymentMethod === "ewallet")) && (
            <p className="text-green-600 font-semibold">
              {paymentStatusText || "Status Payment: Paid via E-Wallet"}
            </p>
          )}
          <button
            onClick={() => {
              confirmPayment?.(Number(order.id), order.paymentMethod || "ewallet", order.paymentId, selectedDiscountId);
              printKitchenAndBarOrders(order);
            }}
            className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white py-2 rounded-md transition"
          >
            💰 Konfirmasi Pembayaran
          </button>
          <button
            onClick={() =>
              setConfirmation({
                message: "Sudah yakin untuk membatalkan pesanan?",
                onConfirm: () => {
                  cancelOrder?.(Number(order.id));
                  setConfirmation(null);
                },
              })
            }
            className="w-full bg-[#8A4210] hover:bg-[#975F2C] text-white py-2 rounded-md transition"
          >
            ❌ Batal Pesanan
          </button>
        </div>
      )}

      {order.status === "pending" && confirmPayment && (
        <div className="mt-4 space-y-2">
          {paymentStatusText && (
            <p className="text-green-600 font-semibold">{paymentStatusText}</p>
          )}
          <button
            onClick={() => setIsDiscountPopupOpen(true)}
            className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition-all font-medium"
          >
            {selectedDiscountId
              ? discounts.find((d) => d.id === selectedDiscountId)?.name || "Pilih Diskon"
              : "Pilih Diskon"}
          </button>
          <button
            onClick={() => setIsPaymentMethodPopupOpen(true)}
            className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition-all font-medium"
          >
            {paymentMethod === "tunai" ? "Tunai" : paymentMethod === "kartu" ? "Kartu Kredit/Debit" : "E-Wallet"}
          </button>
          {paymentMethod !== "tunai" && (
            <input
              type="text"
              placeholder="Masukkan ID Pembayaran"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          )}
          {paymentMethod === "tunai" && (
            <>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Masukkan jumlah pembayaran"
                value={cashGiven}
                onChange={handleCashGivenChange}
                className="w-full p-2 border border-gray-300 rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {change > 0 && (
                <p className="text-green-600">Kembalian: Rp {change.toLocaleString()}</p>
              )}
              {change < 0 && (
                <p className="text-red-600">
                  Uang yang diberikan kurang: Rp {(-change).toLocaleString()}
                </p>
              )}
            </>
          )}
          <button
            onClick={() => {
              handleConfirmPayment();
              printKitchenAndBarOrders(order);
            }}
            className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white py-2 rounded-md transition"
          >
            💰 Konfirmasi Pembayaran
          </button>

          <button
            onClick={() =>
              setConfirmation({
                message: "Sudah yakin untuk membatalkan pesanan?",
                onConfirm: () => {
                  cancelOrder?.(Number(order.id));
                  setConfirmation(null);
                },
              })
            }
            className="w-full bg-[#8A4210] hover:bg-[#975F2C] text-white py-2 rounded-md transition"
          >
            ❌ Batal Pesanan
          </button>
        </div>
      )}

      {order.status === "Sedang Diproses" && markOrderAsCompleted && (
        <div className="mt-4 space-y-2">
          {paymentStatusText && (
            <p className="text-green-600 font-semibold">{paymentStatusText}</p>
          )}
          <button
            onClick={() =>
              setConfirmation({
                message: "Sudah yakin untuk menyelesaikan pesanan?",
                onConfirm: () => {
                  markOrderAsCompleted(Number(order.id));
                  setConfirmation(null);
                },
              })
            }
            className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white py-2 rounded-md transition"
          >
            ✅ Tandai Selesai
          </button>
          <button
            onClick={() =>
              setConfirmation({
                message: "Sudah yakin untuk mencetak struk pesanan?",
                onConfirm: () => {
                  generatePDF(order);
                  setConfirmation(null);
                },
              })
            }
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition"
          >
            🖨️ Cetak Struk
          </button>
        </div>
      )}

      {order.status === "Selesai" && (
        <div className="mt-4 space-y-2">
          <button
            onClick={() => generatePDF(order)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition"
          >
            🖨️ Cetak Struk
          </button>
          {order.reservasi?.kodeBooking && resetBookingOrder && (
            <button
              onClick={() => resetBookingOrder(Number(order.id))}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-md transition"
            >
              Reset meja reservasi
            </button>
          )}
        </div>
      )}

      {onSelectOrder && (order.status === "pending" || order.status === "paid") && (
        <div className="mt-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectOrder(Number(order.id), e.target.checked)}
            className="mr-2 w-6 h-6"
          />
          <span className="text-sm">Pilih untuk merge</span>
        </div>
      )}
      {confirmation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <p className="text-gray-800 text-center">{confirmation.message}</p>
            <div className="mt-4 flex justify-center space-x-4">
              <button
                onClick={confirmation.onConfirm}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmation(null)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {isDiscountPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Pilih Diskon Total</h2>
              <button
                onClick={() => setIsDiscountPopupOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-3">
                {discounts.filter((d) => d.scope === "TOTAL").length > 0 ? (
                  discounts
                    .filter((d) => d.scope === "TOTAL")
                    .map((discount) => (
                      <div
                        key={discount.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedDiscountId === discount.id}
                            onChange={() => setSelectedDiscountId(discount.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-gray-700">{discount.name}</span>
                        </div>
                        <span className="text-gray-600 text-sm">
                          {discount.type === "PERCENTAGE"
                            ? `${discount.value}%`
                            : `Rp ${discount.value.toLocaleString()}`}
                        </span>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500 text-center">Tidak ada diskon total tersedia</p>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
              <button
                onClick={() => setIsDiscountPopupOpen(false)}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all font-medium"
              >
                Simpan Diskon
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentMethodPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Pilih Metode Pembayaran</h2>
              <button
                onClick={() => setIsPaymentMethodPopupOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-3">
                {["tunai", "kartu", "ewallet"].map((method) => (
                  <div
                    key={method}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={paymentMethod === method}
                        onChange={() => handlePaymentMethodSelect(method)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-700">
                        {method === "tunai" ? "Tunai" : method === "kartu" ? "Kartu Kredit/Debit" : "E-Wallet"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
              <button
                onClick={() => setIsPaymentMethodPopupOpen(false)}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all font-medium"
              >
                Simpan Metode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  let color = "bg-[#979797]";
  if (status === "pending") color = "bg-[#FF8A00]";
  if (status === "Sedang Diproses") color = "bg-[#92700C]";
  if (status === "Selesai") color = "bg-[#4CAF50]";

  return (
    <span className={`px-3 py-1 text-white text-sm rounded-full ${color}`}>
      {status}
    </span>
  );
}

function isKitchenItem(item: OrderItem): boolean {
const category = item.menu.category?.trim().toLowerCase?.() ?? "";

  if (category === "bundle") {
    const hasKitchen = item.menu.bundleCompositions.some((bundleItem) =>
      ["main course", "snack", "makanan"].includes(bundleItem.menu.category.toLowerCase())
    );
    console.log(`Bundle ${item.menu.name} has Kitchen items: ${hasKitchen}`);
    return hasKitchen;
  }
  return ["main course", "snack", "makanan"].includes(category);
}

function isBarItem(item: OrderItem): boolean {
  const category = item.menu.category.toLowerCase();
  if (category === "bundle") {
    const hasBar = item.menu.bundleCompositions.some((bundleItem) =>
      ["coffee", "tea", "frappe", "juice", "milk base", "refresher", "cocorich", "mocktail", "minuman"].includes(
        bundleItem.menu.category.toLowerCase()
      )
    );
    console.log(`Bundle ${item.menu.name} has Bar items: ${hasBar}`);
    return hasBar;
  }
  return ["coffee", "tea", "frappe", "juice", "milk base", "refresher", "cocorich", "mocktail","minuman"].includes(category);
}
function printKitchenAndBarOrders(order: Order) {
  const kitchenItems = order.orderItems.filter(isKitchenItem);
  const barItems = order.orderItems.filter(isBarItem);

  console.log("Kitchen Items:", kitchenItems.map((item) => item.menu.name));
  console.log("Bar Items:", barItems.map((item) => item.menu.name));

  const kitchenOrder: Order = { ...order, orderItems: kitchenItems };
  const barOrder: Order = { ...order, orderItems: barItems };

  if (kitchenItems.length > 0) {
    generatePDFbarKitchen(kitchenOrder, "Kitchen Order");
  } else {
    console.log("No Kitchen items to print");
  }

  if (barItems.length > 0) {
    generatePDFbarKitchen(barOrder, "Bar Order");
  } else {
    console.log("No Bar items to print");
  }
}

//struk1
function generatePDF(order: Order) {
  const margin = 5;
  const pageWidth = 58;
  const pageHeight = 200;
  const doc = new jsPDF({ unit: "mm", format: [pageWidth, pageHeight] });

  let yPosition = margin;

  const checkPage = () => {
    if (yPosition > pageHeight - 10) {
      doc.addPage();
      yPosition = margin;
    }
  };

  const logoBase64 = "data:image/jpeg;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB//aAAwDAQACAAMAAAAhAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIIcAYcQgMsIgMMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMMQUwYgQQwQQAg0ckEEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEUMIYAQMAMYYgwE8AAMQgg0EEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcwEYAAUwAAAAAAAAAAAAgUMAQoUkIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEMg4EA4gAAAAAAAAAAAAAAAAAwIIgA8IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUEgEAwAAAAAAAAAAAAAAAAAAAAAAgIIkkoAAAAAAAAAAAAAAAAAAAAAAAAAAAAEUgIIQAAAAAAAAAAAAAAAAAAAAAAAAAAQswcgIAAAAAAAAAAAAAAAAAAAAAAAAAAoAgMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQA0EEAAAAAAAAAAAAAAAAAAAAAAAEocAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAgsIAAAAAAAAAAAAAAAAAAAAAEwIEYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAEwIAAAAAAAAAAAAAAAAAAAEYIEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkAU4IAAAAAAAAAAAAAAAAAAc0kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEYI4AAAAAAAAAAAAAAAAAUUAQgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAgA8kAAAAAAAAAAAAAAAEEQUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAIIAAAQswcIAAAAAAAAAAAAAAM0ggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwYEIAAAAAEAscAAAAAAAAAAAAAAMgcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEQwEUgkgAAAAAAgQ8AAAAAAAAAAAAAIMEoAAAAAAAAAAAAAAAAAAAAAAAAAAAAE4sggowAEAAAAAAAQIkgAAAAAAAAAAAAYwUAAAAAAAAAAAAAAAA0AQQgEAAAAAAAwwgYUAgcIAAAAAAAAwE8oAAAAAAAAAAE4koAAAAAAAAAAAAAAEwAgIAAAgkAAAAAAAUgA8UkAAAAAAAAAAAgoAAAAAAAAAA4sUgAAAAAAAAAAAAAAYAAQEAAAA0AAAAAA4oQQAggAAAAAAAAAAsEcAAAAAAAAAEQIIAAAAAAAAAAAAAAAAAAAkgAAAUAAAAAQwUQAAQAAAAAAAAAAAQAMAAAAAAAAAQ4AAAAAAAAAAAAAAAAIAAAAUoAAAUAAAAAwAAAAEgAAAAAAAAAAAAA8oAAAAAAAAYEEAAAAAAAAAAAAAAAoAAAAUIAAAAAAAAUAAAAAcAAAAAAAAAAAAAIEcAAAAAAAAoIUAAAAAAAAAAAAAAIAAAAAgEAAAAgAAAQAAAAAoAAAAAAAAAAAAA4UoAAAAAAAA4oAAAAAAAAAAAAAAEAAAAAAAgAAAAAAAAAAAAAUAAAAAAAAAAAAAAUQAAAAAAAAAAoYAAAAAAAAAAAAAYAAAAAYAEAAAAgAAAAAAAAoAAAAAAAAAAAAAAQAwAAAAAAAAIgIAAAAAAAAAAAAAgAAAAAgAAAAAAEAEAAAAAEAAAAAAAAAAAAAAAAAQoAAAAAAUAogAAAAAAAAAAAAcAAAAAYAAAAAAAAAQAAAAEIAAAAAAAAAAAAAAAEAIgAAAAAAAooIAAAAAAAAAAAAgAAAAQgAAAoAAAAQAAAAAEAAAAAAAAAAAAAAAAQAsIAAAAAAAIgIAAAAAAAAAAAcAAAAAAAAAAgAAAAkAAAAAIAAAAAAAAAAAAAAAAAAQIAAAAAAAgooAAAAAAAAAAEgAAAAAgAAAAEAAAAEAAAAYAAAAAAAAAAAAAAAAAAA4AAAAAAAAMgUAAAAAAAAAAMMMMMEYAAAAAQAAAAIIAAEIAAAAAAAAAAAAAAAAAEEgIAAAAAAAwAEAAAAAAAAAAoAAAAUAAAAAAAAAAAEkAAMAAAAAAAAAAAAAAAAAAYAYAAAAAAAAwAQAAAAAAAAAIAAAAA4AAAAAAAgEAAA0AIIAAAAAAAAAAAAAAAAAAgEsAAAAAAAAUQQoAAAAAAAAc8888sAAAAAAAAAAQ0MMggAAAAAAAAAAAAAAAAAAAoUAAAAAAAAAAAIMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUgUoAAAAAAAAA0kQAAAAAAAAAIEAAEAEAIAAEEAAAAAAEAIEAAAAEAIMAAAAAAAAQUwgAAAAAAAAAw4UoAAAAAAAogAUAgEIEsIAIMAwAAAEQIoAYgAwsAoUUAAAAAAAIAkAAAAAAAAAAAAAkAAAAAAAoAsUEAAsQoAUAYUQIAEUAgoAwUkE8A40UAAAAAAAEcIAAAAAAAAAAA0YQAAAAAAAokAUUAAcEIAUEoQAIAAIEAoAAAEIMAEMUAAAAAAkUUAAAAAAAAAAAAQgAEAAAAAAoQoUEAwoQAAUQQMIAIAgAIoAgQkg4AoUUAAAAAAAcYAAAAAAAAAAAAAo0AAAAAAAwAQAggUwgAgQgQAgQQAQAgAwAkwgQgAQwAAAAEIYYgAAAAAAAAAAAAAEgIQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYgA4AAAAAAAAAAAAAAAE4AkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIE4AAAAAAAAAAAAAAAAAogAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgMYIAAAAAAAAAAAAAAAAAwIMUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEQE8wAAAAAAAAAAAAAAAAAAAwAEEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAEoAAAAAAAAAAAAAAAAAAAAAEAgkMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYEoYAAAAAAAAAAAAAAAAAAAAAAAQEIQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoMcQgAAAAAAAAAAAAAAAAAAAAAAAAE8oQgAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAQwAAAAAAAAAAAAAAAAAAAAAAAAAAAA0UUAkoAAAAAAAAAAAAAAAAAAAAAAAAEwAoQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMYEQAIAAAAAAAAAAAAAAAAAAAAAAAE8wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQU8QAQgsEAAAAAAAAAAAAAAAE4AA0coAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUEYEIAgsAEIAAAAMMEYgAEMoswQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQwMooEMAAwQwwAAEEMswQwQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgEEg8wQAQQwgkUMQowAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgQQAwwwAAQgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIAAwAAABDzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzixyAjTSChhTjTTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzwgASwSxyzzzxzxxSwAjzTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzziwRxhzzjjDCRyyDzzzCxwwQjTTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzjxgzRzihwzzzzzzzzzzyxwjjQyRzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyQhxjARzzzzzzzzzzzzzzzzyyzTTxARjzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyADRzQTzzzzzzzzzzzzzzzzzzzzzyxzwyxjTzzzzzzzzzzzzzzzzzzzzzzzzzzzjxyTDTzzzzzzzzzzzzzzzzzzzzzzzzzwxxzxTTzzzzzzzzzzzzzzzzzzzzzzzzzRzRzizzzzzzzzzzzzzzzzzzzzzzzzzzzzzzCyzhDzzzzzzzzzzzzzzzzzzzzzzzDwjwRzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzihDzzzzzzzzzzzzzzzzzzzzziRBzhzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyjwzBTzzzzzzzzzzzzzzzzzzziATzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzxzxihTzzzzzzzzzzzzzzzzzxxhjhzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzjSiTzzzzzzzzzzzzzzzzzATyjzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzRjzzyiyxjzzzzzzzzzzzzzzzjhzjTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzjQTzzzzQjBzzzzzzzzzzzzzzzwxzTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzxzSyTzzzzzjwDTzzzzzzzzzzzzzjgyjzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzDgSyzzRTzzzzzwixDzzzzzzzzzzzzyjzyTzzzzzzzzzzzzzzzzzzzzzzzzzzzzRgRhjRzgTzzzzzzyjSjDzzzzzzzzzzziByTzzzzzzzzzzzzzzzygzwwzTzzzzzzwwyyySzhTzzzzzzzzyzwDTzzzzzzzzzyxxxzzzzzzzzzzzzzzzxyyTTzzzxzzzzzzyyxizCizzzzzzzzzzhQyjzzzzzzzzzyxzzzzzzzzzzzzzzzzzDzyxDzzzyjzzzzzzSiBzxzzzzzzzzzzzxDjDTzzzzzzzzxDzzzzzzzzzzzzzzzzhTzzwjzzzzzzzzzzgxgzzzxzzzzzzzzzzzywBTzzzzzzzzxDxzzzzzzzzzzzzzzzjzzzzxzzzyxTzzzzTzzzzhzzzzzzzzzzzyzSjzzzzzzzzzQjxTzzzzzzzzzzzzzhzzzzyxTzzzxzzzzzzzzzzjzzzzzzzzzzzzxThDzzzzzzzxDSjzzzzzzzzzzzzzzzzzzzxRjzzzxTzzyTzzzzjTzzzzzzzzzzzzxCjDzzzzzzzwByjzzzzzzzzzzzzzzTzzzyxwjzzzzTzzhzzzzzDzzzzzzzzzzzzzyigDTzzzzzzxTyDzzzzzzzzzzzzyTzzzzzzzzzzzzzzxzzzzzzzzzzzzzzzzzzzzziyDzzzzzzzzzTTzzzzzzzzzzzzjzzzzyzTyzzzzzzyzzzzzyzzzzzzzzzzzzzzzyzwxTzzzzzygxTTzzzzzzzzzzzzzzzzzxjzyxzzzyzyTzzzzhzzzzzzzzzzzzzzzyjxRzzzzzzzwTRTzzzzzzzzzzzhzzzzyhTzzzzzzzwjzzzzyDzzzzzzzzzzzzzzzyzyDzzzzzzzyxxTzzzzzzzzzzyzzzzzzDzzzxzzzzyjzzzzhTzzzzzzzzzzzzzzzyzxRzzzzzzyxRRzzzzzzzzzzyjzzzzyxTzzzxDzzzxTzzzyTzzzzzzzzzzzzzzzzyzwDTzzzzzzxhyjzzzzzzzzzzzDDjDBTzzzzzzzzzyzTzzjTzzzzzzzzzzzzzzzzyyhDTzzzzzzyRzzzzzzzzzzyxTzzzyjzzzzzzjTzzzhDzyjzzzzzzzzzzzzzzzzzzSgBzzzzzzzzAjzzzzzzzzzwTzzzzyzzzzzzzxzTzzxzzTTzzzzzzzzzzzzzzzzzzzzDzzzzzzzzjyxTzzzzzzyzDDDDDDTzzzzzzzywwTSRhzzzzzzzzzzzzzzzzzzzzxjDzzzzzzzzzBzDzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyxwTTzzzzzzzzyjzzzzzzzzzzzTjTTzDzzDzzzzTTzzzzzzTDzTDzzTTDTTzzzzzyTgBTzzzzzzzzxwSjzzzzzzyjyzzxBziQzTzjyDzzxTzDzTzyhzDwTzxSjzzzzzzjzDjzzzzzzzzzzgjzzzzzzzyjxyTxTxwSxzyiwwDzRSyjyzzyyzjDTyBSjzzzzzyzyBTzzzzzzzzzzyAzzTzzzzyjxzzwDzxDjTyjjTjzxTjTzzzzyjjiTzDCjzzzzzzijjzzzzzzzzzzzyhjxjzzzzyjyzzxTSzSBzyizjzTxyjyxTzwixRxjzxSjzzzzyxxCTzzzzzzzzzzzzyRzxzzzzywDyxDwyyzzwBTgTxgAiCyASBSyiCywBQhDzzzzjSTBzzzzzzzzzzzzzyjBxzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyTwRTzzzzzzzzzzzzzzzBCTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyjzzRzzzzzzzzzzzzzzzzyDCxDzzzzzzzzzzzz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";
  const logoWidth = 20;
  const logoHeight = 20;
  doc.addImage(logoBase64, "PNG", (pageWidth - logoWidth) / 2, yPosition, logoWidth, logoHeight);
  yPosition += logoHeight + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  checkPage();
  doc.text("Notarich Cafe", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const address = "Jl. Mejobo Perum Kompleks Nojorono No.2c, Megawonbaru, Mlati Norowito, Kec. Kota Kudus, Kabupaten Kudus, Jawa Tengah 59319";
  const addressLines = doc.splitTextToSize(address, pageWidth - margin * 2);
  addressLines.forEach((line: string) => {
    checkPage();
    doc.text(line, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 4;
  });
  yPosition += 2;

  doc.setLineWidth(0.3);
  doc.setDrawColor(150);
  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  const labelX = margin;
  const colonX = margin + 22;
  const valueX = margin + 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const now = new Date();
  const tanggal = now.toLocaleDateString();
  const hari = now.toLocaleDateString("id-ID", { weekday: "long" });
  const jam = now.toLocaleTimeString();

  checkPage();
  doc.text("Tanggal", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(tanggal, valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Hari", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(hari, valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Jam", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(jam, valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Kasir", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Kasir 1", valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Meja", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(String(order.tableNumber), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Order ID", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(String(order.id), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Nama", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(order.customerName || "-", valueX, yPosition);
  yPosition += 7;

  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  doc.setFont("helvetica", "bold");
  checkPage();
  doc.text("Pesanan", margin, yPosition);
  yPosition += 5;
  doc.setFont("helvetica", "bold");
  checkPage();
  doc.text("Item", margin, yPosition);
  doc.text("Total", pageWidth - margin, yPosition, { align: "right" });
  yPosition += 7;

  const truncateMenuName = (name: string) => {
    const maxItemNameLength = 19;
    if (name.length > maxItemNameLength) {
      const firstLine = name.substring(0, maxItemNameLength);
      const secondLine = name.substring(maxItemNameLength);
      return [firstLine, secondLine];
    } else {
      return [name];
    }
  };

  order.orderItems.forEach((item) => {
    const [firstLine, secondLine] = truncateMenuName(item.menu.name);
    checkPage();
    doc.setFont("helvetica", "bold");
    doc.text(firstLine, margin, yPosition);
    yPosition += 5;

    if (secondLine) {
      checkPage();
      doc.setFont("helvetica", "bold");
      doc.text(secondLine, margin, yPosition);
      yPosition += 5;
    }

    const itemPriceAfterDiscount = item.price - (item.discountAmount / item.quantity);
    checkPage();
    doc.setFont("helvetica", "bold");
    doc.text(`${item.quantity} x ${itemPriceAfterDiscount.toLocaleString()}`, margin, yPosition);
    const itemTotal = itemPriceAfterDiscount * item.quantity;
    doc.text(`Rp ${itemTotal.toLocaleString()}`, pageWidth - margin, yPosition, { align: "right" });
    yPosition += 5;

    if (item.modifiers && item.modifiers.length > 0) {
      checkPage();
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      item.modifiers.forEach((modifier) => {
        doc.text(`- ${modifier.modifier.name} (Rp ${modifier.modifier.price.toLocaleString()})`, margin, yPosition);
        yPosition += 4;
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }

    // Perubahan pada bagian catatan: membungkus teks otomatis agar tidak terpotong
    if (item.note) {
      checkPage();
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      const noteText = `Catatan: ${item.note}`;
      const noteLines = doc.splitTextToSize(noteText, pageWidth - margin * 2);
      noteLines.forEach((line: any) => {
        checkPage();
        doc.text(line, margin, yPosition);
        yPosition += 4;
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }
  });

  checkPage();
  yPosition += 3;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  doc.setFont("helvetica", "bold");
  const totalQty = order.orderItems.reduce((acc, item) => acc + item.quantity, 0);

  checkPage();
  doc.text("Total qty", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(String(totalQty), valueX, yPosition);
  yPosition += 3;

  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Subtotal", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Rp " + order.total.toLocaleString(), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Diskon", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Rp " + order.discountAmount.toLocaleString(), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Pajak (10%)", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Rp " + order.taxAmount.toLocaleString(), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Gratuity (2%)", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Rp " + order.gratuityAmount.toLocaleString(), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Total Bayar", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Rp " + order.finalTotal.toLocaleString(), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  doc.setFont("helvetica", "normal");
  checkPage();
  doc.text("Pembayaran", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(order.paymentMethod || "-", valueX, yPosition);
  yPosition += 3;

  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Uang Diberikan", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(`Rp ${order.cashGiven?.toLocaleString() || "0"}`, valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Kembalian", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(`Rp ${order.change?.toLocaleString() || "0"}`, valueX, yPosition);
  yPosition += 7;

  doc.setFont("helvetica", "italic");
  checkPage();
  doc.text("Terimakasih telah berkunjung!", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 5;
  checkPage();
  doc.text("Semoga hari Anda menyenangkan!", pageWidth / 2, yPosition, { align: "center" });

  doc.save(`struk_order_${order.id}.pdf`);
}




//struk2
function generateCombinedPDF(order: Order) {
  const margin = 5;
  const pageWidth = 58;
  const pageHeight = 250;
  const doc = new jsPDF({
    unit: "mm",
    format: [pageWidth, pageHeight],
  });

  let yPosition = margin;

  const checkPage = () => {
    if (yPosition > pageHeight - 10) {
      doc.addPage();
      yPosition = margin;
    }
  };
  const logoBase64 = "data:image/jpeg;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB//aAAwDAQACAAMAAAAhAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIIcAYcQgMsIgMMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMMQUwYgQQwQQAg0ckEEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEUMIYAQMAMYYgwE8AAMQgg0EEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcwEYAAUwAAAAAAAAAAAAgUMAQoUkIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEMg4EA4gAAAAAAAAAAAAAAAAAwIIgA8IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUEgEAwAAAAAAAAAAAAAAAAAAAAAAgIIkkoAAAAAAAAAAAAAAAAAAAAAAAAAAAAEUgIIQAAAAAAAAAAAAAAAAAAAAAAAAAAQswcgIAAAAAAAAAAAAAAAAAAAAAAAAAAoAgMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQA0EEAAAAAAAAAAAAAAAAAAAAAAAEocAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAgsIAAAAAAAAAAAAAAAAAAAAAEwIEYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAEwIAAAAAAAAAAAAAAAAAAAEYIEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkAU4IAAAAAAAAAAAAAAAAAAc0kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEYI4AAAAAAAAAAAAAAAAAUUAQgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAgA8kAAAAAAAAAAAAAAAEEQUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAIIAAAQswcIAAAAAAAAAAAAAAM0ggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwYEIAAAAAEAscAAAAAAAAAAAAAAMgcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEQwEUgkgAAAAAAgQ8AAAAAAAAAAAAAIMEoAAAAAAAAAAAAAAAAAAAAAAAAAAAAE4sggowAEAAAAAAAQIkgAAAAAAAAAAAAYwUAAAAAAAAAAAAAAAA0AQQgEAAAAAAAwwgYUAgcIAAAAAAAAwE8oAAAAAAAAAAE4koAAAAAAAAAAAAAAEwAgIAAAgkAAAAAAAUgA8UkAAAAAAAAAAAgoAAAAAAAAAA4sUgAAAAAAAAAAAAAAYAAQEAAAA0AAAAAA4oQQAggAAAAAAAAAAsEcAAAAAAAAAEQIIAAAAAAAAAAAAAAAAAAAkgAAAUAAAAAQwUQAAQAAAAAAAAAAAQAMAAAAAAAAAQ4AAAAAAAAAAAAAAAAIAAAAUoAAAUAAAAAwAAAAEgAAAAAAAAAAAAA8oAAAAAAAAYEEAAAAAAAAAAAAAAAoAAAAUIAAAAAAAAUAAAAAcAAAAAAAAAAAAAIEcAAAAAAAAoIUAAAAAAAAAAAAAAIAAAAAgEAAAAgAAAQAAAAAoAAAAAAAAAAAAA4UoAAAAAAAA4oAAAAAAAAAAAAAAEAAAAAAAgAAAAAAAAAAAAAUAAAAAAAAAAAAAAUQAAAAAAAAAAoYAAAAAAAAAAAAAYAAAAAYAEAAAAgAAAAAAAAoAAAAAAAAAAAAAAQAwAAAAAAAAIgIAAAAAAAAAAAAAgAAAAAgAAAAAAEAEAAAAAEAAAAAAAAAAAAAAAAAQoAAAAAAUAogAAAAAAAAAAAAcAAAAAYAAAAAAAAAQAAAAEIAAAAAAAAAAAAAAAEAIgAAAAAAAooIAAAAAAAAAAAAgAAAAQgAAAoAAAAQAAAAAEAAAAAAAAAAAAAAAAQAsIAAAAAAAIgIAAAAAAAAAAAcAAAAAAAAAAgAAAAkAAAAAIAAAAAAAAAAAAAAAAAAQIAAAAAAAgooAAAAAAAAAAEgAAAAAgAAAAEAAAAEAAAAYAAAAAAAAAAAAAAAAAAA4AAAAAAAAMgUAAAAAAAAAAMMMMMEYAAAAAQAAAAIIAAEIAAAAAAAAAAAAAAAAAEEgIAAAAAAAwAEAAAAAAAAAAoAAAAUAAAAAAAAAAAEkAAMAAAAAAAAAAAAAAAAAAYAYAAAAAAAAwAQAAAAAAAAAIAAAAA4AAAAAAAgEAAA0AIIAAAAAAAAAAAAAAAAAAgEsAAAAAAAAUQQoAAAAAAAAc8888sAAAAAAAAAAQ0MMggAAAAAAAAAAAAAAAAAAAoUAAAAAAAAAAAIMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUgUoAAAAAAAAA0kQAAAAAAAAAIEAAEAEAIAAEEAAAAAAEAIEAAAAEAIMAAAAAAAAQUwgAAAAAAAAAw4UoAAAAAAAogAUAgEIEsIAIMAwAAAEQIoAYgAwsAoUUAAAAAAAIAkAAAAAAAAAAAAAkAAAAAAAoAsUEAAsQoAUAYUQIAEUAgoAwUkE8A40UAAAAAAAEcIAAAAAAAAAAA0YQAAAAAAAokAUUAAcEIAUEoQAIAAIEAoAAAEIMAEMUAAAAAAkUUAAAAAAAAAAAAQgAEAAAAAAoQoUEAwoQAAUQQMIAIAgAIoAgQkg4AoUUAAAAAAAcYAAAAAAAAAAAAAo0AAAAAAAwAQAggUwgAgQgQAgQQAQAgAwAkwgQgAQwAAAAEIYYgAAAAAAAAAAAAAEgIQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYgA4AAAAAAAAAAAAAAAE4AkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIE4AAAAAAAAAAAAAAAAAogAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgMYIAAAAAAAAAAAAAAAAAwIMUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEQE8wAAAAAAAAAAAAAAAAAAAwAEEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAEoAAAAAAAAAAAAAAAAAAAAAEAgkMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYEoYAAAAAAAAAAAAAAAAAAAAAAAQEIQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoMcQgAAAAAAAAAAAAAAAAAAAAAAAAE8oQgAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAQwAAAAAAAAAAAAAAAAAAAAAAAAAAAA0UUAkoAAAAAAAAAAAAAAAAAAAAAAAAEwAoQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMYEQAIAAAAAAAAAAAAAAAAAAAAAAAE8wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQU8QAQgsEAAAAAAAAAAAAAAAE4AA0coAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUEYEIAgsAEIAAAAMMEYgAEMoswQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQwMooEMAAwQwwAAEEMswQwQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgEEg8wQAQQwgkUMQowAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgQQAwwwAAQgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIAAwAAABDzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzixyAjTSChhTjTTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzwgASwSxyzzzxzxxSwAjzTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzziwRxhzzjjDCRyyDzzzCxwwQjTTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzjxgzRzihwzzzzzzzzzzyxwjjQyRzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyQhxjARzzzzzzzzzzzzzzzzyyzTTxARjzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyADRzQTzzzzzzzzzzzzzzzzzzzzzyxzwyxjTzzzzzzzzzzzzzzzzzzzzzzzzzzzjxyTDTzzzzzzzzzzzzzzzzzzzzzzzzzwxxzxTTzzzzzzzzzzzzzzzzzzzzzzzzzRzRzizzzzzzzzzzzzzzzzzzzzzzzzzzzzzzCyzhDzzzzzzzzzzzzzzzzzzzzzzzDwjwRzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzihDzzzzzzzzzzzzzzzzzzzzziRBzhzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyjwzBTzzzzzzzzzzzzzzzzzzziATzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzxzxihTzzzzzzzzzzzzzzzzzxxhjhzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzjSiTzzzzzzzzzzzzzzzzzATyjzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzRjzzyiyxjzzzzzzzzzzzzzzzjhzjTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzjQTzzzzQjBzzzzzzzzzzzzzzzwxzTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzxzSyTzzzzzjwDTzzzzzzzzzzzzzjgyjzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzDgSyzzRTzzzzzwixDzzzzzzzzzzzzyjzyTzzzzzzzzzzzzzzzzzzzzzzzzzzzzRgRhjRzgTzzzzzzyjSjDzzzzzzzzzzziByTzzzzzzzzzzzzzzzygzwwzTzzzzzzwwyyySzhTzzzzzzzzyzwDTzzzzzzzzzyxxxzzzzzzzzzzzzzzzxyyTTzzzxzzzzzzyyxizCizzzzzzzzzzhQyjzzzzzzzzzyxzzzzzzzzzzzzzzzzzDzyxDzzzyjzzzzzzSiBzxzzzzzzzzzzzxDjDTzzzzzzzzxDzzzzzzzzzzzzzzzzhTzzwjzzzzzzzzzzgxgzzzxzzzzzzzzzzzywBTzzzzzzzzxDxzzzzzzzzzzzzzzzjzzzzxzzzyxTzzzzTzzzzhzzzzzzzzzzzyzSjzzzzzzzzzQjxTzzzzzzzzzzzzzhzzzzyxTzzzxzzzzzzzzzzjzzzzzzzzzzzzxThDzzzzzzzxDSjzzzzzzzzzzzzzzzzzzzxRjzzzxTzzyTzzzzjTzzzzzzzzzzzzxCjDzzzzzzzwByjzzzzzzzzzzzzzzTzzzyxwjzzzzTzzhzzzzzDzzzzzzzzzzzzzyigDTzzzzzzxTyDzzzzzzzzzzzzyTzzzzzzzzzzzzzzxzzzzzzzzzzzzzzzzzzzzziyDzzzzzzzzzTTzzzzzzzzzzzzjzzzzyzTyzzzzzzyzzzzzyzzzzzzzzzzzzzzzyzwxTzzzzzygxTTzzzzzzzzzzzzzzzzzxjzyxzzzyzyTzzzzhzzzzzzzzzzzzzzzyjxRzzzzzzzwTRTzzzzzzzzzzzhzzzzyhTzzzzzzzwjzzzzyDzzzzzzzzzzzzzzzyzyDzzzzzzzyxxTzzzzzzzzzzyzzzzzzDzzzxzzzzyjzzzzhTzzzzzzzzzzzzzzzyzxRzzzzzzyxRRzzzzzzzzzzyjzzzzyxTzzzxDzzzxTzzzyTzzzzzzzzzzzzzzzzyzwDTzzzzzzxhyjzzzzzzzzzzzDDjDBTzzzzzzzzzyzTzzjTzzzzzzzzzzzzzzzzyyhDTzzzzzzyRzzzzzzzzzzyxTzzzyjzzzzzzjTzzzhDzyjzzzzzzzzzzzzzzzzzzSgBzzzzzzzzAjzzzzzzzzzwTzzzzyzzzzzzzxzTzzxzzTTzzzzzzzzzzzzzzzzzzzzDzzzzzzzzjyxTzzzzzzyzDDDDDDTzzzzzzzywwTSRhzzzzzzzzzzzzzzzzzzzzxjDzzzzzzzzzBzDzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyxwTTzzzzzzzzyjzzzzzzzzzzzTjTTzDzzDzzzzTTzzzzzzTDzTDzzTTDTTzzzzzyTgBTzzzzzzzzxwSjzzzzzzyjyzzxBziQzTzjyDzzxTzDzTzyhzDwTzxSjzzzzzzjzDjzzzzzzzzzzgjzzzzzzzyjxyTxTxwSxzyiwwDzRSyjyzzyyzjDTyBSjzzzzzyzyBTzzzzzzzzzzyAzzTzzzzyjxzzwDzxDjTyjjTjzxTjTzzzzyjjiTzDCjzzzzzzijjzzzzzzzzzzzyhjxjzzzzyjyzzxTSzSBzyizjzTxyjyxTzwixRxjzxSjzzzzyxxCTzzzzzzzzzzzzyRzxzzzzywDyxDwyyzzwBTgTxgAiCyASBSyiCywBQhDzzzzjSTBzzzzzzzzzzzzzyjBxzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyTwRTzzzzzzzzzzzzzzzBCTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyjzzRzzzzzzzzzzzzzzzzyDCxDzzzzzzzzzzzz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";
  const logoWidth = 20;
  const logoHeight = 20;
  doc.addImage(logoBase64, "PNG", (pageWidth - logoWidth) / 2, yPosition, logoWidth, logoHeight);
  yPosition += logoHeight + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  checkPage();
  doc.text("Notarich Cafe", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const address = "Jl. Mejobo Perum Kompleks Nojorono No.2c, Megawonbaru, Mlati Norowito, Kec. Kota Kudus, Kabupaten Kudus, Jawa Tengah 59319";
  const addressLines = doc.splitTextToSize(address, pageWidth - margin * 2);
  addressLines.forEach((line: string) => {
    checkPage();
    doc.text(line, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 4;
  });
  yPosition += 2;

  doc.setFontSize(9);
  checkPage();
  doc.text("Struk Gabungan Pesanan", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 5;

  doc.setLineWidth(0.3);
  doc.setDrawColor(150);
  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  const labelX = margin;
  const colonX = margin + 22;
  const valueX = margin + 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const now = new Date();
  const tanggal = now.toLocaleDateString();
  const hari = now.toLocaleDateString("id-ID", { weekday: "long" });
  const jam = now.toLocaleTimeString();

  checkPage();
  doc.text("Tanggal", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(tanggal, valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Hari", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(hari, valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Jam", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(jam, valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Kasir", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Kasir 1", valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Meja", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(String(order.tableNumber), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Order ID", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(String(order.id), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Nama", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(order.customerName || "-", valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  doc.setFont("helvetica", "bold");
  checkPage();
  doc.text("Pesanan", margin, yPosition);
  yPosition += 5;
  doc.setFont("helvetica", "bold");
  checkPage();
  doc.text("Item", margin, yPosition);
  doc.text("Total", pageWidth - margin, yPosition, { align: "right" });
  yPosition += 5;

  const truncateMenuName = (name: string) => {
    const maxItemNameLength = 19;
    if (name.length > maxItemNameLength) {
      const firstLine = name.substring(0, maxItemNameLength);
      const secondLine = name.substring(maxItemNameLength);
      return [firstLine, secondLine];
    } else {
      return [name];
    }
  };

  order.orderItems.forEach((item) => {
    const [firstLine, secondLine] = truncateMenuName(item.menu.name);
    checkPage();
    doc.setFont("helvetica", "bold");
    doc.text(firstLine, margin, yPosition);
    yPosition += 5;

    if (secondLine) {
      checkPage();
      doc.setFont("helvetica", "bold");
      doc.text(secondLine, margin, yPosition);
      yPosition += 5;
    }

    const itemPriceAfterDiscount = item.price - (item.discountAmount / item.quantity);
    checkPage();
    doc.setFont("helvetica", "bold");
    doc.text(`${item.quantity} x ${itemPriceAfterDiscount.toLocaleString()}`, margin, yPosition);
    const itemTotal = itemPriceAfterDiscount * item.quantity;
    doc.text(`Rp ${itemTotal.toLocaleString()}`, pageWidth - margin, yPosition, { align: "right" });
    yPosition += 5;

    if (item.modifiers && item.modifiers.length > 0) {
      checkPage();
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      item.modifiers.forEach((modifier) => {
        doc.text(`- ${modifier.modifier.name} (Rp ${modifier.modifier.price.toLocaleString()})`, margin, yPosition);
        yPosition += 4;
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }

    if (item.note) {
      checkPage();
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      const noteText = `Catatan: ${item.note}`;
      const noteLines = doc.splitTextToSize(noteText, pageWidth - margin * 2);
      noteLines.forEach((line: any) => {
        checkPage();
        doc.text(line, margin, yPosition);
        yPosition += 4;
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }
  });

  checkPage();
  yPosition += 3;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  doc.setFont("helvetica", "bold");
  const totalQty = order.orderItems.reduce((acc, item) => acc + item.quantity, 0);

  checkPage();
  doc.text("Total qty", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(String(totalQty), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Subtotal", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Rp " + order.total.toLocaleString(), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Diskon", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Rp " + order.discountAmount.toLocaleString(), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Pajak (10%)", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Rp " + order.taxAmount.toLocaleString(), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Gratuity (2%)", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Rp " + order.gratuityAmount.toLocaleString(), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Total Bayar", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Rp " + order.finalTotal.toLocaleString(), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  doc.setFont("helvetica", "normal");
  checkPage();
  doc.text("Pembayaran", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(order.paymentMethod || "-", valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Uang Diberikan", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(`Rp ${order.cashGiven?.toLocaleString() || "0"}`, valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Kembalian", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(`Rp ${order.change?.toLocaleString() || "0"}`, valueX, yPosition);
  yPosition += 7;

  doc.setFont("helvetica", "italic");
  checkPage();
  doc.text("Terimakasih telah berkunjung!", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 5;
  checkPage();
  doc.text("Semoga hari Anda menyenangkan!", pageWidth / 2, yPosition, { align: "center" });

  doc.save(`struk_gabungan_${order.id}.pdf`);
}

//struk3
function generatePDFbarKitchen(order: Order, title: string) {
  const margin = 5;
  const pageWidth = 58;
  const pageHeight = 200;
  const doc = new jsPDF({ unit: "mm", format: [pageWidth, pageHeight] });
  let yPosition = margin;

  const checkPage = () => {
    if (yPosition > pageHeight - 10) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // Header
  const logoBase64 = "data:image/jpeg;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB//aAAwDAQACAAMAAAAhAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIIcAYcQgMsIgMMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMMQUwYgQQwQQAg0ckEEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEUMIYAQMAMYYgwE8AAMQgg0EEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcwEYAAUwAAAAAAAAAAAAgUMAQoUkIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEMg4EA4gAAAAAAAAAAAAAAAAAwIIgA8IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUEgEAwAAAAAAAAAAAAAAAAAAAAAAgIIkkoAAAAAAAAAAAAAAAAAAAAAAAAAAAAEUgIIQAAAAAAAAAAAAAAAAAAAAAAAAAAQswcgIAAAAAAAAAAAAAAAAAAAAAAAAAAoAgMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQA0EEAAAAAAAAAAAAAAAAAAAAAAAEocAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAgsIAAAAAAAAAAAAAAAAAAAAAEwIEYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAEwIAAAAAAAAAAAAAAAAAAAEYIEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkAU4IAAAAAAAAAAAAAAAAAAc0kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEYI4AAAAAAAAAAAAAAAAAUUAQgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAgA8kAAAAAAAAAAAAAAAEEQUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAIIAAAQswcIAAAAAAAAAAAAAAM0ggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwYEIAAAAAEAscAAAAAAAAAAAAAAMgcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEQwEUgkgAAAAAAgQ8AAAAAAAAAAAAAIMEoAAAAAAAAAAAAAAAAAAAAAAAAAAAAE4sggowAEAAAAAAAQIkgAAAAAAAAAAAAYwUAAAAAAAAAAAAAAAA0AQQgEAAAAAAAwwgYUAgcIAAAAAAAAwE8oAAAAAAAAAAE4koAAAAAAAAAAAAAAEwAgIAAAgkAAAAAAAUgA8UkAAAAAAAAAAAgoAAAAAAAAAA4sUgAAAAAAAAAAAAAAYAAQEAAAA0AAAAAA4oQQAggAAAAAAAAAAsEcAAAAAAAAAEQIIAAAAAAAAAAAAAAAAAAAkgAAAUAAAAAQwUQAAQAAAAAAAAAAAQAMAAAAAAAAAQ4AAAAAAAAAAAAAAAAIAAAAUoAAAUAAAAAwAAAAEgAAAAAAAAAAAAA8oAAAAAAAAYEEAAAAAAAAAAAAAAAoAAAAUIAAAAAAAAUAAAAAcAAAAAAAAAAAAAIEcAAAAAAAAoIUAAAAAAAAAAAAAAIAAAAAgEAAAAgAAAQAAAAAoAAAAAAAAAAAAA4UoAAAAAAAA4oAAAAAAAAAAAAAAEAAAAAAAgAAAAAAAAAAAAAUAAAAAAAAAAAAAAUQAAAAAAAAAAoYAAAAAAAAAAAAAYAAAAAYAEAAAAgAAAAAAAAoAAAAAAAAAAAAAAQAwAAAAAAAAIgIAAAAAAAAAAAAAgAAAAAgAAAAAAEAEAAAAAEAAAAAAAAAAAAAAAAAQoAAAAAAUAogAAAAAAAAAAAAcAAAAAYAAAAAAAAAQAAAAEIAAAAAAAAAAAAAAAEAIgAAAAAAAooIAAAAAAAAAAAAgAAAAQgAAAoAAAAQAAAAAEAAAAAAAAAAAAAAAAQAsIAAAAAAAIgIAAAAAAAAAAAcAAAAAAAAAAgAAAAkAAAAAIAAAAAAAAAAAAAAAAAAQIAAAAAAAgooAAAAAAAAAAEgAAAAAgAAAAEAAAAEAAAAYAAAAAAAAAAAAAAAAAAA4AAAAAAAAMgUAAAAAAAAAAMMMMMEYAAAAAQAAAAIIAAEIAAAAAAAAAAAAAAAAAEEgIAAAAAAAwAEAAAAAAAAAAoAAAAUAAAAAAAAAAAEkAAMAAAAAAAAAAAAAAAAAAYAYAAAAAAAAwAQAAAAAAAAAIAAAAA4AAAAAAAgEAAA0AIIAAAAAAAAAAAAAAAAAAgEsAAAAAAAAUQQoAAAAAAAAc8888sAAAAAAAAAAQ0MMggAAAAAAAAAAAAAAAAAAAoUAAAAAAAAAAAIMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUgUoAAAAAAAAA0kQAAAAAAAAAIEAAEAEAIAAEEAAAAAAEAIEAAAAEAIMAAAAAAAAQUwgAAAAAAAAAw4UoAAAAAAAogAUAgEIEsIAIMAwAAAEQIoAYgAwsAoUUAAAAAAAIAkAAAAAAAAAAAAAkAAAAAAAoAsUEAAsQoAUAYUQIAEUAgoAwUkE8A40UAAAAAAAEcIAAAAAAAAAAA0YQAAAAAAAokAUUAAcEIAUEoQAIAAIEAoAAAEIMAEMUAAAAAAkUUAAAAAAAAAAAAQgAEAAAAAAoQoUEAwoQAAUQQMIAIAgAIoAgQkg4AoUUAAAAAAAcYAAAAAAAAAAAAAo0AAAAAAAwAQAggUwgAgQgQAgQQAQAgAwAkwgQgAQwAAAAEIYYgAAAAAAAAAAAAAEgIQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYgA4AAAAAAAAAAAAAAAE4AkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIE4AAAAAAAAAAAAAAAAAogAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgMYIAAAAAAAAAAAAAAAAAwIMUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEQE8wAAAAAAAAAAAAAAAAAAAwAEEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAEoAAAAAAAAAAAAAAAAAAAAAEAgkMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYEoYAAAAAAAAAAAAAAAAAAAAAAAQEIQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoMcQgAAAAAAAAAAAAAAAAAAAAAAAAE8oQgAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAQwAAAAAAAAAAAAAAAAAAAAAAAAAAAA0UUAkoAAAAAAAAAAAAAAAAAAAAAAAAEwAoQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMYEQAIAAAAAAAAAAAAAAAAAAAAAAAE8wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQU8QAQgsEAAAAAAAAAAAAAAAE4AA0coAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUEYEIAgsAEIAAAAMMEYgAEMoswQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQwMooEMAAwQwwAAEEMswQwQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgEEg8wQAQQwgkUMQowAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgQQAwwwAAQgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIAAwAAABDzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzixyAjTSChhTjTTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzwgASwSxyzzzxzxxSwAjzTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzziwRxhzzjjDCRyyDzzzCxwwQjTTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzjxgzRzihwzzzzzzzzzzyxwjjQyRzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyQhxjARzzzzzzzzzzzzzzzzyyzTTxARjzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyADRzQTzzzzzzzzzzzzzzzzzzzzzyxzwyxjTzzzzzzzzzzzzzzzzzzzzzzzzzzzjxyTDTzzzzzzzzzzzzzzzzzzzzzzzzzwxxzxTTzzzzzzzzzzzzzzzzzzzzzzzzzRzRzizzzzzzzzzzzzzzzzzzzzzzzzzzzzzzCyzhDzzzzzzzzzzzzzzzzzzzzzzzDwjwRzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzihDzzzzzzzzzzzzzzzzzzzzziRBzhzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyjwzBTzzzzzzzzzzzzzzzzzzziATzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzxzxihTzzzzzzzzzzzzzzzzzxxhjhzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzjSiTzzzzzzzzzzzzzzzzzATyjzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzRjzzyiyxjzzzzzzzzzzzzzzzjhzjTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzjQTzzzzQjBzzzzzzzzzzzzzzzwxzTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzxzSyTzzzzzjwDTzzzzzzzzzzzzzjgyjzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzDgSyzzRTzzzzzwixDzzzzzzzzzzzzyjzyTzzzzzzzzzzzzzzzzzzzzzzzzzzzzRgRhjRzgTzzzzzzyjSjDzzzzzzzzzzziByTzzzzzzzzzzzzzzzygzwwzTzzzzzzwwyyySzhTzzzzzzzzyzwDTzzzzzzzzzyxxxzzzzzzzzzzzzzzzxyyTTzzzxzzzzzzyyxizCizzzzzzzzzzhQyjzzzzzzzzzyxzzzzzzzzzzzzzzzzzDzyxDzzzyjzzzzzzSiBzxzzzzzzzzzzzxDjDTzzzzzzzzxDzzzzzzzzzzzzzzzzhTzzwjzzzzzzzzzzgxgzzzxzzzzzzzzzzzywBTzzzzzzzzxDxzzzzzzzzzzzzzzzjzzzzxzzzyxTzzzzTzzzzhzzzzzzzzzzzyzSjzzzzzzzzzQjxTzzzzzzzzzzzzzhzzzzyxTzzzxzzzzzzzzzzjzzzzzzzzzzzzxThDzzzzzzzxDSjzzzzzzzzzzzzzzzzzzzxRjzzzxTzzyTzzzzjTzzzzzzzzzzzzxCjDzzzzzzzwByjzzzzzzzzzzzzzzTzzzyxwjzzzzTzzhzzzzzDzzzzzzzzzzzzzyigDTzzzzzzxTyDzzzzzzzzzzzzyTzzzzzzzzzzzzzzxzzzzzzzzzzzzzzzzzzzzziyDzzzzzzzzzTTzzzzzzzzzzzzjzzzzyzTyzzzzzzyzzzzzyzzzzzzzzzzzzzzzyzwxTzzzzzygxTTzzzzzzzzzzzzzzzzzxjzyxzzzyzyTzzzzhzzzzzzzzzzzzzzzyjxRzzzzzzzwTRTzzzzzzzzzzzhzzzzyhTzzzzzzzwjzzzzyDzzzzzzzzzzzzzzzyzyDzzzzzzzyxxTzzzzzzzzzzyzzzzzzDzzzxzzzzyjzzzzhTzzzzzzzzzzzzzzzyzxRzzzzzzyxRRzzzzzzzzzzyjzzzzyxTzzzxDzzzxTzzzyTzzzzzzzzzzzzzzzzyzwDTzzzzzzxhyjzzzzzzzzzzzDDjDBTzzzzzzzzzyzTzzjTzzzzzzzzzzzzzzzzyyhDTzzzzzzyRzzzzzzzzzzyxTzzzyjzzzzzzjTzzzhDzyjzzzzzzzzzzzzzzzzzzSgBzzzzzzzzAjzzzzzzzzzwTzzzzyzzzzzzzxzTzzxzzTTzzzzzzzzzzzzzzzzzzzzDzzzzzzzzjyxTzzzzzzyzDDDDDDTzzzzzzzywwTSRhzzzzzzzzzzzzzzzzzzzzxjDzzzzzzzzzBzDzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyxwTTzzzzzzzzyjzzzzzzzzzzzTjTTzDzzDzzzzTTzzzzzzTDzTDzzTTDTTzzzzzyTgBTzzzzzzzzxwSjzzzzzzyjyzzxBziQzTzjyDzzxTzDzTzyhzDwTzxSjzzzzzzjzDjzzzzzzzzzzgjzzzzzzzyjxyTxTxwSxzyiwwDzRSyjyzzyyzjDTyBSjzzzzzyzyBTzzzzzzzzzzyAzzTzzzzyjxzzwDzxDjTyjjTjzxTjTzzzzyjjiTzDCjzzzzzzijjzzzzzzzzzzzyhjxjzzzzyjyzzxTSzSBzyizjzTxyjyxTzwixRxjzxSjzzzzyxxCTzzzzzzzzzzzzyRzxzzzzywDyxDwyyzzwBTgTxgAiCyASBSyiCywBQhDzzzzjSTBzzzzzzzzzzzzzyjBxzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyTwRTzzzzzzzzzzzzzzzBCTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyjzzRzzzzzzzzzzzzzzzzyDCxDzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyghTzzzzzzzzzzzzzzzzxgjTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzgTijzzzzzzzzzzzzzzzzzzzxzhSjzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzjTjhDzzzzzzzzzzzzzzzzzzzzwwDTzjzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzwzgxRzzzzzzzzzzzzzzzzzzzzzzzxxTxDzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyRTCyBzzzzzzzzzzzzzzzzzzzzzzzzyDjSwDTzzzzzzzzzzzzzzzzzzzzzzzzzzyyyAShzzzzzzzzzzzzzzzzzzzzzzzzzzzzgTxxzTzzzzzzzzzzzzzzzzzzzzzzzyxxyjTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyRDDzhzTzzzzzzzzzzzzzzzzzzzhzzhADzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyzyihSyxTjzzzzzzzzzzzzzzSTzzBQhTzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzwQhDjzwzjzDTzzzjzjCgzzzxjRCzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzxzhBhzDTyywzwwzzTSADxRRzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzwzjziRwAxyxyAAijQRzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzxwxwyzyywwzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz/xAAUEQEAAAAAAAAAAAAAAAAAAACw/9oACAECAQE/AHwP/8QAFBEBAAAAAAAAAAAAAAAAAAAAsP/aAAgBAwEBPwB8D//EAE0QAAEDAgIECAkICgEEAgMBAAECAwQABQYREBIhMRMUIjJBUWFxIzAzQEJScoGRIDVQVGBiobEVFiQ0Q1OCksHRoiVEY/Bz4ZCTsib/2gAIAQEAAT8C/wDyblQG8gU5Pitc+Q2PfTl+t6P4+fcKcxPCHNS6r3UrFbXoRln30cUuejD/ABr9YpqubD/Ov05dDuh/8TX6Yu/1M/2Gv0xePqZ/sNfpq6jfDP8AYa/WC4J50P8AA1+s76efEpOKh6cVXxpGKYp5zTgpvEVvX/EUnvTTd1gucyS37zlSHW1jNC0nuP2qWtKBmpQA7afvMFjnPpJ6k7aexQwPINLWa/TN1kfu0TIderXF79J57nBjvyoYclO/vMsn8abwtGHlHXFU3h63o/hqV3mkWmCjmxkUmJHTzWGx/TQQkbkgVl8rIdQpTDKuc0g96aXboa+dGb+FLsVvX/Ay7jTmGISuapxPvpeFyk5sSlDvFfou8xvIStb+quPXyN5RjXHs03idSDlKiqT3VHxBAd3uFB+9TMll7yTqFdx+0Um4RY3lnkA9WdScTsg5RmlOGuPXud5BrgUnpy/3ScPzJJ1pso/HOo+GoTfP13T2mmIMZjyTDafdW7Qt1DfPWlPeacusFvnSW/cacxHARuWpXcKcxVHHMZWaXis+hGHvNKxVJ9FloUcTzugND3UcS3A+k3/bX6x3H+Yn+2v1iuH8xP8AbQxHcPXR/bQxNP8A/Ef6aTimWN7bR91IxW96UdHuNIxWj0459xpvE8M85K003fbe5/HA76bmxnOY+2f6qBz3aHGWnBk42hQ7RUiwwHv4OoetByp7C+qc4slST21wd9gcxReQP6qaxK60dWbFKT2bKi3uDI3OhJ6lbKSoKGaSCOz7NypseKM33Up7M6lYmTnqwmVOK7a4O93Pnkstn+mouF2hypTqnFdQqNb4sYeBYQnty0KUEjlEAdtSLvCY576M+obakYpjp8i0tffsp/FEtfk0Ntj409dpz3Pkry6gcqU4pfOUT3+ZNS5DPk3nE9xpjEE9r+Lrj7wqPitX8dgd6TUfEUF3nKU2fvCmZTD/AJJ1Cu46HWW3k5OoSsdoqVh2E9tbCmlfd3Uqz3KCdaDIKh1A01f5kQ6twjHvyyqHeocrYl0JV1K2UDmNn2VUoJGaiAKnYgiRswhRec6k0Zt3uhyjN8E31jZ+NRcMgnXnPFauoVFgxoo8C0lPbokTGI6c3nUp7zUvE8VvYwlbp+AqTiSa75PUaHZT8t98+FdWrvPiciaDTh3IUfdQiPncy5/bQgSj/wBu58K/Rsz6u58K/Rk36s58K/R0wf8AbufCjCkjew58KMd4b2l/CtRQ3pPw8SlSknkkjuqNeJ0fmPEjqVtqLipY2SWAe1FRb3Bk5AO6qupWykqChmkgjspxpDqcnEhQ7am4dhvbWs2V/d3UYd3tRzjr4VodW38Kh4mTrak5otK6xUeSzJTrMuJWOz7IuuoaTrOKCU9ZqfiRtB1ISS8vr6KRCut2OtKWWmj1/wCqg2KHFyJRwi+tVAADIbBTz7TCdZ5xKB21NxNGa2R0l1XXuFS79NkbNfg09SaWtSzmtRJ7flNRnnfJtLV3CmbFcHf4GqPvHKmcKyD5V9Ce4Z01haOPKvOK7tlN4et6P4ZV3mkWmCjmxkUmIwnmsoHuoNoG5KfhWXytVJ6BRZbO9tB91LgRF85hv4U5ZLevfHA7qdwzCVzeER76ewoP4Un+5NPYZmo5mo53GnrZMZ8pHWPdSklPOBHyo06TGPgXlJ99QsUOo2SmwsdadhqHeIcvyboCvVVs0S7fGljw7ST29NScPPxlcLbHz7JNR77LhL4K5MqI6+moVwjTE5sOg9nT9jXXEtIK3FBKR0mp+JEA8HARwq/Wpq1XC5qDlwdKG+r/AOqg2uLCHgmxresdp0T7rEheVdBX6o2mp2Jn3M0xUhtPWdpp9919Ws6tSz2n5LLDr6smm1LPYKjYcnO7VhLQ7ajYWYT5d1S+wbKYtMJjmMJz6ztpKUpHJSB3ebPRWHh4VpCu8VIw9Be5qC2fumpOFXB+7vBXYqpVpmxfKMqy6xt+VCu8yJlqOlSfVVtqBiZh3kyk8ErrG6mXW3kazSwpPWDUiO1IRqvISsdtTcOaquFtzhbX6udMXmdbnA1cmipPX01Bnx5qM47gPWOkfYk7Btq54hYj5oj+Gd7N1NwLleFByasts9X/ANVb7XGgjwLfL9Y79FxvkSHmnW4Rz1U1cL/LlZhCuCb6k0TmdvyGGHZCtVltSz2ComGZLu2QQ0Piai4dhMZFaS6r71NNIaTqtISgdQHn0q2xJXlmUk9Y2GpmF2zmYrpT2KqZZ5sXMraKk9advyYst+IvWYcUg9lW/E+5M1P9aajSWZLeuw4Fp7KfYbkNlDyAtPUam4dW0vhrY4UKHo51Evz8RzgLo2oEelltqNIakt67CwpPZ9hrldI8BPhFZr6EDfRduN9Xk2C1G/CrZZI0LJWXCO+sdFxvMWCCCrXc9VNXK+SpmYCuDa9VPyYNlmS9ob1Eda9lQsNRmtsgl1X4Uyy2ynVaQlA6gPoSZaocvyrKdb1hsNTcLuJzVEcCx6p31IjPRl6r7akHt+RHkOxnNdlZQrsq24m3InJ/rFMPtvthbKwpJ6qmQ2JjepIQFf4qTaJlscL9tcKker01bMQNvHgpg4J3r6KBzGY3fYJ1xLSCpxQSkdJq4X5x9zi9qQSo7NerZh/NfD3JXCOb9X/dISlCQlACR1Cp09iEjWfXl2dJq64hfk5oj5tNfiaJzOZ36UJKzkkEmrfh2TIyU94FHbvqBZ4kMZob1l+srb9EvMtvp1XUJWntFXDDLTmaoa+DV6p3VNt0mGrw7ZA6xu+RDmPw3NeO4U/kateImX8kSvBOdfQaSQoZjaDV0s0ecM8uDd9cU2/cLC5qPjhY1W+4MTm9ZhW3pT0j7AXO6MW9HhDmvoQN9Buff3dZZ4KN+FW+3x4Deqyjb0qO80tSUJKlkBI6au2JEozbg8pXrndT7zj6yt1ZUo9J0pSVKyTtNW3DkiTkuR4Fv8ag22NCT4Fsa3rHafo1aErTqrSFDqNXLDbD2a4vgl9Xo1Ot8iErJ9sgdfR8i13mTBOWeu16hq23SPPT4JWS+lJ3042h1BS4kKSeg1cbE7Fc4za1lOW3Uzq039LpDE4cG9uz6DQ2/Tt4vwbVxeD4R47Mx0Va7Ep5fGboSpZ26h/zSEhCQEjIDoq5XNiAjN5Wa+hI3mrpd5E9XKOq16g+RbLHJm5KI4Nr1jVutMWCBwaNZfrnf9IutodQUuJCknoNXTDSF5rgnVV6h3VJjuxnNR5BSrt0tuKaWFNqKVDpFWjEeeTU/f0Of7pCgtIUkgg9NXazsT0lQAQ/6wqLcJdleEeekrZ6D/qo0huS0HGVBST9NPOoZbK3VBKRvJqbcpN3f4rb0kNdJ66tFnZgJ1jy3+lVbhV6xClnNqFkpfSvoFOureWVuKKlHpOmFCfmu6jCCrt6BVqw+xFyW/4V38BQ+lJkRmW3qPoChV2w67Gzci+Fb6ukURkdum03d+3qyHLa6UGrfPYnta7CtvSnpFS4zUtotvp1kmpEWXYX+GjErjdP/wB1armzcGs0bHBvR9MT5jUJguPHIdA66/bMRSf5cVNQITMJkNsJy6z0mpD7cZouPKCUir1fHJhLbGaGPxOkDM1aMPOP5OzOQ36vSajR24zYQygJT9MXWyMTs1J8G96w6anwH4Luo8nuPQdMaQ5GdDjKtVQqy3xqbk09yH/wNKSFJIUMwautmciu8bthII2lAqyXpEwBp7kSB+P0tdbk1bmtZe1Z5qeuocKTfJHGZhKWOgf6plpDLSW2khKBuAq53Fm3s6zp5R3J66udxeuDus6eT0J6BphxXZbobYSVKqz2NmFkt3Jx/r6vpuRHbktFt5IUk1ebA5FzdjZrZ6ukaQcjmN9WPEGWqxOPYHP90khQzG0Ve7IHyZEPkP78h01ZL0SoRZ/JeGwKPT9KXm6t29roU+dyatdrduT/AB245lJ2hJ6aSAlICRkBV6vDdvRqoyU+dw6qlSHJLxdeVrLOm0Wh64Kz5jPSqoMJmE1wbCch0npP09erAiRm9EyS70p6DTzS2VlDiSlQ6Dpsd7XCIaf5Uf8A/mmXUPNhxpQUk9NXyzonp4RvkyBuPXVmu7kZ7iVyzSRsCj9JXu7It7WqnlPncmrNaVy3ePXLlE7Qk9NAZVfr2mGCzHyU/wD/AM04tTiytZzUd502OwF/J6WClroT0mm0JbSEoACRuA+wF3tTNwb28l0bl1OhPQni2+nLt6Dps12ct7mXOYO9NRZDcpkOsq1kmr1am7i1nzXxuVVnujsJ/iNxzAGxKj0UDmMxu+j73dUW9nIEKfVzU1ZLUuS7x645qJOaUnRiG9iODHinN071erSlFSiVHMnQkFRASMzVhsIbCZEwZr9FHV9g58NmayW3059R6qu1rdtzuSuU2eavTabm7bngU7Wzzk1ClNTGA6wrNJ/Cr1a0XFnqeHNVVlubkJ/iFx2ZbEqPRW8fRt4uTduYzO1081NWW2OTn+P3DMgnNKT01urEV7EcGNFPhfSV6tKJUcztOhtCnFhKASo9Aqw2RMNIekDWfPR6v2FksNyWlNvJ1kmr3aF29zWTmpg7ldWm03J23v6yNqDzk9dQ5TUxhLrCs0n8KvlqTcGs07H0801YbotlziE/krTsSo/l9GXOa3BjKdc39A6zVrhO3iWZs3yOewddJASABsArEV54oksRz4c7z6tKJUcztOhptTrgQ2CpR3CrFZ0wEBx3lSD+H2HebQ62pDiQpJ2EVfrQuA5wjeZjncerTZrm5bn8xtbPOTUV9EllLrRzSqr/AGkTW+FYGUlO771Ydupd/ZJex9GwZ9P0VJfRGZU66ckpphD2IbjwjuYioO6mm0tNpQgZJGwCr/dUwGdRHl1buztpxanFlazmo7zoabU64ENgqUdwqw2dMFsOOgGQfw+xLzaHm1IcGsk7xV+tC4DnCN7Y53Hq02K6qt72qo5sHeKacS62laDmk7QaxHair9sh7Hk7Tl01YLqJ7Oq55dO/t+iCQBmdgFT33b7cBGi/u6d5/wA1CitxI6WmRkkVd7gi3xitXPPNT11JfXJeU66c1q0JSVKATtJ3Vh6ziGgPPjOQf+P2LfaQ+0pt0ayDvFXu1Lt72zawrmnThu78VWI8g+AVuPqmt47KvcJy2yhPg7E58oDoq1zkT4wcRv8ASHUfofEdxU64LfD2rVsXl+VWW2ot0YJ3unnGpklESOt105JTVzmuT5RdXu9EdQ04as/ApEqQPCHmg9H2Nlx25TCmnRmk1dre5b5Govag81XXpwvduEAiSFcocw9fZTiEuIKFjNJ2EUsO4euesnMxXPypl1DzSXGzmlQzB+hb/chAi8g+GXsSP81hm2lpJlyRm8vdn0UogDM7AKxDdOPyNRs+ARu7dOGbRwqhKkDkDmJPT9j7nCbnxlNL39B6qmxnIkhTToyUPx0JUUqCknIjpqwXMT4+S/Lo53bVxhtzoqmnOnceo1YpbltmKt8vYnPk9n0JKfRGYW66ckpFWxhd6uapckeAQdg/xW6sVXTVHE2DtPPP+NNgtZnyNZfkEc7t7KQkISEpGQHR9iUOIWSEqBy3/Lv9sTPj5p2Po5p/xS0FtZSoZKG8aIEtyFJS83vG8ddQpLcyMh5rmn8KxJbeNMcOyPDt/iKw3cuORuCdPh29h7R9B3uSu6XFECLzAdtQoyYkZDLY2Cr5cRb4hUPKq2IFOLU4srWc1HaTot8Rc2Ullvp3nqqFFbiR0stDID7EXC/RImaUnhXOpNTL3Mmr1EHg0qOQSmrRF4nCQj096j2+IxTatZJlx08oc8D89OG7nxKTwbh8C5v7DW8dlXqOu1XFE6L5NR5Q7ahyUS4yHm+aofQOI7hxKJqoPhnNg7Kwzb+LR+Hd8s7t7hTriWm1LXsSnaau85VwlqcPM3JHZoSkqUEpGZNYftogRc1eWXtUf8fYjEU3idvVqnwi+SnRhSFxibwyh4Nr8/EkawyO6sRW3iMnWR5Fzd2acLXLjDPFnT4VG7tFS46ZUdbTnNUKsshdqua4EnyajsP0A84llpTi9iUjM1b0Kvd5XJeHgG9w/IaMW3LM8TaOwbV/604Ttuurjjw5KeZ9hZk2PDTm+4E9nTUN/jMdLqUkJVuz04knccnkJ8m3yRSUlSgkbzVnhiDBQ16W9Xf4q4RETYq2XNx3HqqXHXFkLZd5ydER9UaQh1vnJNQJSZsVDyOn8DWKLfxmNxhryzW3vFYdn8dhco+Fb2Hz/FUsuLbgMbVq51WqGmDDQyN+9R6zV4mpgwlunnbkjtpxanHFLXtUTmdFqhKny0tDm71HqFMtpZaS2gZJSMh9g7hNagxy69u6B11PxJIezTH8Enr6atkdy43BCFEqz2qJ6qQkIQEp3DZoxDO4lAVq+UXyRowpB4xM4ZY5DX5+MxVbuMR+MNDwje/tGnC1w4rK4Fw+Cd/A1vFSAbFe0up/d3fypCwtIUnaDtHntwkphxHHldFYYjKlSnbg/tJPJz0Yjn8dmkJPgm9g04ct/EYYKx4Zzars+wmKp3GZvAoPg2tnv0YSg8BE4wsct3d3acRTuOT1ZHwaOSKSkqUEp2k1ZofEYCGvT3q7/G4it/EZhKB4Fe1OgHI7Kw7P47BGsfCo5KqvkET4K0ZeEHKQe2sKTStpUN7yjW7Pq89xE+qdcWrewdgPK76iMJjR22m+akZViafxODqIPhXdg7tOFrfxqXwzg8E1+J+wD8hphOs8tKB205fkPSER4KOEWo5ax3UnPIZ79F6mcSgOOemdie+lEqJJ3mrTEMyc21lyd57qQkIQEp2AbNGI53E7erVPhXOSNGFIHGJfDr8m1+fjrxCTPhLb9MbUntpaShZSrYRs0WOaYM5C8/Bnkq7qSoKAI3Gr40u13ZqcwOQo7ajupfZQ6jalQzHndzliHCceO8DZ31hSIVqcnvbVKPJzpRCUkncKvU0zp63PQGxPdoabU64lCBmpRyFWuGmFDQyneN/f9PTJ8aInN91I7Omp+J1nNMNGqPWVUiS7JVrPLUs9tYPg7FS1jbzUacVTuMzeCQeQ1s9+jCUHgIhkLHLd3d2g7KxBO47PVl5NHJTSElaglO0nZVphiDBba9Lerv8AH4ugcG+JTY5C9iu/ThSdxmHwKz4Rr8qusQTYLjJ3naO+sJyyOEgvbFoOzzvEbqp1yZgM9B21FZTHYQ0jmpGVYrm8WhcEg+Ed2e7ThCBruqlrHJTsT3/Ts+8xIY2rC1+qmp+IpL+YY8Ejs30talqzWSo9Z0Q2FSZLbSN6jlUVlMeOhpG5Iy0XqZxGA456e5PfSiVKJO81aYhmzm2ujee6kJCEBKdw2aMTTuKQClPlHOSNGEoXDyy+schvd3+YT4yZcVxlXpCpDSmHltL2KSctFmmGFPbd9HcrupKgtIUncavzarbdmpzPNUdtMuJeaQ4g5pUMx5zOkpiRHHl7kisKx1PvvT3tqichROQzO6r5MM24OL9AclPdoYbU88htG1SjkKgR0xIjbKfRH00TkMzuqffWmM0sIW8vsGyp10uEvMHXQj1UiuCd/lr+FcC5/LX8NODoOQVLWPuo04qm8Ym8Eg+Da2e/RhKDwMTjCxy3N3doNX+bx2esjyaeSmkJK1BKd52VaIghQW2suVvV3+Y4wg5LTLQN/JXpwrN4xA4JR8I1s91XmJx2A436WWae+sIS9aOuKvntbu7znFsguKZgtbVLOZFW+MIkNpkeiPxrE0zituUEnluckacHwtd5UpY2I2J7/oFa0oTmsgDrqViCExsCy4r7tPYqT/CYPvNLxRLPNbbFfrJP9ZHwr9Ybh/NHwpOJZwO0tn3U3ip7+Iwk9xprFMc+UaWmo95gv818A9R2UlQUM0kEeY6qfVFao6hWqnqFO6jbalqA1QM6mupeluuNp1UqVmBUNhUqShpG9RqKymOwhpvmpGWi9zRBgrXnyzsT30pRUok7zVphmbOba9HerupCQhASnYBs0YmncTg6iD4RzYNGE4PDyy+schrd3+ZTo4lRHGVekKfbUy8ttexSTkdFgmcTuLaieQrkq0T/APpOIkvp2Mu7/wDNA5jMbvN1qCEFR3DbVlBuV9dmL5iDs/xoxTM4zcihJ5DXJHfoQkrWEp3nYKtkUQ4LTI3gbe/6AXnqnV31Os781WciacvVA2VIws8keBdSvvqXFeiOaj6Ck+IjzJEc5svLT76hYneRkJSA4OsbDUC7xJuxteS/VPmWLpvBRhGQeW5v7tGDoWxUtY7EacUTuNTuDSfBtbPfowlC4CIZCxy3N3doJyGZ3VfpvHbgtQPg08lNISVqCU7zVoiCFBba6d57/M8YQ+CkpkpHJc2Hv04el8btrZPPTyTWKInGbaVpHLb5VYamcatqM+e3yT5viiXxa2qQOe7yRWGonFrYjPnuco1dJIiQHXukDZ30pWsoqO87dGFIfGJ/CqHIa2+/6Audwat7Ou7tJ3JHTU3EEyQTwa+CR1JpUuQo5qfcJ9qot5nRzyX1KHUrbUWbEvrHF5SQl7/3dV3tbtud5W1o81XiQcjmN9Wq/vxlBEgl1rt3ioshuUwl1k5pPj3FhttS1c1IzNXSWZk1x07ju7qhsKlSUMo3qNRmUx2ENI5qRlovkziUBxfpnkp76USo5neatMMzZzbXo71d1IQEICU7EjZoxPN4rAKEnwjmwaMJQeHl8YWPBtbu/wA0vMXjlvda9LLNPfRGqSDv0YRl8FNLB5rv50pIUkpO0HZVlJtt+eiL5i9g/wAeb3g/pLEDMVPMRsP+aSAkZDdWM5XkoyfaOnDcTitsRmOW5yj5++6llpTjmxKRmaus1c6Wtwk6vojqHyELU2oKQclDpq0XBq7MGHOALn51eLcu3yCk7WzzVeKsFzVBkhKj4BZ2igQoZjcfHYuncFGEZB5Tm/u0YOhbFy1jsRpxRO41O4NB8G1s9+jCULgIhfWOW5u7qUoJGajkKuGIIsbNLZ4Vzs3Vc57k+RwjmzoA6qbQXFhCdqjsFWqIIUJtob+nv81xLE4rc15cxzlDRHdLD6HU70nOozyX47bqNyxnWLGiy/Hmt7wcjUV0Pxm3RuUM/NZLoYjuOHckZ1hNovyZM1e8nIaLzJ41cXnOjPId2i0xuNz2mujPb3UkBIAG7z/GE7VQmKg7VbVfKYdWw6lxs5LTtBrkX+zdHDp/A04hTbikL2KGw+KwxK4zbEhRzW3yT411xLTSlr2JSMzVxlKmTHHVdJ2d1Q2FSZKGUb1GorIjx22kbkjLRfJggwFr9M7E0olRJO+miA4krGac9oqRiZhplKYbRJy6dgFTbnKmHwzhy6hu04RhcNKMhY5De7v82xfF4aAHkjlNH8NOEJPCQCyd7Z/Cr1G41bnkdOWYrCEnhIS2Fc5o/h5ri2RwVt4Ic505e6rDG4ta2U9JGsav0ni1qeWOcRqj36cGRdr0k+yPP5DqWGFur5qRmanSVS5Tjy/SPy8OzjDnpzPg3OSaxfDCHkSmxyV7Fd/isFO5SHmutOfjcXzuDYTFQeUvaru0YOg7FS1+ynTimdxqdwST4NrZ7/lNoLjiUJ3nZVqiCFCbZG8b+/zaQ2HmFtq3KGVSWiw+40rek5aMKyeAuaUnmuDV0QP+nYncaOxDmzzW9Hj2IWIw3IyBoDIZCsaSNrLA9o6bLH4rbGG+nLM+f4wnZJTEbO/avxA2U9/1LDAVvWE5+8eKwqvUvDf3gR4x5wNNKWrmpGZq4ylS5jjyuk7O6obCpMltlG9RyqKymNHQ0jmpGVT7vEh7HHApfqp31cMSSH80sDgkfjROZ2/KwlB4aUZCxyG93f5xi6NwVx4Uc10Z6GXC26had6TnUZ0PR23BuUkGsWtcDIizEbwdU1Gc4ZhtwekM/M1q1EKUdwGdYbRxq7ypitw3e/RiCRxi6vHoHJGizx+M3FhvozzNDd59JdSwwt1exKRnU2QqVKceXvUfE4QcDsCQweg/nUpHBSXUeqojxNoc4K5RlffHjMXT+DZERB5a9qu7RapxgSg8lIVsyyq4X2XLzAVwbfUmt52/LbQXHEoTtUdgq1RBCgtsjeN/f5xi6Pwtt4Qb2jn7tOE5HDWsIO9o6tYij8YtTo6U8oVhWRw1qSk72zq+Z39/gLU+rpI1RWE2OCtQUd7itaprvARHnT6KSaUSpRJ3nRguPrPvPn0Rqjz/ABjO5KYiDv2r8Vg1zVuC0esisRN8HeJA6zreJaOq4g9RppWu2hXWM/FPupZZW4rckZ1cJKpctx5XpHxeEoPDSjIWOQ3u7/OZbQfjOtHcpOVOI1HFIO9Jy0YMf1ZjrJ9JOdOJ10KSekZVhdXF7nLiH3e7zPGTuaI0ZO9as6gtcDEab9VIrFr/AAVrKBvcOWnCzHA2lB6XDrefS30xo63V7kjOpb6pMhbq96jn4rDjnB3dnt2VjJvVuDa/XR4q0r4S2xlfcHisXztRlMVB5Stqu7xbSFOuJQgZqOwVaoghQW2RvG/v86xIxwF2e6lcrRZXuL3NhfRrZHRN/YsVtubkuZeZ3P8Aa8UsNbwjL/ejGj2clln1U56G0FbiUDeo5VGbDLDbY3JAHn2MZ3MiIP3l+Ltmtx9jUGZ1hWNUZtRnOrMeKwu5r2hv7uzxL7qWGVuL5qRnU+QqVLceV6R8XhCFwkgyVjko2J7/ADvGrG1h4eydCTkoEdFQXOGhsueskGsZN6oiyBvScqiucLHbcHpJB8ysH7ViCVIPo56MRPcNdnz0Dk6LA1w12jp6Ac/Ppj6YsZbq9yRUp9UmQt1e9Rz8Xg+DruqlLGxOxPfWLm9e163qqz8VgxecN1HUrxOL5+q2IiDtVtV4tptTriUI2qUchVsiiFDbZT0Db3+d4qZ4S0rPSg56cKvcLaUDpQdWsTtcLZ3etPKrDLvC2hrrTyfMZznAxHnOpJrBbf7NIeO9S8qdVqNqV1DOpC+EfcX6yidGDGtac456qfPsYzsymIg7uUvxbDSnnUNo2qUchUCMmJEbZT6Iq+N8La309nisFOeGfb6xn4iQ6lhlbq+akZ1OkKlSnHl71HxeEYPCvmUsclHN7/PLg1w0J5v1knTgl395Z7lVOb4WI8jrSawY54CQ0fRVn5jidzg7Q997ZWGG+Ds7P3uVV5c4K1yV/d04LbyiPOesrLz2a+mLGceXuSKkuqkPrdVvUc/F4Ph676pSxyU7E9+iSnXYcT1g0sZKUOo+Jwg5qXTV9ZJHiMYTdVCYqDtO1Xi2kF11KE7VKOQq2xUw4bbKejf3+e3FvgZ77fUs6MJOal2A9dJGjDngL7LY68/McZuZQmkesqrajg4DCOpArFrmpaSPWUBpwu3wdna+9mfPcXz9ZaYiDsG1fi2W1OupbQM1KOQq2xUw4bbKegbe/Tc2+CuD6OpR8TYXOCu0Y/ey+XIdSwwt1fNSMzU6SqXKceXvUfF4Rg8K+ZSxyUbE9/n2KEal5e+9kdFmc4O6R1fe0K/Z8YD75/MeY4vOvMhtUgaqEjqFY2c8FGb6yTptSODt0dP3B55OkpiRXHl+iKkOqfeW4s5qUcz4vCELhH1Sljko2J7/AJGJ2+Du7v3tviYq+DktL9VQNJOskHr+VjCdkExEHtV4tlBddShO9RyFWyKIcNtlPQNvf59jNvKa0vrToYVqPtq6iKaOs2g9lYk8DfYj3d+fmN58LieM36uWjGi85zKepGhtOu4lPWcqbGq2kdQ88xfO13ExGzsTtV4ttBcWlCdpOyrXFEOE2yN4G3v+RjRvKYyv1k+Kt6+EgsK60D5Mp5MeO46vckZ1LfVKkuOr3qPi8IQOEeMtwclGxPf5/jZHIjr7SNNuVwkCOrrQKxoMlRHO+mTrMoV1geYeVxl7J/xoxYrWu6uxIGi2J17jGT98eeXGUmHEceV6Ip5xTzq3F7VKOZ8XhKDw0kyVjkN7u/5ONW847DnUrLxWG169oY7NnycYzubEQfvL8Wy2XXUtp5yjlVvjJiRG2U+iPP8AGac7c2epenD6te0RvZyrGif2FlXUurUrXt0dX3B5ha+XiySrqKtGI1a14kd+jDyda8xfa88xhN13kxUbkbVd/i0JK1hI3nZVpiiHBbaG/p7/AJOK29e0rPqkHxWDl61uUn1VfIlPJjx3HV7kjOpj6pMlx1e9R8XhCFwjypSxyUbE9/0BixOdoX2KGnCis7O32E1i5OdoJ6lCsPq1rRH7vMMN8u+zFd/56Lyda6Sfa0YWGd5Z7M/O7nKEOE48ejd3084p51TizmpRzPi8JweHl8YWPBtbu/5V4b4W2SE/d8Vglf7wjuPyMYzuZEbPavxbLannUto2qUchVvjJhxG2U9A+gMSDOzv9g04OOdrV2LNYoTnZX/cfxrC5zs7XZn5hhHbcph/936LntuEj2zowkP8ArCfZPneLp3CyBGQeS3v7/FoSVrCU7zsq0RBCgttdO89/ynU67S09Yp1Oo6tPUfE4Oc1bkpPrI0zH0xoy3V7kjOpTypD63V71HPxeEIOu8qUsclGxPf8AQN+Gdok+zpwUf2B4f+T/ABWIRnZ5Ps1hI52ke0fHq5hrB375M/8Aemjuqf8Avr3tHRg/51/oPnVzlJhQ3HldG7vp1xTrilr5xOZ8XhOFw83h1jwbX5+Iu6OCuUhP3vE4cXwd3Y7dmnGM7amIj2l+LYaU86ltG1StlW+MmHEbZR6I+J+gb181SfY04J/dX/bq+/NEv2DWD/mv+o+PXzFd1YN/eZlK3Gp37497R0YO+dD7B86xbO4aUI6eY3v7/FpBUoJG87Ks0QQoDbfpb1d/iMVN6l2WfWGfibevg5rC+pYobqmPpjRlur3JGdSn1SX1ur5yjn4vB8LWcXKXuTsT9BXn5rk+wdOCf3aR7VXz5ol//Gawd81n2z49fNPdWDv3uZ/700d1T/3172jowf8AOv8AQfObrLTChOOneN3fTiy4tSlbSdvi8KweMTOGUPBtfn4nGreUlhfWMvEpOSgeqoi+EjNL60isYzuZEQe1fi47Sn3kNo5yjlUCOmJEbZR6I+gr181yfY04J/dX/bq+fNEv/wCM1g75rPtnx53VhHZcJg/936LnsuEgffOjCJ/6wn2T5ziyfw8ri6D4Nvf3+LSkqIA3mrJD4lAQ36Z5Su/xONW84jK/VVl4q1yQiwNPHbqN1JeVIfW6vnKOfi8HwdZxUpY2DYn6DvxytEr2dOCh+wPH/wAn+KxCcrPJ9msIjK0j2j5hhnkXqWnv/PReRldJPtaMLHK8s9oPnF3liHBcd9LLId9LUVqKlbSfF4WhcZncKochrb7/ABWKG+Es7v3cleKw/wCGw6631awo7D4phpTzyG0c5RyqBGTEiNsp9EfQeJTlZ3+0acHDK1q7VmsTHVsz/uFYVGVnb7SfMLRyMUyk9qtGI06t4kd+jDqtW8xvay84xZO4eWGEHwbW/v8AFgZnIb6scMQre2jLlnlK7/FXJHCwJCOtB8VgtwFqS176nN8DMebPoqPisHwdZxUpY2J2J+hMWKys6+0jThROVnb7SaxarKzqHWoVh1OraI/d5gjwWMVfeP8AjRixOreFdqQdFrVqXGMr7483vMwQoLjnpbk99KUVKKjvPi8MQeNTtdQ8G3t9/i1jWQR11JTqSHE9Sj4nBy8rkodaKxK1wV4f+9yvExmVSH0NI2qUcqgxkxIqGUbkj6ExkrK3IHWvTh9OpZ43anOsZqyt7SetdWhOpbIw+4PMLp4HFcdfrZaMaIyntK60aG1ajiVdRzps6zaT1jzbFc7jMzgUHwbX5+LAzOQ31YYXErehJHLVyleMvjfBXWQntz8TYHuAurKugnKsaM5SWXvWGXicHQc1KlrG7ko+hcbL8HHR2k6banUgR09SBWNVbIqOsmoydWO2nqSPMMWeDuMJ7/3fSdqQaxsjwcZztI02tfCW6OrrQPNbhOZgs67+eR2bKVcLGokmNmT92uP2L6r/AMa4/Yvqv/GuP2L6r/xrj9i+q/8AGuP2L6r/AMa4/Yvqv/GuP2L6r/xrj9i+q/8AGuP2L6r/AMa4/Yvqv/GrWm1zVlUaMBqbcyPG4va1LkF+unxKFFCgobxtq5pTdbCl5vapI1v9+IjMqffQ0jeo5VCjpixW2Ubkj6Fxo5nNaR1J0MJ1nmx1kU0NVtA6hWKPC3iIyOz8/McaI/ZmHPVVUFfCQ2VdaRWLm9e0k+ooHThhzhLOz93Mea4om8anlCDm23sHf4sDM7KsUPiVvQgjlq5SvG4zj60dp8egcj4rCEweEhuc07U1fIfEp60DmHan5eD4Oa1S1jYNiPobFLmveHfu5DRZm+FukdP3tEj9oxg2n1CPw8xxU3r2hz7pBrDjnCWdjs5NXpvhbXJT93TgtzOI636qs/NL5M4lAWv0zyU0dp8XhiFxq4Bah4NrlHx06OJURxlXpDKpLKo762nOck5eJjPLjvodb2KSc6ubKL1aUPseUSMx/qiMjt+TGZVIfQ0jeo5VCjpixW2U7kj6GuTvDT33OtZ0YSa4S7A+oknRY/2jEcp71c/Mbm3w0B9HWk1gxzOC62d6F06nXbWnrGVPo1H3EeqSNGDHdWa636yfNJ9+g8Mpp2OXdQ5Z1+m7X9Q/AV+m7Z9Q/AV+m7Z9Q/AV+m7Z9Q/AV+m7Z9Q/AV+m7Z9Q/AV+m7Z9Q/AV+m7Z9Q/AV+m7Z9Q/AV+m7X9Q/AUL1bCdkD8BURptDQLbQb1hmQB4/EVo463wrAHDp/GloUhRSsEKHQfE4eunEH9R3yC9/ZWIbRn+1whrIO1QH5/JwtaltL43ITls5AP0NPd4GG856qTpwS1tkvdyalL4OO4vqSTWDEZplPHpOXmJ2jKsMni94lxj05/hoxEzwN2fHQTraMPO8Ddo56CcvM8QTuJW9RSfCL5KaPi8MwuN3AKUPBt8o+Y3C1RpwzdRkv1hvqfh6VHzU14VHZvpaVIOSgQe3xFlvi4eTUjNbH5U/a4F2RwsRYSs9X+qdwvLHMW2qmMMSlEcKtCRVusUWHkojhHOtX0Pil3g7Q4OlZ1dOFGeCtKD0rJVWI3eBtD56+TWFWuDtKD0rOt5lK/Y8WoXuS5/nRjRnKSy76yctDay24lY3pOdR3A6w24Nyhn5lieYZU7UR5NrYKyPUayPUayPUayPUayPUayPUayPUayPUayPUayPUa1T1GsOwuJ29OY8IvlHzOTCjSRk+yhXuqTheM5mWFqb7N9SMMykeSUlwU/bJjHlGF0UKG9JHyY3GUKzj8ID92oJvzhGqpYT1rFQo8pOSpckuK9UDIfRGNX/ACDP9R0JGsQBUBrgYbLfqpFYzd/Z2GBvWrOoDXAw2W/VSPMsYN6jkSSPROVRnOFjtr9YZ1i5jhbXrje2c9OF3+GtDY6UcnzLgm/UT8K4Jv8Alo+FcE3/AC0fCuCb/lo+FcE3/LR8K4Jv+Wj4VwTf8tHwrgm/5aPhXBN/y0fCuCb/AJaPhXBN/wAtHwrgm/UR8POFNIVzkJPupUGKo5qjtH+mlWqCTtit/Ck2yEkbIzXwpESO3zGWx/TQSkbgB9FYlf4e7O9SOToszPD3NhH3s9F3/bMSx2BuRkPM8SscPaXetHKrC7/DWlvrQdWpzPDw3mvWSRShqkg79GC5GT7zB9Iaw+0cp0MR3HDuSM6dWXHFLO9Rz0YMZ1pjjp3ITlSjqpJrDw41fZUk7k5+Zvo4RlaD6QyrCbnATJcNXXmNF/j8WuryegnWGizSOLXJhzozyP2jxbI4K2cGOc6cvdpwlH4G2a53unP3VfH+L2x9fTlkKwixwduLh3uqz80n/wDT8UNO7kObdGNI+1mQPZOjdVlkcatrDnTlke/7RYuk8LcA0Oa2Px0NILjiUJ3qOVRWgzHbaG5KQKxg9mmPERzlnOoLXARGWh6KR5pjCPrRG5Cec0fwq0yOM25lzpyyNYgjcZtbyRzkjWHu04LleWjH2x5gpWqkk9FfrNC6l/Cv1nhff+FQ79ElPpaQVBSt2em4TG4Mfhns9XPLZX6zwupfwpOJYRIGS9vZQOYz0vPNso1nVhCesmpGJITRyQVOd1KxWj0Y5+NNYpjk+EaWmod0iS9jLydbqOw6bjNagMcK9nq55bK/WeF1L+FfrNC+/wDCv1nhff8AhX6zwvv/AAr9Z4X3/hX6zwvv/CoMpEyOl5rPVPXonzG4UcvPc3dX6zwupfwr9ZoX/k+FRsQRJD6Gk64Uo5DMfIuM5qAyHHs9UnLZX6zwvv8Awr9Z4X3/AIV+s8L7/wAK/WeF9/4V+s0H7/wpm+29w5cNq+1sptxDqdZtYUOsHTcbvHgPBt7W1iM9gr9Z4X3/AIV+s8LqX8KhSUS46Xm89VXXpccS2nWcUEpHSTUnEUJk5JUXD92lYrR6Mc/Gm8UsE8tpaah3WJM2NOjW9U7DpfdDDK3Fc1IzNfrPC6l/Cv1nhff+FQb5FmSAy1rax6xoUcgT1V+s0L7/AMK/WeF1L+FR8QRH3kNI19ZRyGzx77gZZW4rckZ1KdL8hx1W9Rz0YWj8PdEqPNb5Wgf9SxV1oa/x5rPZEmG80fSTWD38kvxF85Bzo7RV4jcUuDzXRnmO7RaJPFLg070Z5HuoHMZjcfHyPIOeyaVzjoQooUFJORG0VYrgJ8ME+VTsUNGLvmdXtDQz5ZHeKb5ie7Rerq3bmvWeVuTU2a/Mc131k9nQPkA5HMbDVkxAttSWZh1m9wX0ikqCgCnaD01jL5rT7Y+Xhb5mZ9+jGknazHHtHS0stupWN6TnUR0PxmnR6Qz04z+bEe38uFOfhuBTCyOzoNWW5ouLGfNdHOToxn84t+xpwz8zs6LlOagRy457h11cbk/PczdVyehI3D5AORzG+sP31WumPMVmDsSs6Lt82yPYOnCvzy13HQ75JfcaVzjos3zrF9sePxbK4G38CnnOnL3acHxuDhKeO9w7O6rlIEWC86fRFYPj+Celr5zhyHm0r/peJkObmnd/v0Yzi+Skp9k6cOS+N21vM8tvkHx8jyDnsmlc46bNPVAmJc9A7FDsppaXG0rQc0naKxd8zq9oaGfLI7xTfMT3VOkoiRVvL3JqbJXLkrdcO1WhKSogJGZNR8NS3G9ZZQ32GrlbJEAjhhyTuUNOErln+xun2P8AVYqZcftyUsoK1a+4V+jZn1dz4U9FfYTrPNKQO3SzDkPI12mlKT1gV+jZn1dz4VhxtbVqaQ4kpVt2HRfJHGrm8voByHyMISeFt5aPOaP4acZ/NiPb02m1uXLhOCWlOp11+qsn+a3VwscqG2XCAtsbyno02GSY1yaPoqOqdGM/nFv2NOGfmdmichmd1X6eZ01R/hI2JGmJh2W+0Fq1WwdwVVytUmBtdTmj1hpw1N45AAWc3G+Sau3zbI9g6cK/PLXcdDvkl9xpXOOizfOsX2x4/E0vjNyUE8xvkjQw2XnkNp3qOVRWRHjttJ3IGVYwkEoYiI5yzmRVuYEaEy0PRT5ti2Lw0EPp5zR/CrFK43bWl+kBqmrtG43b3mukjZ30pJSog7xownM4CfwSjyHdnv8AHyPIOeyaVzj8jCVy/wCzePsf6rF3zOfaGhnyyO8U3zE91Yzk5Iajjp5R04QiJelLfWMw3u79FzjJlQnWlDPMbO+lApJB3jRDeMeU06n0VZ02rXQlQ3EZ6MZ/N7ft6cI/NA9s6brI4rb3nepOzvo7TtqEwZMptoekcqmMmNJdZV6By0YTk8DcwgnkuDLTjP5sR7enBH/de7RM1eKPa/N1TnSucct2iGM5bOW/XFDcKxn84t+xpwz8zs1iGRxe1Okc5XJGnDEQSrkNcZobGsdE1hMiM40sZginE6jik9Ry0YPe1LgpvoWmrt82yPYOnCvzy13HQ75JfcaVzjos3zrF9seOu8oQ4DrvTlkO+lEqJJ3nRhGJws4vHmt/noh/9VxKt07Wmt3u83fbDzK21c1QyrDLiodyfgOdezRiiJxa5KUkch3lDQ2soWladhScxVtkiXCaeT0jb3+OkeQc9k0rnHRcY+UeNKSOS4nb36GnFNOJWjYpO0VcZYuOGlO+kMtYdR0M+WR3im+YnurFjmvdlD1QBpwajK3LV0qXpuACZr4HrnTZl8JbI6vu6MZ/N7ft6cI/NA9s6caSMmWY49I6x0YQj8JcC4dzYrF8fg7iHBucGiO4WX23BvSc6juB5hDg3KGejGfzYj29Nouq7bwnBoSrX66/Wt/+Q3VxvcqajUUQhs7wnThqIZNyQrLkN8o6MZ/OLfsacM/M7NY0XlEZR1qz04IT+8q7hpXh2CtalKC8yc+dQw9bx/CP91RrVDjOBxhkJWOnOrt82yPYOltam1ayFFKuyuOyf57n91cdk/z3P7tNm+dYvtjx2MZnCSERkHko2q79OHYnFLY3mOWvlGsQy+KW1wjnq5IrCcTgIHCqHLe2+7zjE7aok9iez17e+ozyZEdDqOaoZ1ieHxq3KUkctvlDTg+bquriLOxXKT3+OkeQc9k0rnHRa4gnYaDR37dXvp5tTLqm1jJSTkdEGVwTMhhZ8G6n8dDPlkd4pHMT3Vif54e92nCHzV/WdNx/f5HtnTYU6tpjezoxn83t+3pwj80D2zpxHJ4xdHcuankjRhCPwdvLh3uGsXx+EgJdG9s6cKSeGtgQTymzq6MZ/NiPb+XarQ/cMlJGqzntVVugtQGODZHeevRjP5xb9jThn5nZrG/k43edOCPIye8fKu3zbI9g+Is3zrF9seNmyExYrjytyRUh1T7y3V85Rz0WGHxy4toI5CeUrRfVG43lmE3zU76bQG20oTuSMh5xdonHYDrPpEZp76wjL8G5Dc57Z2ClAKBB3Ve4ZhXFxv0Dyk92iO6ph9DqOck51BkJlRW3k7lDxsjyDnsmlc46MLfM7XeaxbbsxxxobRsX/v5DPlkd4pvmJ7qxk1q3BDnQtOnBbucR5vpSrPQ4rVbUo9Azp9Wu84rrJOhCdZYSN52VDb4KK0jqToxn83t+3pwj80D2zonv8Whuu+qmlqK1FR3nQiXIQkJQ8sJHQDS5chxJSt5ZB6CdOEJPBXAtHmuj8dGM/mxHt6cOWxm48Nw2tycssqxDZ0QGm3GNYpJyVnpwdMycXFUdh5SdOM/nFv2NOGfmdmsZN61vQseivTglzwklvrAOl/E6m33EBhKglWWedJxWPSjH+6rbfm50oMoZWknpNXb5tkewdNjitzLihl7PUINfq3B6lfGnMOwQhRyVsHXSt50Wb51i+2PG4xnZqREbP3l6cKQuLweGUOW7+VXCSIcN15Xoj8awlGU4t6c7tUo5A+dXZJtV8blo8k4dv+abWHEJWnak7RWLIXGIQeQOW1+WnB8/VcVEWditqO/xsjyDnsmlc46MLfMzXeacQlxCkLGaTsq8wFQJim/QO1J7NLPlkd4pvmJ7qxVDMiBroGa29vu02O4fo+Xrna2rYoUzMjvIC0OoIPbWIrw03GWwwoKdWMiR0acNwzKuKVEeDb5R04z+b2/b04R+aB7Z0Yxk6kNDAO1w/h8uG8WJTTo9E502sONpWNyhnWM/mxHt6cEf917qukYS4LrR6Rs76UkpUQd40QnzGlNvJ3pOdMOpeaQ4jalQzGjGfzi37GnDPzOzVzj8bgus9Khs76WkoWpKthTsOi0zDAmIeG0biOyo0+NIaC23U5dpq9XhmLHWlpYU8RsAonM5nRgyMS67IO4DVFXb5tkewdOFfnlruOh3yS+40rnHRZvnWL7Y8ZOkJixXHl7kipLypD63V85Rz0WiIZs5toc3PNXdSEhCAlOwDZWKJCpMpm3sbSTtqFHTFitso3JGXnV9h8dt60DnjlJrCc3hIxiueUa3d1LSFpKVbQavMIwZzjfo7092hlxTLqXEHJSTmKtstM2Ih5PTv7/GSPIOeyaVzjowt8zNd50X63ifCIHlU7UmlJKVEK2EaGfLI7xTfMT3URmMjurENoVDdLzQzYV/x+VFjuSXkttJzUatEBNvihsbVnao9Z04z+b2/b04R+aB7Z0Yok8PdFAc1vk6MIw0vPOuupCkpGQzFcTjfV2v7RXE438hr+0Vi+Ill9pxpASlQy2acLyOHtaAec3yaxn82o9vTgj/ALr3aMTROLXJRHMc5Q04Ql8LEVHVzm93doxn84t+xpwz8zs6MUWk6xlx07DzwPz+VDjOS30tMjNRq2xEwoiGU9G89Zq7fNsj2Dpwr88tdx0O+SX3Glc46LN86xfbHjMXT9d4RGzyU7Vd+nCcHi8QvrHhHfyqbITFjOPL3JFYZYVLmPXB/r5Pnl0QbRe0S2x4Fzf/AJppaXW0rSc0q2isUQONwuEQPCtbe8acK3Di0rgHD4Nz8D4x/wAi53GjCk5nwDn9tcRlfV3f7aw2hTdpbStJSrM7DpxPal8OJEZBUF84AdNcSlfV3f7aahSeER4Bzf6tI5ie7Q4hLiClYCkneKueGsyVwVZfcNSLdLjnwjC/hRQob0kUiO64ckNLPcKg4elyCC6OCR276tltYt7eTKeV0qO8/Ixc0t2C2GkFZ1ugVxKV9Xd/triUr6u7/bWFm1tWsJcSUq1jsNPr1GVqG0gdFOxZbjillh3MnPm1xKV9Xd/trDcUxbYkLGS1co6cTRTJtqtROa0HMZVxKV9Xd/triUr6u7/bWEuHYkuNutLShYz2jprFrS3begNIUo6+4CuIyvq7v9tcSk/V3f7awcw6zxnhW1Izy3jRimEZUELbTm42c9nVXEZP1d3+2uJSvq7v9tWMSodwbWWHdQnVVydGLY7zs9sttLUNToFcSlfV3f7a4jK+ru/21h1Cm7U0laSlXUdBGY21dcOIeJch5IV6vRUm2TIx8IwvvAzooUN6SPdSGHVnJDaz3CoOHpcgguDgkdtWy2sQG9Voco71HedF0SVW98JGZKa4jK+ru/21xKV9Xd/trDUZ9u7NqcacSnI7SNDvk191KhSdY/s7n9tcRlfV3f7atMSQm5RlKZcACxtI8Xd5qYMNbp525I7acWXFqWrao7dFlhGdOQj0BtV3UlISkBO4VieSqVKat7G3byqgRkxIjbKfRHnl5hibBW16W9PfWE5p1Vwnue3zdGIoHEpx1R4JzanRuNYeuHHoQ1z4ZGxXnGWdFls70J+FBCRuAH0MWW1b0JPuoISnckDzfElw47M1UeSb2Dt0CsOQOJQQVjwrm01cpaYUNx5XQNg6zWFoqnnnLg/tUo8nz7ELCoFwbuEfYCeV31EkIlRkPN7lDOrzBE+Etv0xtQe2nEFtZQrYobDotE5UCYl0c3codlNOJdbStBzSdoP2WxTcuLRuAaPhXPwGnDFv43L4VY8E1+J0Xp1d1urUFg8hJ21GZTHYQ0jmpGXn02OmXGWyvcoVh+Su33By3yeaTye/Ri23ai+ONDknYvThO5ap4m8dh5h/x9lZ0pEOMt5zcn8amSVy5K3necrRFZVIfQ03zlHKrdETCiIZR0b+01iC4cRhHV8qvYmsLQCxHMl0eFd/L6AxRb+FaEtkeFa391WC4CfCBJ8KjYqnm0vNKbWM0qGRq7QVQJamjzd6T1jQhRQsKTsI2irDcRPi8ryyNih/n7Jk5DbWI7nx2TwbZ8C3u7dOFbZwDPGXR4RfN7BTq0tNqWs5JG01GSq/XkvLH7O1+VAZDIbvoAjMZHdUpK7Ddw83+7OUy4l5pLiDmlQzFX23C4RSB5VO1NLSUKKVDJQ3jRbZi4MpLrfvHWKhyESo6XWjmlX2SxRdeDQYjCuWeeerThy28ek67g8Cjf20BkNlYlnKfeTbou1Sjy8vyq1QkwYaWk7/AEj1n6CucNE6ItpfuPUaw9NXDlKt0vZt5BOjFdr/AO8YHtj/ADpw/dDAkajnkFnb2dtJUFJBTtB+yF9uabfG5O15XNFOLU4tS1nNR2k6IMVyZISy1vP4VAitwoyWW9w6eur5cBAiEg+FVsSKwxbiM50na6vm5/n9CYltnGG+Mxx4dv8AEVh+58ej6jnl0b+2lAKBCtoNYgtZgSNZseAXu7OzThi8ahESSeT6Curs+x9ymtwYynXPcOs1OlOTJKnnTtP4aEpKiAnaTurD9rECPrLHh17+ypLyI7KnXTklNQmnL7dDIe/d2/8A3KgABkN30LeYjlqnJnQ9jZO0dVW+W3OjJea6d46qmxW5kZTLo2H8KuMNyDJU057j1jThq78YQI0g+FHNPX9jZUhEZlTrpySmrvcV3CSVq2Njmp6tOFrTq5S5CdvoD/Oi6yXLzPTCieRB2moMVuHGSy0Ng/H6GeaQ+0pt0ZoVsIpBdw9ctVWZir/KmnEutpWg5pO0GrzbkXCMUnY4Oaqn2VsOqbcGS079CFFCgpJyUOmsP3dM5sNPHKQn/l9i3nUMtqccVqoG81fLsq4PZIzDCdw69OG7Txtzh3x4BP8AyNAZDIbqxJc1Z8SibXVbFZflVitgt8bleXVzj9EXKE3PjFpz3HqqzzHbTMMGbsbz2HqoHMViC0pnNcI0MpCRs7aWkoUUqGShv0MurZcS42dVY3GrFd0z2tRzkyBvHX9iXHEtIK3CEpG81f7wqc4W2dkcfjpslrXcH9uYYTzlUy2lltLbYySnYKv91EFnUa/eF7uysOWst/tkva+vaM+j6KvlsTcI+zY8nmmrBdFtOcQnbFg5JJ/LRiKzcaBkR/LDePWogg5HfoZdWw6lxtWqsbjVivCLg3qL5L43jr+w7q0tNlazkkbSav15VOWWmcxHH46bPbnLjI1U7GxzlVEjtxWEtMjJIq8XFFuj6x2uHmpqx25c1/8ASE/bntSD0/RmILSJqeGY2SE/jWH7vwn7JM5L6dgJ6dGIrJw2tJip8JvUkdNEZbDoacW04FtqKVDcRVivSJqQ0+dWQP8Al9hX3m47SnHVaqB01fLwue5qN5pYHR16bVb3Lg/qI2JHOV1VBiNQ44aZGQH41c5zcCOXHN/ojrq2QnrxLM2ZnwOewddJASAAMgPo3EFn4f8AaYvJkJ27OmrBeOM/s8rkyBs79GIbHw2ciKPCeknrpQKSQdhGhKihQUk5EbqsN+D2TEs5OdC+v7BzZbUNkuPKyH51d7q7cXdvJaG5Gm1W524PaqNiPSV1VBiNQmA0yMh19dXCa1Bjlx09w66hRn79NMmVmIydw/xTaEtoCEDJI3D6Pv8AZi8eNQuS+naQOmrFeeMAR5XJkDZt6dF/sglAvxsg90j1qWhTailYyUOjTYr+WsmJpzR0L6qQpK0hSSCk9P2Aut0Zt7XLObnQirhOenPFx5XcOgabPanbi7s5LQ3qqHGaiMhplOSRVxnNQWC48e4ddRI0i/TOMSc0xgdg/wACmm0MtpQ2kJSNwH0jfrNxj9pi8mQNuQ9KrFetciLO5L6dgJ6dF8syJ6NdvJMgdPXUhhyO6W3k6qhps95dt6tU8tjpT1VClszGg4wrWH5fT16vyIubUXJb3X0Jp51b7hW6oqUek6bHZVziHHc0Rx+NMMoYaDbSQlI6Kulxat7Os4c1dCeuoUORfJXGpmYj57B/gU22ltAQgAJHR9J3yzImgus8mQOnrqz3hcd3idyzSobAo1nmMxV1trNwayc2LG5Q6KuMB6A9qPDZ0K6DphTHobvCMKyP51Z72zOASvJt/wBU9P02+82w2VvKCUDpNXnEC5GbUTNDXrdJ07zVjsBc1X5oyTvCOukpCRkkZAVebs1b28uc+dyatlseuj/HLjnwZ3J66QkISEp2JH0rd7U1cW9vJdG5VQbjIs7/ABW4BRa6D1U04h5sLbUFJO4ipUZqUyW3khSTV6sjkE8I1mtjr6tIJScxvq0YiUzk1MzUj1+kUw83IbC2VBSD0j6Yut6YgDV8o96oq4XB+e5rPK2dCegaY7Dkh0NspKlnoqy2FuJk7IyW/wDgNF7viYubEXlv/lVnsq3HON3HlLO0IP8AmgMh9Lz4TM5ng309x6q/bcPP7M3Ih+FW+ezOa12VbelPSKIzGR3VecOhzN2DsV0o66dbU0socSUqG8HTAnvwXNZheXWOg1ar8xMyQ94J7t3H6VlSmYreu+sJFXXEbr+bcTwbfrdJpRKjmdp02u0v3BfJGq10rNW63MQG9VlPK6VdJpa0tpKlnJI3mrneXZjvFLYCc9hUKstkRDydkeEkfl9NOtodQUOJCkneDU+0SLc9xq2KOqPRq0XxuXk2/k2/1Hp0XO1x7gnwgyc6FjfVztUiArlp1m+hY3fItd+kQ8kL8K11HeKt90jTh4JYC/VO/wCkVrS2kqWoJT1mrniVtrNEMa6/W6KlSnpbmu+sqOlCFOKCUJKlHoFWjDm52d/+um0JbQEoASkdAqfOYgta76suodJpbk7ED2q2C3FB91Wy2sW9vVaHK6VHefp272JqXm7H8G/+BqFd5NtcEa5oUUjcrpph9t9sLZWFJPSKWhLiSlYCknoNXbDe9yB/+v8A1TrS2VlLqSlQ6DpSSk5pJB6xVtxI8zkiUOFR19NQbhGmpzYcBPq9P0atQSnNRAHXVyxHHj5pj+GX+FXC5SZ6s3l8noSN3yLZaJM4jVTqt+uatlqj29PIGs50rOi7X9uP4KLk692bhUGzyLg9xm6KVkfRplpDLYQ0kJQNwH0/NhMzWtSQjWHX0inoM6yO8LDUXWOr/dWq9x5oCVHg3vVOifb485GT6NvQrpFXSwSIma2fDNdm8Vu36ULU2rWQSDVvxJIYyTJHDI6+moN1iTB4N0BXqq2H6JddQ0nWdWEjtNXDEzDOaYqeFV19FTrnJmnwzh1fVG75EWK9Lc1GGyo1a8Nts5OTPCL9XoFJSEjJIyAqbMYht676wns6TT9wnXpzgYKChnpP+6tNjYhZLX4R/rPR9g7pYGZObkfwT/ZuNR7nOtLgZuCCtrrqFOjzUa0dwK7OnRcbJFm5nV4N31k1cbLKhEkp12/WT8gHI5ioN8mRchr8IjqVULEkR/IP5sr7dopt1Dqc21BQ7PoSZc4kQeGeTn1Daan4oWrkwm9UesqpMt+SrN9xS/kMMOvr1GUFSuyrZhknJc9WX3E1HjtR0ajKAlPZS1pbSVLICR01csQjPgbcnhHDs1qg2ORMc4xdVq27dTPbUdhuO2EMoCUjoH2FfYbfQUPICk9tTbA7Hc4e1OEEehUHELjK+BujZSoenlUd9uQgLZWFJ7K376uNiiy81JHBOdaauFjlxMzq8I36yayy+RHlPR1ZsuqR3GoeJ5DeySgOjr3Gol/gyMgV8GrqXSFpWM0KBHZ59JnRow8M8lPvqXihlGYjNlw9Z2Cpl7myc83dVPUnZRJJzO/5EaM7JXqstqWeyrdhgnJc1WX3E1FiMRUarDYSKOwbauV/jRM0NeGd6huFIjXO9q15Ci1Hq3WuNBT4JGa+lR3/AGJnQI81GT7YPb00/Zp1vWXbY4VJ9XpqDiTVVwVwbLaxvVlTDzb7YWysLT1jROs8OZtW3qr9ZOyp2GpDWaoxDqerpp5pxleq6hSFdR+SxJfjnNl1aO41GxLMay4TVcHbUbFEZex9C2z8aj3OFI8lIQT1E5Ggc93mzrzbSc3XEpHaakX+Azud1z90VJxUT+7M5dqqk3mdI5z5A6k7KJKjmSSe35MK1S5nkmjq+sdgqDhhpGSpa+EPUN1MMNR0arKEoT2aLjf4sXNKDwrnUms7rezszajH3CrbYo0TJShwrvWr7GzrdGmjw7YJ9bpp6xzICy7bHifu9NRsROsL4K5MKSodIFQ50eWnNh1Kuzp0SYzMlOq+2lY7RUzDDDm2MstnqO0VMsU2Nt4PXT1o20oFJyUCD2/KZmSGPJPLT3GmcQz297gX7QprFTo8qwk9xprFMY+UacTTeILev+KU+0KbucJfNkt/HKkvtK5rqD3KrPxClpTvUB76XMjI50hof1CnL1b0b5KT3U5iaCnm8Ir3U7itH8KOfeaexPLV5NKEU9eJz3OkL92ylrUs5rUVHt+VGiPyTkw0pfcKh4XfXkZLiWx1DaahWSFGyIb119attbt1OLQ2nWcUEpHSanYkjM5pjgur/CuDu1555LLB91W+wRYuSljhXOs0Ng2fZCVEYlJ1X20rHaKlYa1VcJAeKFdRpNyulsOrMaLrfX/91Dv8OTsUotK6lUlSVjNJBHZokwY0keHZQrtyqVheOvbHcU2eo7RUnDk1nagJcHYaejvM7HWlp7x4nMjpNB5xPNcWPfSZ0obpDo/qNC5zR/3Tv91fpWf9ac+Nfpad9ac+NfpWd9ad+NG4zDvlPf3UqU+rnPOH+qitR9I/HxIBUchUa1TZHMYVl1nZUXCzp2yXkp7E7aiWGDH/AIfCK610hCUDJCQkdmiZc4kQeFdTn1DaafxE8+rg7dHJPWaRZ7jcFa9wfKU9WdQLPDh5FDesv1lbfsqpIUMlAEVNsMKTtCOCX1opVnucBWtBkFSeoH/FNYglRTqXCMe8DKot8hSNgc1FdSqQtKxmkgjs0LQlY5SQrvqRZoD/ADmAD1p2VIwq0fIPqT7W2n8NTW+ZqL7jT1smM8+Ov4UpCk85JHf5k3Gec8m0tXupixT3f4Or7VMYVeV5Z5Ce4Z1Hw1Ca8pruntNMw47A8Ew2nuGmTcYsbyryR2VJxOjPViMqcV1mtW93PeSy2f6aiYZZSdaW4p1XVuFMRmY6dVltKB2D7NOtIdTk4hKh2ipeHoL+1KS0r7lKsVwiHOFKzHVnlQul3hbJbHCJ6yKj4nir2PIW2fjTFyhv+TfR8aBB3bdK2GnOe2hXeKds8FznRm/cMqcw1AVzQ4juVTmFGv4chY7xS8KO+hIQe8UrC8wbltGjhueNyUH+qjh64D+EPjX6AuH8n8a/QNw/k/jX6v3D+V+NDDlwPoJ/upOGZ3TwY99JwrJ9J5oUjCnryfgmm8LRRz3HVU3YLej+Dre0c6agRWuZHaH9NBIG4AaXpTDPlXUJ7zUjEUFrmrU4fuinMRSZB1YMX3nbXE73P8u6WknozyqLhhgcqU6t09W4VGhRow8CyhPu+0Mi3RJHlWEH3U/hiKvyS1tn40bDcI+2JLz7M8q4xfonPbLg7tak4lfb/eYf+KaxRDV5RDiPdnTV7t7m6Qke1spEyM5zH2z/AFUFpO5QPi8xS32kDlOoHvp26wW+dJb9xzp3EkBHNUtfcmnMU57GIqld5r9K3iV+7xtUdia/R16l+Xf4Mdqv9UzhZGecmStZ7BUayQWNzIUfvbaQhKBkhIA7PtQpCV85IPfTtshu86Oj4U5h2AvchSe40vCzHoPrTRwy+nyU0j3V+hbsjyUwH+o1xO/N7ndb+qv/APRJ6CfeK4fEA3tH4CuN37+SfhXHL9/IPwrjN/P8I/AVrYiV6BHwrgMQL3r1f6q/RV6Xz5QH9dDDkxflZv50nCqP4klZ91N4ZhJ52ur301ZoDe5hJ76bjst8xpA93/5N/wD/xAAsEAABAgQDBwUBAQEAAAAAAAABABEQITFBUWFxMECBkaGx8CBQYMHx0eGQ/9oACAEBAAE/If8Apv1vDCq4855X0MF3gKb9xL/Jpe6n6egisgcP6koOk0X6qyqkjNPgGKZQflRmBYmT0BhB4GapIyr1Rwq5D2RPeKFJwWyYKqKYPqw67CVdLIJmA9LDBE9eQuiEIJ9GrY1wX3lk7A2RcA+Lp3S9XZPDl/0mQGWBAHA/IkOWVqLB05MgjIHsjeqcOE5AYPDYdEDEsuJ+aAFEO1YK+zByECdQuUGE77BHJtoNEP8Ah1+dQd5Qao9yoFcfUTqTT2Gk0NobLpvggA5AjKGWkhlO5LtA5W0/KGmUPgoHxQD7ISAdpPfq5fG+rDiyeIpwCVCJi70kICBjic4OTFRMgU1iUdQZxkJyGkHJ8mWCdEac9m3EEiiOOdzU1OGE8gGByTQFADOHg5cseR85lexM6PAdE5ca1xMSDwHCBGXxVrwXJXK2HzR8eTwEseHf3TR05OBMnjni2gYRoNzzRITmxBSAmEkra4lRkweEAahehPjVNPGjQFDsHUczJt4MCaAnGbopsdbQOLVyWVLATqLyEkaH2hI0L2lyWuWHxEnH1xElOZfBQbZlIkvD82TaQCwWeQTTitg/s6CsxhE/pCJsYQcDFjCSa63I2uGiBN95IeFloCQAKAeo1BuCH8wFBJpeqEZVLoPV1DJU7AWmeqp5YhyLMUzHqcGVUIsFlAsDVaQIIlMI9BXBJCECROUPNBoQwt/pO4OOQfDakACIzMLIEJcEXppvqgw6XCnQQBmjo4rZPTkDR5GQWcc+Sayb0CbpdZcm0JyNuzATL8cUInOULJ4J45ZEEFiGPoBZFQ0iEzFakgQdsUsiUgpYBMF9kEPMPddO6N2XA+EkHCYBEsGYBVlljlyQFYN0+CQEea3FTFLV5ojhOTf0ZdHeRoYHoEYmCktCArfuGskOoGsEyiVj6NQMJFD8U0WshFEaJLCrGEDZyKp1h5JobN9y+DGXOyRs+c7f6Qkgjt00hxwXoqUNc7+gAksE3JUbcKqJodleyPpAKyjhYBTSAD0CgcuSAapT+4V7BhJgHsWmgY8qFml0O2q6o/SEAjlcfAqkQCLCww7JkINdcIECaARuDgFGqpBRngkrmIac7AJ2IL4Mh4DD3IBvaC08WeT4mpoZDUF6AaRXD9BNuRgk4oCETN2Q90GEvYuOBstXEfAB6P2YJ7oJkPE0MBa0iuxQkKGsGk0VwljEGESUATwHOdDgxyee2mRBsOE8nr38RPaAavQBgd8vZdCAyrJsA6ciqCYaJgh5P8EQBxMe+EsJphrh04aMSqFiiICNRAp3AkGYPaLLjEKZL8fQIjAuzfcVUNAHXVEhoiwfWCNKIBGQ6JQBKNJgKGQVBV1WtQowzK93Ye9TNjoHB2LYLE4BDzRqttESHDIIhbPsCrEiiCB5fuFIVUmEAAGFPdCzqyECdXfM6IwDEWiAlxB2QzmEgJXoE5OjJ9I8u8qj3hnOaiDEHcB/SgoAQXzLFeOKZxIwA5U9lceRkKs7D3gcEMIlqRgWBZiGw4JBWHksgRJIgouyghom87K3u09LbNUnnHUGCCwCyE8Sh1QlJAmWYheY5BBQsUEtPvdqGxWKVGJMIhAUIRpgCQBKCUIUsNmkftOtf2gQ9yKbQZf9yn4kPEUQUkkAEeG/WSP4xMRkwQVRXRC/jAPvwQSrQ1DxgieImPFB+DcAi1kb/WgDQP8AVAuHEx7jKiPpZlToE93FAAABgEZgkTNkK7Pcl4BXvgtCXRrD4BJdlK+0ZAVuwi9z8L5hD8dGmQYH/MqelfDUQHByv7cUShB/sVr5A+ZQDBghk6L8TRs00SYF6EoAr0NLTUgGDCnwJlo4iGoTRAkYmDJ2qupIiSY35Qo9cEuxNECHAXHtpyYA668mABggADCiAbJy8VUUlJKkwl90CAwAtHwUEoHMFEof8eGIErLyKIyZuOOcippSPvHthWMCx6khNdGiCWJAAIDyB8GKKSklSYF2mwLodABme0fBwtjcXRQEr/CYzBLjNFOEfXlDoU9jMOBbX2puHnJRB0lMECOOwsnUuOXCh3RrkvAm02BdAzLM9vwkJcNiIqCT/wCExHSi9PNADDsLom0ZFrzJzwA5e72g7OJgko5RBclGEp55o/AMrGJ6zHJgDIlMAugdQeT4WOqCxE83maORiSapO8GQIeEyQzqzwJIl7U+zoTAmuIkEmc9MRBzRRWoggDmVUByxP134aynfJFN4YCOY5diD9iuLoJdSniqEhbB7KRAB0klWobwYoqOJgkozif4uMax9mGKHw4JeLHJ1cYDYinAWQeSQwdyGGEgpbk83fz2QIR2KL4M4XwQAAwonnA1aJrDEmQPkEwD4SRUysNPWy8TGIhpxLEtAyszQYI4DholrG4ZGrTOd7EUbgmfihNzwTEIPMokD/wCoRBBbi8ByzLQITgPmcfhBRhOHxQ4uAhLzKeuWwDz0MIiVdN3SDSJkhhNIFrhxRoXcaewv/RCxUvpVSDNsHE/WA0cDjAMAgQL6Y+EKNEhmn6+NdiEQLlIhHKOc+dhG39nKBVOw0RsLuxseKG/lBmAjwnMhADBgs6YiK7kkNzih8EyT50yDORMYQsnO+CUJFyMAhWqmY7IDCTqEPhjNrAuTOke2QzHQUkJNCGYdY89/m1kFvQKgbCBPQPXIdKZEJZ6AHLZAW+BnSNgKkmcrHWYqyD2YbBCfHmujMoB304Z7RZoSiJdIMggMGYKfpuDsRv2bm+lDpkMSgxkjmFEsHNEd1uJ5wAJLCqkjf4D4IaaOYug45iWhJADlEn5KLB0wCCxUO7QQCGNFLQ4JlAjlQVW3FM0CvIhCgNS76PZKAgegEjw24FcUYVizPgBqMgik7MQQA9dkzAYwhhtCtuRyUJDiKQ92bBBieQkoly5qpTYGe2HCOQkHu7cDArCdZQjbgcFWAC2e4RSZsb2xvRcbE9qWBdRRU2A5KclMbglNAFQcHPH344A5kKg+JrWrBDE/qnUxrE5yCQleWhIA5oEYovEdBodMCFGgOY7dk3raJ0fSNUp6TuCD5giJ6jezxOAS4oH7MiZWlhaLOWXq98JYTR0Md7lS9KCI03IBTJWBEZsgFxmDaFTcjkq8WXUHsw2CDmemi5RmV9qq3AwW0jIoBLkQgDBqbxJGIcDgoJ2C43TZJibzcGepshNORTjdDMRgmUN5ms5IDSYkBBDMHM+9DMVgTWMxepHATLkImrza/UowuH/6GNf8A/hnQEAHMgjlT/qIVjnYEEDGbgCqV1JjYx8rJJBDgKBDOZId5SqQA6BZ1bmkjT/YjRev7vYTIV3FGyErCmRfKKfZokeQod+mnJkCiMxaCrsZTTS9Es3EA7gQ9V+Qvzl+UiFK6SQhBQCwQR3bIPTMkBnk20Im5HJQuCpzBB7s2CBewOFzCfPzm5R6uGxqgpuUCUty1AuHCBrOH4kEMjlPd5I4XIJzlF8Ewz+wgPdzsIAPsArNwuiLBTYERHJAZa8bvsBbIIkg7GCHJydyk9zITNV/7GOUYZ3ehAQRyMCJaQckN5zsAhQFO5qi0RTm36OpxBWaXTUN/wDP3d5PYrp6C3+EiqKYYtcjoVEB/l7A/DVRB05Uqc03hJ1ID4RylVGn2SYovJOxM8EBcQ8bFsD9ueNnAnknGHBLYuQ/2ZIBGlkopO5HJQsipzBBbsWCEubkl4O+bF90gYOgAjhbBIwerIkglWDtEcRilIbsabyjuoEjYAwCkleMoBPEQ/w9/J9NhTWy3oQxUxwFk27EifM0Dskaw2RrpYYWaGZgHG2lVzmwXRmt1jlYmd0JKyQ3EBcp3LC+5SNgAzoCFa5YQK5A547oKcAtAjSsOCaWaih3M+Oyp6vdVYNpOBcBzqiWDmiYkvy1AjM5PQEpgDDf/q2P1FLGIPOsAkaDljZGcofw2phpgIwRaUwQetNoh5MPBkhfNFKci5TGAA4gQhKapPTwWiwz19923REdUX7W2pCbXHiwnI4fNurcVv6ZSJbjkp6jcUxPCZD/AH38yrHqMUXkZD1guYMoaCybIR2ltbkZrAwHr/qY1BSmd3qFC52BUORzx3YHVyyVahwPL7oiHDGiK5iHGY3V7r/cChCoCSnNCAcsKp+B38z382VO7bAiTioRgi2ykNzaKTdkAyhbhEBiSubODMhJAGcgMMa6EIScn1YQjmQbuxg7lChlQgJJN9KBMIdFD3MOoEhpxdGqBqy5+RCVs3CBAzBvxVXMleQWmx/yDARyNeqbF5bbQH0SCCZ1TimCXk6JLhOfWPFywqEg547wkd3pFwD8osmHD9IT1p49zaw9yJoUwg1jK4Y5gwqXGDv7E90XQbJ9jJUmGDTjscnQrJT2QyLPCqHyBgNn9wg3lVRSGrEFByEmmoQ6IMh7tc8Tc8RBjogDrBOokeGL7icPfiDssKPssctiRvR/hssZNkdqddmKWJYTEjDnjvSQg0txhPZuQFAuFillzkdzl2jfaDRGTnjCkqAQSW34j3AzoNnUyTAIrJUTZMd7tiOGz4ivzcGnszYiQVXgFrYnhyh7jM9UClNxAlg5Q1SHAdS0GsM1nCEvKnwQ30owDpGH2mH3nG4WyP4djfVUezAcwAQaJzOO9mPEhG8hm0piile1dxZ6ZfiCfqASoRDFoA5Qt89+ovf4BsxMoikDMzKZYPXsmjjR2ApLFkrrS0Gzw2nfDK5KkHXMnsnFDtka9bjKumxc8PSfDF4EXYE99BSKpHdc/ZqZLOgAcoEs3QbGYthkt3k+zHOwAQ2A4T474IcEFPkG6R4P/RIQ4ZYKEgaHcTAzNLcINfHdQt9cpJscNnIFAJga8xugQ4RdjSn6wLvH1nxZINzUDIe0zWH4LOjDSqITega3EYu8+qAgGgbrF27b4GoDODMpws+zJ6PoBw22Nmf9RZTH9V0Kn22YZ3EQHjEY780s4GAXSCNuJUlXfy3F4pxhhL98GytJliDfB9wF2YqXbAsXUcbvRpa8tk0Zf6HpPkx6HjJfbPu0Dv6RoAFivBAyZyoIJtrrcDW8hA2oZnx30N7yAAYlHBcibOcnc39Jlr2yVNR6XhxgNmD12BCYFzM+xAzqwQ/kDmFmNuBlqDcGDIMDB3TfHRYXsw1XKxUdgf0zCV22KJmgD0KkZr2vbE9sRFj4Lqs6Mnpg3ckz4zw08LpvbeLjLik2Uhs3l3cXUenEsnsppz6BkVGl0GzGagBgC8cT7Bx6RbGCWhEG1iDbksFwCYDcQHi4dve8baz7MPdzsCAAUu+pnABPBdGxwFNEu4CwrL7OMzMPYTFjcwH0LSzloHbnSoHIlRTwYN6lcgJcUMU+zQ9OZge+wa49i+MRjcL0/wABsweuGKnVMPM9hB9REpfiSB1ROe3usLxarot9Mh5d3Nsw3XIxYKTmwSsobI4DcDkirLDXkumzZh3P2UHSe24m515UCVELQYt5hC5DDihq3bjs8/xrsTAivsWZB0AJfdEB6HS6DZgLdkQxg0zM39iJtZEJ/iSNlAbeJiCPRIAyCAwHHt7yYPdLZwFuRgEE+O4tj4eiNllCjRTznbZ/Y3/sbgjYxH0LULVqDcCd7wG5nho4dN4dVYUPQ7cnZ1xbKH3cwc9kT3MoC4MNkJpwgWcGZn2Pg0i+MV2Wuu4nTuAHPYLAxdBw49jeJ29hfZzDmFIIqZF3Nsr6IENsSJM5MR6gC2Uxqo44+yNTBRc2K6rKr9U0sXbhK/IwPmGZOd/d3mThAzLkcnZsb6b7NnkEZOlJhsczZUBIgHEbEEMmIAg7j2e+bCDYeY3GE8i4QwL++GWWmWId2ZHcg57OYUwpBSJOc7SSDbGeK48U3Ak/4bGg9/oPsrAV4ATMHA4LcLKodNwHzKIWYBPi2JjdndQJHdMAOSi1iHJ2ZERERERDKwxJZ7XXz2NQwYqZYtRsAGHbEABmXH2XAh+BhtkslUItKDxQBgw3B4CrKuW66JmaxTMG6ErB1de7ZkAAclfekG1ON9iOycFiiHqEcaNfy9edO2Nz7MxwZB0YaRzCUpjpDobg5BVS/cPQsUXmLvGe6AI8yWM0RcNTs5zHMLbahvwxQ4mdNiQCREyV/ukIQAxHpEQ7YhIiS9lJYOUY9CPOJJTJTrMST03GSbpOy/oT6XUMYrBHhN/luZTAHSA2zM5znOc5xgATSpiPjE24GKByqs1QGxO5Ek4uKtqfpyIaIBJYKaBOJa+zZ3JEuXNYTxWT3TtKD2B7iFwqFHlCgNUJOUTjDNUeO5+BkzRElzXZzQP8XcTyQVpeVRSOrBsMOSzU0n+/2hEtOrLF483KMsMoS9mbkyETihMZQzFnFP8AiY3JiYA9kGtFzwhSMCGZcHch08eJG6/OX5y/OX5y/OX5y/OX5y/OX5yBS3STHFuakGZTMjBH4C+vIqYhiA66zA9ADotX96ywAkwuLL2gnBOMAtUEsgYYloaWiyJW5EG2Ls9QgCaBSQUjwxeEzSe5fl1+RX5FfkV+RX5FfkV+RX5FfkV+RX5VDdiupAj+BoTucq2hlEMFyBDeWD2qUzSHhCTbiZwQDBkVcPncoblJYseCYhM8aEYWFkgCxg5KXIPkZj5tKhoKDPqFqUEjQB0Wf5A6ncw0sVDyTRaS/iKaINzxB6D2QoFw4+ROxP00WEX5ZTcm44q/ucG6SDQFxkUJhSprABc4qpu9tS+RPZdnxQH84gKgqhGvxx0CCMSC3RvtycyE9uXGBMcdDGEwnxnuAqaB0QFkslVjIiwiQSEICgNdJkaAvOJgNMEngnLJO5nVGUExE0x5gogRMqCCstWSrJVkqyVBos4CYFhorBWX6WxEAkrQLJVkqyVZKgQ2rJSWRBkr4oRHiomTCVgoqI3qcZBHmSySczIzRvDMRNGg/wCKPV0RBWSoCreUAJ2gOiAs0JQeakbcaBiyRzJuBmjgdCcNV0/0hul8sARDFmId0AYNCmEDDxqB3JgRDGR5g3BnUQdoJxMtfrvTM3RIMiX6sozIbegGEUguE5zphBuhNAL7AXUd0JhSj0lQCOzIcXQfXjNRSS4gTyc497Awc+OSlTeigwiEBcLgDINUPRTwGEfdRuIhjI3LFYt77YRgmo6o9Uc2V92cNmX0VIKaF4yjVR0HcGdRERChGUBc9EzdERB5HMpyMblA3SiAQMSHUTPJyhEgTbTMo0AgsQIOEWThGyjoAg2SLtRFTwfhIeh3VDxR6DGzAOvjlTc0RQfjJhyMPJzj3qEaQEyg2Mz+6ADlhVHynFQpKiUpwEij80A4ejngMI+6jcBFOcf/AEoD7ccFS/qEJP8AGFbaH13Y4LXFHaL8chBYanSQE2Ixg5NAfw3BnUQModWmUOLm6IjHrPitmjXigB050WKSURjA1DECC2GkhgDxYsaiIkNRUl+uVUgsEhTm9o9B9NtG6aJuaSgQCp3V0y8nOPeo5u3UImOQB2QQPRcI5OpoDlTgtPTQDjFGK6uo3ATxpeNIpTkcwanJkhIAcp0xB9FG7hjcskRVnKfEQk6c4vAnE0FVYHtxnUQNQPtwwIE4cQrCfqiJuiLCeOCvwgQ4VEodyLjFyR2EMdjYdINS+ymFMCeIhTJKUxTB0GNjKdf1CibWIo1bF2Hk5x71TyigZ8AzCIXHEg4OXUlS6g56KD4QuTL98iQN126CREMhrradW3V1ccfy3gdzFnARx3ZlMA5ZeNPJm9G3Z1EA3zOLBJMpCD0UrpZE3TEJD3qRaRCBHYYY5CeCMebpU1B+ljOwdNLQ6D629JQqBNY1KHk5x7z0IIM33uoIgFWiEu6QmYcoCAADBH6c4DeqBCwgN4BjAEITLODYXQS3IMUBYmO5oHBZkTDs3odszqI4Z7MB6RuiIrT/AAxEZPYDAVKERjYYSpBGvtD1wwRe4VUJHMKLDJFVyXSMXd0PBDoMZtheUevIgjKq5pHyc496ijGNEAMMwMCWCP2IF1Oww0QewHcHopWAA0PBY+QoDCz24rAlDoI5wpMuozSYyRXXehts4EIbli4sSS1i8NqNtmdRGDTAuCMwE6+9A3RFMcP9otrvBKCTK5XQNMZ6h2DDL3VOj1mQmFKRoBdB9FCcHSCTYjGBdWDQhbFA8nOPeociRB9umM4SaHVI4nrMEJjL412zRCVDAIXVPo54DCPuo2wisCY1KMa7pAP0zjAEPdmwIzDAW4ruJsd6CKd9T18wgCGDEIlROX4J4phHdokw2pnUeiABR+KQEnDERN0RCMFyqE47TyiBIoYm7Hpv3YBkMe/IbBrb6eDxGOc2fAWDiJT5yOXRfTWMtFH0zXgeTnHvYTtJkccihj2+pVlv6Ap4DCPuo2wsuZeiMhOhkt5vaodTknNjvjdojgOhMhg4qi5DqCNIx5PtASRCqs/eJfoUOUJAxiNlUmxL9ihTFsDcukQCHBiXTejp/wAUQATMOCI8yCeic1Bg431KZIfowDJXs8v2K/YqgT0sUQaJEgIR2KKZfsUaSawYv9CBVL9iv2KFlmRKAxMdGql+hX7hYAIlQPmbgCZuX6hfsUH4qBQoJpsod+6/Yr9AgWo8hoAYBwbI9JcydSKAwyRdZJHcXNQId418lMbgYJ8KsAv0K/YqqpARAHEMaza4l+hRGJBJlsyM9QQ3JJcTBtM19BJMBgE9GREsxQB5Tjid8kqlcShs5mwuEQ4YopPkTQBLgkQmx1Gz2jJvSyb0kAmHR9yzmnScHrZNFk3pZNFk3oZN6GTekh6rrTJ0iB6WTehk2zJYOaJ0L1ljAHLCq7YB5L8A4FNfAO6nfh70YPFUZQcsUvvAiAlcsQmKcYRgM2HxahUMyEGBwzw/0QfBT3O5QIWZN+HD2CIk0yNv9QyQILHGOrksfio3cqQxYI0Dk5QD07IgY0zdRAdrf9ogK09R7AMcsJdAiqT9qTKQQqTAQkjtxD7gPiYgCEmARqomzMY2D8hQEMC4bIsJ6nQEIQGD2ARgOSDSSWYs2CmygEKlp79IsIliWgSKigO0Dl8Sy4lswRgWqN8zBAAAYBGtIjUSetX7EAUpmagyjRqGEHHnbUT8CZbiQ2QCcEX+IEDhJ4eafYFxeAHCTzODFBNlzxMUHp+6QIAkvgD2QYbSYWQJ0YLD3ILQAYgpxAmL4lSkZ3w8InRQ6qLIYMIAaJTAFSGHPsTPhOSgfkGkLZINhYJAeyFBzoFQsNEciXEME8IHzYoZecIBIMkGQfNt+GsU85RsDIYSLCba9kJYOZI4JMl0OaZVDmcWPswgIjhFbj1x/pAjjsLoOQm8Io/cxggXkQ4CyCUC5MfhYCQLkRq439xiUbEsgUDGFgkAmA5nW1BRoIXwsvaAiz55OlkYembRAcBcIgE4E4I/IhgNoEJkuBCxAD/SPhIrJuSyIET5DviNkSWpkEGiMwE+4EEveh7BkGvN7VT0N/rU1v3XoBHWB5sUZAYKiBgRLgQAUB/0j4OEeO4siQFKR4orhBMNXzR43J4yJwF7xlPbGTN6jpRWkP0B6wAAJiKQiBiLQOuN7BDGBcPgoRYFySJiULvmIaM1RQEBbVG5YlFwmldJSGWb6BkglgGAHtsyOpCT9oIA9GJ8zgIR4CYVCWagGB4RTkEDH0zUUF/gQuwKC6T4PijEPCQ1aIF6GtxYld/NknQU1MiG7FYFvbyDKg6xmhGd2k/cA7h6P+kYoYxK0AWLhOuU72pU2aBf4AbFyEqpRCXRYgk1d/SC65wrQ6tUIi8HCBhjb3ETV0vBNEcX9hM1ZEzSS+1HeFzBiLOmqHoQSdwX99FDjqIoV5hxHeQrfSgSDYAjUYtOqPNC1CBO3YBb3NlumSGDI4XkUAcHBTPtZkMDXUqERMu+LITrEHR73XSoRYPEUXgAWAHKfG/RkLiUQCop+zKcu4c3mSDSAGAFvdacDSwm/TKqzEZIY43QxEYWRc4rK64jBSAoQsOrAIoFcJ7wauwLeq06JEIJWQBAcioJBieTiY/2go5TEBgBgPdz5xg1Qh65fGRQuEUgRgglUFNWFezoVCEQi7AF1AYgYRchAuJe6GWf900U0Eik5JUmIo8KglwVZBXQIrOERfm6R0QZkSbmY96y3xgVRTXQjUf0IcXR0AgVMtkSM3rA9ByPmgKA8UH9xCJCpGCaExtCNc/6CNIsAHT9rUB9qjnAFEciolcRn9YqcWfvuDjCtJMskBRIPtXsnCEXBiCqGXzXJJWq8Boj47oRAWKlhoIuIVCHthMIakWXEEilPF6EHoIxr4ZJ8vuZTsnOy7iJnRMB1P8AAqExR7+aCWOwRtfRjyyIKbGa6QORDYIZQcUOYEQSYGMREN0IK7cgoKGMb2kNwPdpOCY+Sm5wiUHo04sJBPQvt8ihcSiARUGNJAwpf/QuEupaPgRDhjRZ34XCsddeBkVmEFiAsvgqLAw85HOJngg5Kjkz0I8WE0KY/E/sZUgBIeANbPJOPmZ9AkRrApQjycoXC1gVYmhFDPlsyGmKcZCRUfxWInHwU3DWBG0xk0+CcEhmM5hFoa5IgAwOFNxfNkbk7xZEiYifoBjpDXhKRpAw3VZvCLfjw5fVDHmMIxln0E4j6ATLEvEM3K0F9VEHCYIxIt3qIJqkAZDgEFsZjL4SQntrXFAazH2XVhQA7gi57dg8g6gRfgCIUCCy3pfAENTSzFMGJAkQwOz9AgBM+7ZumbT4GKzyfgHMoSQboHGOHpNZHXHsNHTLFAIkAOZBSM3QHFcUJ4OujuQ4IBvhjLskJBxQIFmb/SpgAWh5ID1Qk4RSQPizBzRjJgAerlHpYmRHbJlVQymq6ig+vV0ewoAbj1ugHOkDFVVksJlezkoVSrs5OqVhgrMAhP6tb+kQAAjKIlgADAwRXUQVgjGLIINFMZP9UvI0eSAMAwHxDmPgCM2tMH+0xUL0bvAWazy0TwMhmqZPKAB64lyKunYgpgcV04DgfVA5tAUHokqj92K6sxKrF1Rya7BsJJNgigaFkkygOA5MhPFHRAIgsDQKFmGZEk06G8YrjyQACLNJvimVCCE8naX0RAAsAjtDWE3uTJQDi0UGIKyOn1eTqcoFAkw9BFpXRyK8ibiA6PtoCsLMYkymg3B4hQPAYdE3OcqEkc0PL8LC5Tlb6QEdLsJP6h6sTPjZB2yJk8nzFopck9MCgGSOyp4SEyaPsVdxwLENcwGUQHLEqlg4qd9g7orokUD1RC75phxLs6CjDuBbVtXqKOqVNPKHRbau96Asfs1A3TSH8sERJKAeghTkGihnLhOyERGAYoCBn4m+QEAhjRVEMZCjROVpEZk4uJDRSuzsUvJwdKwfAVVzIU6QYLpJFDZEQmQE7NaFOs5gh4x2qCWqP5KmKa/2lC8yyRGSJhMZGLo0cM+UDuVl2qwcOf2p0c5oX9R7MJW3oVqKDdlDf86/FqzWeVe6/lBW9av4pgzo5GF9NUxNrp9rhBOU/wDTf//EACwQAQABAgQEBgMBAQEBAAAAAAERACExQVFhEHGBkTBAobHB8CBQ0WDh8ZD/2gAIAQEAAT8Q/wDptNAyBtFOIqZJXsVIkSy+CqVETb86IpuAHxSMM/VgVn6+EJ8V/RT44TkeNJ/PD4rOHY+KciFzs/FdRf8A7FRvSf8AjUB14+JrHTcD+BRJNwRf9TNLxrE5O9ZxGJL0p0cYNppf6SNYKVzjxFDoE+tNXJdD3TUPmnZ+1ECzuvtRiKmae9ooILT+NCxyxKgw7FQafg5gelGQ43FGt31PxT6bOg9lFuPpZCayg+8p0c4IHuNN0FwJM9J1zDji9XQgDxNPSmgikYdShy9pL2qf9BNaBIS9pTZ7sGZ5Y1ppCXioDd7s+d7FCKDG79Ie9EKeAL3r0BBA0DgVIe37qmSBxCvSpiYNepfYZFLqBpN8V62q/mvdMvzWAfW60jI5UA1uK80KxSG//VelT8qhQEajpINUQahxPeZTgRdSNFl5wKBdAwVPBGkYgfUrcRA9GHpSE7uLI6wrnZAFOvzoG2suXam6JaUAwDER6n+bTpjMF9MaQmqw0OgXalanZHli1JREon6t2iwTQXzV6gLFqj2WQHrTKMah6VpV2L+tSJbBkPVt6U+S4noKFJULNXyLMtEzGgJphG+aXBzJz641Bj5wns1Lq8SAOpRxYyBe3Bos4h99OIVxxHPbtT1dSNabuzQkjYtf4aORWbKetHmHBUj/AJVFiGgBSwgtBY7u3akWdoA3xelA1e6WOru0ISmivrwCLhMXO2NROvCN/m37FGmrCTuqf5sZY7UqsrfwPSuJr0XG16Ef8axeddYBXSp4ZOrgIXqc/wA6aTmKKCYiO/gGivBQqIn/ALDSufuW77etRh51oeeHrRdAkAjSh7tDade1xul95VcodaI3V+1MBswuet3PWhrXzjpj/kSZDLCCnnli0F2MaXYqGV2HzQCmOeb7YKJnCAICmwNdCUkZrZN5t2oKby/djT1mxUvxCsBLRFCwlaZWmlukzUADzEfilnmsAPzQRLTVaiIMfVNQ9q0NekISsPnI/FBxCvXOLUeI+jClF/zgVMyjm3yodmXOx70hXTJk9RKk8hz0KPvU2icYjuUnCsRj8icZyS7GsCX2ydMGliPIh72e9GliZjNJgJEUHUq3a/0WYHrVomKY++lAcaX7gH/Gjq+Y4CmKZML9mLT9lg+HYWOtRdkvdOrh0rBQwwLeuBh1qXFWAlPYpovXlocjL8Trng2uOqZNJyVrvH/1adS8D3BUQnyA+nllxVxgl641IB8zHZqZN5TPcrQFJt8zCnagySH8EQiiYJR9RjdTrcqQDWuP8lC5+QBpUtkXccnKkdsSoJ2xlWE2jhDUNqQoM91l/iVRBSqwBUCeav57PpStWyfD9rtLgUgUvXLpSwLTIWFNc3wFSyWE0I3x02YqVMq/gJcWJsOblTQDjI7BRAFdTdyKLhOQPp54ZVP/AEBQuLM9wrHR2OMasXKCMIiZP4HZilO6GDTrXkj6tBTtnM8xiVjwzldtKYK6Yo++DQHThBumA3K5cxBsmT/hns0JRPM0KaIoKVjdz1fxwiZbcqICoq4WYQ7uBVg+kwU3Z0qqrK68TQquAGNKupe8I2MWould+LnQ0/wEfT9GkkJNE5Yy7hjUWXuejODSov2x5OD+GeLzk8zOjGTIbc6ASNJP76U8zJbrUcqYhkpeQ4DTujvKN9qoeBJEkT/BDm6YIKTIyV96cubSoMXXNuceVCxOAADlSVuJZPIKuddlLO7l0pYpJUleL/ygnLWI8Nks2oEtFzdHI6UQAADAP1BmkhJSf7XxN2cT1oFtwKTr+BoHqg0cDUPiwQxPiixtKJErNuIYrtzpRwsZGeu2aPASZHmFT++mksds0V30Ky0eKA2M+7Vtk2krd+ChCBLYAoAV0Lsc3en7NLIeLA3gUrWcSoSR2MutQ5YgHNS4dP1oQphEnRqBN7505Y9FHYDZTyX8MA+kkDdk0PY8lUf0o4JQMGmKLkzrczZqdnQIk7jioSohIjZ/eGigAlXKkFglSdKg1KTRfrShq5AYA5U3gDPpyyN6ASm+Efc8RNXmNKKI9ajBgsRHbTpUfsCotAQe9AnYy/cZU7ZsjPJz4rj6VkVPvCCs8nzQQymSE50QJMOlpHGpeA1+pmG1EOOyYbJk/ujb1JQBWTjEXUfQoSQLDFocqdOGSqwFKGKcWumppr/yyV4uKDEcBqsql4PFctjOhQgbAER+zik6LBTsOVEcNUS3yycr0yYqFEJwmlkq5FG7JohqAkXdE+aK5FpLrUcmrmWolA0MudDxEvbupqb/ALgvILOLoFTku84KS4gJS7qtDGGVsdjVpXhKWYHXQbVPAE5WACVaMc6IVvfRQZpwcd1zf28UlMXLo20+attI6jxc9sirOyZlQC+wL1Vk7UaTIKRNKaBuexuus2qBNIXaDTfb9sdEV1c30KgltnYLK03o0aioAqKHHW/8G9OPY255Zu/FIqXQs6rlWNWGOtvz+7ATUJ4bmjVjGmDJfJUQ34PXSUQjTqrojE0P6oZsSiRKvNfCiMzSgtoYXIy0u+dKSf2Z++ILD2yspKxRytlto4mBUAaBQGMssm/Typd+SqsGgZG3Ffj+zNbQks5uuqz/AHsDlT4XJLNsZNJT6I5OMRnBN9822qRwxZGhksIsQy/upYjwF0DcTRoyUQkTP9g0qS0pn+egr645kOmhQdgQAWKhmiJnm77UsDDMqeAVAJXCk7Ok23XQqL64oB/gEUbUS86aiiC9w7Oqz4m3YvP/ABtHOKRG60TJp4dsRj8Vbm0RlBc9LRcAJAyJ+vQjiCzHxV7jrRCctCjEADAMqBdUMkGh9RTpckpV34OUOASrU6ItHV1u1GQgSAMv8EKhRhL+o0k+MgdHR43iuFsdTRoUobk3MxMmnkD1MxfYrXgkqybmsmjBlJEbJ+tY04zlq7FJPZYlTI5FGRAkAYBRAOhXBofcUicZRKvBV7wkq1JPQK+yau/+FhpMyG5o06oJgl+nHizqgEbDbRoiBbmazRklPSbI2/mp3zACZns0Ikj+rHHY5rKCrVQrYi2JpoARAEAGVFYhQuFou85VKvAv5i5VRV4Z59mNR/hWlSGDkDWqpIKftPEC6ATWTU3o/wAUxls70ZQE2EDPvo1i0e1psns/VFZUdnsb0YllZDId3OiRDAgBTk68N8iXxSQaMSp4FLMXKqmgExguX+/4mELapErUcyFfaHjAL1jT00XGeABrR5boMu5UT6jDjp+an9OSOlCANawfFy4G6+KD9GLm81u0M13PavIpZ0knDY24GncFKnKpZEAbjZG/+L1Ucopsc+h/9RxXiwLqb5UdULIlxGmRWRWTjJqodBhJvnH6aaNRXEb5Pmoinh89BsUFZBibvIN2mHYEwyg4MQVVgKFzDNhcxrUf4uKOFFM4rU3oMFiIt/ThKUchFCOo3MqQf0GQOJVlYzimWHJRHjZgP6U6guY1rlW+ArZjdm0HIlCADOoxyA4Ga/jgVd3lAwsGaFCCI/xwEyFlfLSkKQAxYZJtwNypyFGZRNwHsHnVg7TDfKSlMXR2TCHVRc/Rp0Iy46Bu1LEBhkNjbNoyIAgDIqe2C7wfV+IV4yubRQ3nCQAf4hYJWKc3GLS0fzRDBh3Oa2poSCIUcHJmKLZ6q+CJWKzHesHkotSvHMxKwABBiDDnyaP0Kio9rsMcfYzR6BxQ5y0GgzudexSM0ISp4NpRORmrVxURC+ct/wDDrEq2pILUyFvgptM4CLLALnU9YZCXHT4Gmmx0G5nxBIiSNsj+6R1BJHERpds7ZklzYetQLyhmsx3P0Ji0aY3zKy62cTdLhzcWiuupyCkMVusL5ceD6hhF1cCgbgIWHIcv8RKxM3Lk4vakpVlbrTyPCZLPgdMfBOoVRglOnUNHO4TGsdF1r/3KHelzskqAbEtweHtTB58rKyHAKXpnpkH/AKNEQgBAFRN4CWLl8uOOiAS2b0/4VLGuq5BjVmB5jy3rwUJNiiS2e5ZTF3p5ZxM1woRSK0umPbwtCEC+QlIlbWgyTZ4NPAMZmZRRm2nAxVMSxNi43TmY0ZcxCtxl1+fXJHCwnF96NkRAMXFpmAeqfDtjTqUk4q8J6JoJgY0KZx1gf4OIgPaAU8G9gMvrlVwtsrA3miBEgyDgKDJRm5JfppLKyt1q0J0xbL7Y+I9zPQXz+3FbcKJbYI9cKcCChHBKCmUx4Sb8ww0XEUGY+dCEDzZuB3oNUDzWKbGFGyACVcqmOpEbPPhNirYAxWhgVE2Iy/wlLoGbLi+OFuzDC4Nu+PB0oASrkURzNhbMYvelUhGxVwqDGQJmse3iOxFEI5lIipWyefCGZGkTJoCFDCbwLddCAh1AZdSSntKcwyudHzsMp53Xa8j3ouqxu5vVqMmVC3+0UlVWVx4BfUCJbJOmNR+/bnJMmUJSuEebGLFEQCICJc+Bo0wZq09Maes4jNaZ8CpkMaMCILIOBCpY8wfi96ZlVMq0iS0GZbL7eMYKDXB/cKfCoNCJwj+FklOPTGirGAwRpChPDlvzKGGCTfLzbuWBMyw70HGYsS/86OM8jIKvLuywG3fHgh4wJdWiaOY9i/vZpcHliFcir3TgEvcMClqTuByKYVIgMDJ9uJDfpQ2zXpwWY5JFww748FCgUq5VMeRAbMN+qmfjCLq0AJzJLvjNW8LCLHn1Pbi1kWZb5b0woEjAq53H46017iTgn03382xjnq4zyJoWQ58sWllgty44vxxu5SmMVj0HvUfuwRQBm0c82BdZwKVEuTMzdphpyoVqaCKWzIze1AmFg9+AhA7ULB6Y08ZZGa0ehtEYC7RCiRZBbgB6PAN/41utJRWVxauqHcllw7eQK1PE9F70/ldjR4IsHpFk9selDIOJgjTMQicEbF5lHkBdxEnzLd3ROgOrFIf1EzGe1BeCo5BSt3SAsz1ZevBTYKNVoxgSHVe/7oPhJVyom0lbl5i/SkykxYeixellcuK/zqG797ahDDZ04YpWN0+pwmhtyShs5/5wBo2OcRw78FSgkq5UzNKOUD7qV4aPFW1HagpqsfIjgoiBk+G3TiV4pY4qxe5T/ATaC53pcQlxgm50fMvI5qRWG63o0QiHqXXvV9v28QzdqbsvC/YyUz49B7/oSOPLCCrV0Lg70MXcmH2KFRM4I1ZjKmIw0MKpo1FwOqPzTotaVlVr18w0Mdzl60UUsBJ5AAgEcmv/AAdf+Pr/AMPT7lKiICsJg6UlqeYBbkZtC5JA9+BEBC81n0poziMVaVdgDIu/yiAiDwA4MRE968dCqq3WrSixlkw7X8kFxBnKFnvS4QU6jwdwdFlLB6MUBIIkiUkE8ZhFvqvUIggTMfLtaKq5ATSasuIbg6F+CRR7DZze9unBhhoM1tRCAatUXe/6DZftzvRNqbZt4z6095CSZaU5bwsNnPwENoyJ9DaihcwnY5YNGC8z+WtHkGr/ACLbcP8AXg+ZiY7PtRSxLTrKnIwzHxwtk5suHDvwOISVcim8K6AGL1ZaWkabNaE2RrqsfJNWH5iFg/04CiIwlWefuzge0Vlk8l3KrA3kzdAu7eXWA1sNzN7e9dzsMODtUChBvVj1abAsrmrPCJzeizl/P6Cfawxh/KyoGZbvjoWwILZe9Ighuk/e9ZRNThn74pxIqBZMh0fBOKSRISlJWzKeW58qN6GVmbOj45emmZATTfSq8rCj6UMtDNokQ56wY8BpGgzUY9KVQ4jNadWoiy29EBBFkGHAYg7FiZ1N2kkoJismHbGjya6DK3NFNASg5JwaB7S6D+ULJYHNENKWmBgsyu1vLlMYyYF5u1qAQEDIKhxqxno4jugdF74eh58X6mwKvpg5sOFtc/wnMSWFVZNfYQ1NBS6rOVpO/hDiw9s3LvTDgCGY+MsvO6uHLqxwjvomGWc9uC1dCgkNsx8cFMUzMuHDvRcvlWAosBFsM70bXRHyxS+wwZrQyg5zGLvlVqMWS12534NSWZs0zK24kw6NqjTibUvL1KZeQ/Uv5VrwTrsUf8nrjn0wUTrAurSPjrsBwNcC2xdoQQQGQefsenYcMp1/IJIwZJQyXcgyT2acKmjJPBGLmNL9QZbwfx4oh0mZATU6xZ3OsVKuBPRm9qDiNxmhd6vATpBvHn0xpQTSOa0q0tMhuUFSgDgMIMakQ2DwdKnhCYlaWT+FHlUk4sRdtvZh43q3xeYetX7p2r1LgpBN8rsj38rYicA5L/Cib5sm77RWNWt0vZaWWW7wbBedM8Uenn57lDYKaQeh6J2/Nj0Sda7Z70LxgzmHqeEr7ITcY+fFRWGuLhy6vDFNlKfTSsOE7dWBtmPj8lQHizWhtOZNdfLGEESalGxCHo8LGqETbMUbjKISmbSiZI/d8qsrwBkz7dCYBgDIKnsQEfQ4OYSmAowQ6xfe/n4UDiOWT9/AGqiSJk1AAtOKWnrSQo+DKGGE6k/HiDGSR0KRhVF6B2o3hrDAzehNBCCgzjFrPWkXt4wqS1BFlnPKmSKlXFfyZVWlSynx5hZCBILRs/HBGoUtxmmnkR1Jo4oGpqv70lsyfmeTYqEDsE0TklLhN8B602Fr0Nnrffgykg9waEhgCDzw5Vm7FKEySOTI8Fw5kQdq+1EbEA5LwbOIEzosPiWDQQvKOvBuAJWLOjlS62YYU3o4YrKrKv5tGDBmtQN2ZMa6+YO/CSjYfjjd8WHf8qtFE53/ADNXMOTGJ6Pk7VHXFtWlHTqWD2pSCAJzQt60yyqZzW/C7gVO76HnwvVXORi+/hLEjLaolMxBdwI+8+DGP8dogYixbk+EBZZHalcZboNg7eHf+szLP/KPMBTKs5lvWg1jnUMcLdEdXP8A40HwsB3IpsYEZ1h9n08mrjDDGCz1fSiECV5xerUkc1N3442OuQiweh54oCqliXIpuy1bGR4U5sKfUolQBF1Wnsng4VOiKJjYjwhBsnbhgdXwzEPDirRKWVGNdfNMaZlvTf1nguBo3R+aAEwSSilksup888mm6G4ZRNIAQZU96oW7j2OBMTzKWKK0GnI88Sw7Ed/38NhAsRlb1OJKqMJB8KYJL5MeCXVlV0pkCsHLKdvDvvYoWWY9DzZGHDuVzgyEELuM0YzPfIoA4WTs9mnYnug8ib2AJaUZH3yN6TwuKD6DhMkkckL5490t7i5FSQGrbQ8PcBYxWL0KhcnlobPhXTGWNBPBhmjFHDKdfDR6GmasFDAjI52L5u98P5TD78blyPkQnvUpJKfRv71dspDo+RBRiM5xUBTCLqGferk3d0KUOWQ5rwvjEV0V57IjEHP6Phr1FI1aPcBj7r3q4QmTlfwmtQGcmPAPww3YmKbWWk7B28MpJW8WdfTzgLEovOLUikbJwmLyHpivcoMIk9Kchag0Ej3PI2RCP6tDaQjby1gYXt2x78cMAB2Dzo7hJnNyO9LecF3bHhrPCkGKxTkcMU9kcqZz+C+DdS3XC/gYJxgegfDXOEmatQLDQzMXv5w8MJDT2o8NEk9E4SziI6tk9qN1gkUlb5Mz0WjyGMuKagf2hOREjpUooY7UuvscZXEKPV/553GvyRjkXLw10HEzVigRkcXWd+E6OZFMISynnPgyLArmRj5/ORf7bBShFRdk6Hh3XFuFnX0PPRog52p/nBy2Ll52rHCnZMCa2vIqju1HMlCUgADkVJm4fYAPnjCCGcbpL5whh4PQO9PcQTqvh2QjI4Kxen4I2ICTrIeCjRG1uhaMXAe8/GaWDIkrLJeGuY5GatBZEnWMXzzBFpzqjwYmGd6lMFIW8yk2WqXpUXv5DXgTHXhuRiI3XwTEZnVigKIIXkebaZApONnKdPDRgKLNaP6zdQ/r8IGLK7Zr/vgjCOZROE3KzeP4kgcJzQsUwRN+RkdDwwmN43qvQ8/ONgh6TwjEyZq+E/xqjHinkiUbSb7zDyDlxAHo8Hn7e5f3hmBKehfjzhyyE9JKSqquas+G4JZwWXPp+JGLp8k/54U6krOWcH8Rhuch+2vhtqKE1WhFAZhznz8OmD6icbqTedFKsbf7jpV2JfbeQ1WwexwurIJ6BwJAkR9G+cudxSMUWOh4bxjQM1oCC/gxV38WMTyDfwrl3e06n4KZMzsWO9MkNvyMjwzk7FiysXofoLOX9b4ywy+tatH8sx81cafYPkHmkSnnDhy9+3CQf+t8224go41gpgTCXFfDeOBgWbDsX7fksjKYbhPhHoASen4Juuff9/DfaMBq0JJFF1H9BhPA9fH77IPzUW1doNfahfHnXQmhL/8ApVYFrdf3+G7083us4W2X+HhugNFmtH8jBGKu/lKH90p7IW+j4Lz1g6iPFBrLs3I70v1dK4aHh3rMAYrF6foee59eO7+96Yz/AORqN6Tx3C6P2r6DmqzltKfr73CaWns+aV4s0cawUzxpHV8NYiNhZcO2PgLGQChGSz4NxrOdTg0eRJB+uvhqfHEM2hFIZ3w9f0MR4s+nD6ag2jelRfQvH+y0r2nvr1CvstXzkHm/CGynx4b4jhM1sUpAnuiu+AYEDD8beC4zE31ihOwQ0AwTc4uRSEQyZTl4Z664Wcz+i+m0/A/7nTyBBJ/SKUfZiq7ltQHT3uECNfMpPi5V0sBSNVVZr4b38oZLZJ8+DYolmMUTwWPxDtaS2Tu4pkncUw1/fw1ikCE40UAcZ1Xf9FM/rHHn8HprnEfSoE18cO8CVzn1SRK+9OfNrCVVuw6nbw25GAxVq16ZO4dMPBUMxU/TTwhSgkjNmR6U3KlPlOXhrb5uGLxTp+j5+T14y3mHanm87qkGq8gMEMMcpcLWZ/fh9Aa/MP8AAErNFqV+o7NfDjlwnJZyFR4IfFQGfRfCyq0I1JKkPFJ4TKiWarROEGLuvf8AR8hHr425/mj4qf6e4Styh6+PnWVYY7rws7AJ6hwkhgZdX5eat7SJrNj2w8MQlIBmtQwDZ1DDoQeFDhZw3iSkSOIx4JZpp7ERodkwLvbwgh8sa08R0/SXIv6/xt1D61q4fwBfirWYve+QOUyPO9wYk/6X84ZAQu5Pny8NYktUWptTyM18OaqHLg5NRHhAiSKjmUhLBOl3wSfyhfRKQUjeSFfWfBUeCJvRWAhdcz+kuncfQXjZCPcK0Ti4PQdSgQknbyGg7s624WgsBO4+DD4hdGaApkleZ5VooUtrBMXph4Y1KQDNaIeuzOeXQ8RoAFgDJv4IrYpRb/V93b0fBS2Eyav/AI/pWaYgdI4GIMVqykYPpNMnuqdgoACPaXkEFtEE8p+aja8T6VG267ZBPnjIbKW7xD5U5q6gOVMSq1yrnjW67v7W67v7W67v7W67v7X1P+1uu7+1uu7+1uu7+19S/tbru/tSx3CJO0XxqPEh3AMOYx4LFoNDUatuJFiBA9Gn82Uigb0ZYFpnC73/AEqDOLmivAG5Y3qUZpbtYU1wpA3/AIUZ2AIPIKduW6Cf0owXFm8KgVM30Lj7nGNTKr0f++UwVZDdxbM/HhtkRAGbVqgjVnl08WVQq/Z9TwnokufLUai0jN5dMPzzbqJjleWH6a6xyehn34LASKTYvRYgwo4wUnV+RRCmQaQ1NjKid3VrZRzcue3HBwwNk8oFi8WbtPTGlzqkq5vhpZpSlnK70YeLHZOC9B70zBGxjv4LhRFNqk4JHOQvUyRUI4j+MZ5aCPAtM3N7/pTZLBLS6TLHUGD0DhcemOjYPelBXAvU/dvDH0nyI37jG4SVecShoE+RoiUneiibiCcl4WdiCbryia9oapLMT4cc5znOc5i2VaALrUGrgGSYMeO5vCBaLLnTcdiMR5eCnDQOOxPelmfELjODMpEiImI8SYqtgM6GCjMInFmW36Y1GI3nFqd0lMrwkLsE85XsUKqDtBQpXOXqvv5EcOiNWDZW5Z9F4QDAHJM8JNYXyylHkgiAkJuLj0UrVUyrm+GwdDkLLkow8gTloBQOetQgHLkBuVZdkoE8AkK7JuW04m1Hc6TGJ9KovaSS0+lT5LIg9KyKiEQdigAAAMj9NbCFcpl9uNgJS5xYParYgk3cVZqUOotvJCKue5MF+vDBOZIzf8eGGeXmM0eIHTc8i2KF2aQJM1X/ALCv/YV/7Cv/AGFf+wr/ANhX/sK/9hX/ALCv/YUdEiwXVDMucXvgdDycjCyJ3F6SIcFZ73ptSGl9Saf0f0r1As/BFAK6FSw25XtQK6tbTuTUNEe/sEv6jacL0OBVSYG7QHI77FOIMljMEHq0JgEjGsX8l2UzB+Jph5k3MpFkTzR2fjjeq5eDJ6Pkl2V1z/4V9w+K+4fFfcPivuHxX3D4r7h8V9w+K+4fFfcPivuHxUbJ9jagBBh5YCQ4UGgaQwtZCZlqXNu7AKeCFm5aOljJ/wAtQo7bKj9Tj+7ZX9Z4NhCjtd8VADAIp0UohhjWAIMPJQeYjZnf0mruVxNLno0B4wk6xb1oolIHJOGHFwdbX0aP9FDWTvIp9559LPC/xKUz/wCTTSw5dKLLuNGeg0eSFiXfUikCkJ+rn6UEkV6Ry9/vPC0pF2yiJJEk/wBEMcghN4X+HfisUMnst8qG2vRRSCsYuMLHsvXyhjMlmSfNpAI2blR2QV/U4OKwGRook9Kuvb/RW9SYcx+OCuh2arFDzHRIinYmDtCx3fSo6Ck3i/r5RcIOGP8AxQ70eSH2Z9qbvshc+k0I4IWuwK9AenkJtpzjQp6pRjhOhQocs6TrRwK5sIyytuA4mUHe0OHADrxxHPAPrSwlzj7miCP2SgKJmEaZYP8A5hx4imim8y/mPZznOTYyQQ2Y4FymgZS5HActC82AiJ/BCQJvMv4nOc5oQtclGg8wTDu1gQOB3Dir1DXiJj44nGHoksQ8QfBIh9WiDb7Fox5eSjq7mEayzKSTkOPGWMiBLBxGcjFDYFuE3MxRoU9U4xwjjefayXxxNKJdCkoPQC29OF5I7Vpy9ayqej8lw/6/KjAk2sxb1qXwL8Yw9ZSwxCEcykWHu4HCw4vMWaKcAQzHx/oNGvUvfg74cOImFLsI5d5i3K0YV9lrw+m1K++0poEIzGw9opW4cWxoH4PwCRISkSIEO65lC3wckDmV9lo/n93r4O22EDXA+eKzotGzNDDZscr8fq9H84syyioaJSA2TJhubcPT/fx9F7+At24B5Ip08m+QOWf4LzSRIRoU9cldZD+aQgjI3mvrNPx2+20a9S9+H2GtZ+NGJRA3L3xOvGyY0SbHvQoEvO7HrQiFJWhl9VO3lsAIplNHa3pCCMjhSli456uAxRqgxLjZZ6keP9Bo16l78WULmuTj0oUhYcxr7LXh9NqV99pUAp6HYO9IPXYmwyDbgjRIFKtDsMR1hvFSp5CZf84tm3Wrxn/FHFF0mIb8HuZaEcXiEX1E4k4Phx2OEvpAKtjGoR9i7+FzKFOofPH6vR483Hl5nCOXAFzGoTDVNOL/AMkNZSKLlen+/j6L30pQFRyCmdyMtA353g5iqYAzoMeiDM5GFLDHhEz304JJGEuNTj3I4jN2r7TT8dvttGvUvfh9hrWfjBjEbMjd34RykW60fYHYzgu9WWkSDkzMD3aFSIm5XfXy09OZGM8ezRRMHLYmkyFWxcPamCMA5Jwwm7DgHF8eP9Bo16l78AqER34QDJvPYa/xUQ6+9w+m1K++0qM2QBxCxxFKWAW1uhRS7RbS4Eo60bcgG5wca9JpN/Sl5kA6lRXo3tx+t2qKiKnnNvWD1ad+WVdWmCUSGRm1Kxe7mDZ6nBJiZDhG/s4/V6PH6OvBntfInXNp0TwTeAjtoIDjCa9P9/H0XvqN3BhvOP0mnHgM9hmClvXQAAIKgRmnJiyb1iIs6McL3C9VxX1mnFRN9ytp3rBDnbNepe/D7DWs/FaoEDrYKdkwjmvBJznJ1YU7WAJVyq8x+fCaO9v5cbQDdEilTSAzf3ODQtrZYye9+vBmQgMkZpMhgOgLnfxvoNGvUvfhEcGwsWXucGImgySj6J4ZAl4fTalffaUkxJU0tLxCEXLoBwJBwSKwXNO/ikEDXlw9G9uP3u3HExYmmD1eFzyYO/Cr2Lr0n44JnAh5NJbIh5nD6vR4jTrFEiJwjnwewXlKOtxeKqaXKSYHfh6f7+PovfUGomRrB/3jgrlsrvASDnalWbQi6zQRC53frRuHQ1SccWvrNONmVhOnWvpvzSVIJCf9aWVXHh9hrWfi31RjM3gdD34AqAStW5ru6DtFWa3vyLvalaNeHH/tj5hdBgz1OZaiwBdfKr6vs4uR2px4WwWSsmPWX6eN9Bo16l78AvLOZTamJPJxE4AAHsiQbvuRw+m1K+20qASSInlxYsC5JvxQspPneOKLB78PRvbj97twmr2p7ePAp2VF02PmjFZBTJY8blFg45/dw+r0fzUAsrMsQMVqMlN+tTw9P9/H6+9BmvHxcU6m9IeM8frNPA+w1rPxCNCDObFin8ss6rwaa9PlpdWKNCAEAZFISXKsLd9CiWGJkBB5hwBcgwNz+dab4ljF1nRoUCQOY1GA0AbvoydODKB3NqcNAZ3Dv4v0GjXqXvw+s1oTGKExMvwfTalffaULLATvbxtnGTZ/o8Ekh47BNBdAJ1V4DpIwbrFESi39OHo3tx+924PrEXzi1KbKm3eBpEhAHSiCNCCunGQ0gCbYh88Pq9Hjyh8MZn2pc7JsyyeInNiL1Bx9P9/H0XvqWZBLQR4x0irWFH34Ei4BNF4F6IDE4U0DM0n4pqt5gEaxX1mnEhEoFDIW4Dg/a7woCMBHD7DWs/DawASSc3F9+tPArSeMlw4HzTQF9OpYO9SD4uBVl/HmXCkv5BDNh80FUMGYlXQXUhdcT545say4DHrL9PF+g0a9S9+H0GtCUbWWRrBdA7I4czDj9NqV99pWSiYLvEQ+DGx0JyoCdSKB6lO3BMBMb68Z7IGS0mB3otw9G9uP3u3C1RAz6Y8I/FMRPjSb0+4tWyTX1ejx+jrSWDluQuPekGME5JwR4mA4k3O1AxRRok8PT/fx9F76UAkX5C5SpUUZBh4DQ2ScbGlQQuF2iNJQ+BLbSSmZVlVzeGI/k5rGvtNPx2+20a9S9+H2GtZ+GW4snYO9JFXd3y4I42Eun+daECILIKQIK9fAeReg+A0u49WfNCNTkzjl1JKZhlYq7PDo0MhZmCNIFn5FbbthwSoSVuJQXJiPKxPE+g0a9S9+H0GvCFbWNeYvyNP0WRiJw+m1K++0oKAEQkSksJ2sTk7ccdjk1PAQyAAsGrtWRXJv/A4+je3H73bhdNPctJd9eBxSEGd2ztX3L4p+9e1KdIRxrA24zg4mxgbelfW6PH6OtNWr5bwnM78ZQW4XP/Hh6f7+PovfTQsOoLjs9+JjY5NKt14MSddyOa7UU43IsTFr6zT8dvttGvUvfh9hrWfhNXaI1WOXoPfithBcXLA640ll3HVkd6cgZWrjHIt5tpLkXthbfLROgwOIlSl5Yy/0Gkhhx4C0ABq2T38QGVRAZ2aexHLv8q+s/FTJ9FBfR4sXKJp2Jk195+KFnRVt3NqKA2Qk6cItpjkFDPHk0BzULaM2/UqKMOSlDUfAR8U5ot1wbUhcHZSnPI2/CXjEhhG1fefivvPxQHA8iK2TRadIlWLQUo6YcdZ0r7z8UoqY8JOA8YgG8lXhDpX3n4r7z8VHt0Yc3agyJ1DiG9q+s/FffPimNUvnjhPC8MGhlia5PSvrPxX3n4oTAsBwpwypSDrR5uhBGdpK+8/FfQvihWDJSL6cGxBQokSnW42NttKjJOYXqUtDG4UTX8BHxScS3eHakCYrCU56bcAC5ilWK+s/FfefijZo0aW14MIVQA5NPQhn3+VfWfij55BhnFYrPwjrTNU2HbGlrrWlV4T/AMTLgcOuFB8MJgBSvDA8XgPIloekUA3V7+cTxDZcB/cKWwsA73+i+9G4iJCOdMcEWiwrfp4HHUSJk0BQiDN44dfiQ0KhofhFQ0KhofjECGiUEGsxa9J7PygahoVDQqOENCoaH4w0KhoVAZFQVDQqGhUBgcYaFQ0Kg0OEDlUNCoaH4kYAmiU5Lhoten1n4w0KhoVBocYaFQ0Kg0PCNlAEq5Ve1dibZnCpCrYAzoAwidLiLdNNITAziWB1odWC7N/8fOtLKBjQA+D605wWE4sx5NNAB6gMuThTe0UZJwlcdhuNj1KLCWhZH/LJc2Dr5/Vw4mDpHJbFPlVg0CnaQoXIY/IoRwo/PngNLgUxZNMYbMBkRseDhdoNyuvDieL+WYZurL/Kww5GZkDdqZabGRyDY4O6Nhy3oLgSZqYqovYWZckv00rxdR1Pd/QHpwOed55lQQ0Z+cuVo2zyMxprRsrBMO2HB1oAMRLlQ6sSbug2f8mWQUq4BSK+kLbP/njBx7TX19lpSD0rAoIEsItB77i0NAEAZH6AaAIRwSlKj3Vl5zEoyRwcxoWQ3VuvZpP+CIUYjwc9DjJzBqXsCzdZjuf5GaMGivel3aU8BiITpbKqTQUAYBQAgFfdh8mg0I96Yv6Ii0Vvc8E9qlIWWET9DlU1HZiW+P1jxIEAI7UPmhPqWkDn/kDITZnU9ikKPoXTwwWZC2YqhXXAXzFT6AMu87dCl1UE3TFbv6RcAIbUr9yj4RnWTl/dPVYNIjk1LFw156n24g2WicTm20oZP8cVOyM3KCnMqXbZA24FVAFKrlUTSbFR0/NAnfd7FDzWaYZDni0YwoDADL9IBESRyplknjpit1WdNCt89UQqOGL5A3KfGQ6HKTgYWiMiZUb4iJwsuZ/jQ2yg57G9PgVl21ObxWx5OVaj2o2UASrlWvLGMxexlRBd8Mxbv6Z7qMwKwIP+o5KBFpCQNA0Fz2k7NM/A335cCuKUhRURBaOA5d9T/F5TAUBTTwJrP9WnFKcpabXIothQGAFGbHiLLJu00ArE8nl+oO6IUC+WlOLmfNbF10AMpImdO9JItHn30aX8oKFHCbmKLjUO+2GD72/xMxUhwCoMssBevbQ4zX0YX9TQ+ghYBUkrALw1/FNM2gG5939UiQo1G/ZpymFiR+kNZUc2fDAlFJshCEeE8KUXGsQI7g+nD/DrLsvASrWB2FZm7bcTRMBJbSN2jERwGKzXel5lZV3q7FHiMv1kxoyKLW/VpyTxYiXFvo0y6OHWWnPATKUNEM0NaRg6FFx4SqGFCqi+IvaHM32/ws5BS/b0xT8aOJR0Eg/9VErrC3zZtE3bFeSCtY1JEGx6aPsYiADAP1jUCOGjt5KaX0jbbgBe0XHMb0sOoBCO/AiHk4RM6GkDANh0aACMjgn+CMV7duaBnTBb7TbnqeLvVsrHy0Xs5i3TUQ0ggOWApSI0ywZt8rQ/qEQA/XNABybV7GHvrAzdkvtwFxeSIh9qIZkJCjghKiXEyrAzq77es3oUwS2Qfv5ooz027voUqATBvIBxjAjbZaamgLHExdzVzaGBheX9CrX+DMXW+RoiBCIA/Yg4uWSzM0pM0GF25affUzKghspINn91ApYb1NTjNWOabnlyp0NNw0TL96gxp2FmXP8AR2pS/SyV4RQXSBjG3/dRKmJQRBvrv8rDtE2CYbGrQckGwA/ZxAPIWIZO+9YWRjunZ0aJANIjZKhfFbXPk2qX2mJzQ/HEpa5JomdAkRDYb38VP7oDmzDFTrbOCL4KUqt1xXgYcjABK1dB4shGI6TagfZAoApGU224eyVo6xCMgMvfQAVDQA/aRTFGdE5OpUly9uFz2UdLiUiUQxsBdamjQWrNids6b8WLrKIRoII4vA7mZR3VmS/8f26xRRKl13vLljThcG8gOXEkkCa6uhQaYohPJ1d6woYr3v199lMqbGEcn+KBGFABYP20UZA8x6jT0s0yorLfAkbuifNH1SASJWJuVsfFdqXhsQyPEo4M3XMKW6LWzb/hoCUI4J+zaFm8J32Bm0gwpbwNtKSGUolXhFMKhhUPc0NAgQZTnkUJjZGAKCGqKdN2G9YwDL+2nF3qP3JIeuYFIipLSeZFRZnck/acHbgeWpaRzNSpOq3JXPR4iiIwlWXy09j641aqFlB0zqb/ALA8myEHWoq1bNttaYGsJ9AMDi9CISS8qVhSxTHn+KIv8RwOVMgEY27oFLoykCQ1efagwQ20pzyNv3jhTpHvbU3MnesWhSNVOWibtJL76VH9M5ByqSBXRt1fFI2CFlxX4MoCOyVhzkwhu506kkojnn60D9Zggc6DCHae7u59KQwVu+3z5v4aLQhHbWjAzQSXy0KQFWAxWmZgsfRGLtRdtCMHpHpUaWIhg/fx4ZYsmqypr4ZmcofcrBBdgD358qLlRbbA4bZpgCXw19cKcsCyJCcXk/MMlRJjabAc8+tLQxcIdHGhknL9Qe3pSH1poq2LA+7U1kbnsvwOIbC98cCkiggYxvq9KJ5kCgChpXETsBnTUO3sSa4JyKAAYzfG35/wRsIrEc6kWFes3hlzKKjWGZ1mebNCdYNk0RpBESR1qceFhi++Bp7pNnCNzEoIoITJ4jBvBUJSY9m+ziUSCrONdj8lPtpIP9GQErBS5Ibp0KEwUY7yNju0zbcrRyMPwVykE6tTxHlfb5FG32CDPNzo4qTBBSJBXGvtzb4UTUHuBkdihhJBA/wpt3hm9tKxxtUTs8+TRKXhKH3xKCu8k6nIEIRJGs2GRQLvhoeZMcwb4ymKg4ifgNIs5HbCoiPZwPpb0qRF7Wnpgok3YATzqgS1E0s0n0L1GELC9SMX0pvJ+YRzxpktYpK/gsJsROHNyoKL4zS/TSjosYi7m40uIN1WApkC2xhv8CnIthLXfebVjFxdD46f4mPNrBHIF6VOkohDSVvfRA6JgQ90rDwcBP8AlY2oVr4Y5vFmg5G5MM62aQWMKWd/xMnV4cO2FWR7G+9Sis4Bf9aBcCPSkGpoB1GfJzU1NPhfER9ak5zyPfCtqWmPYrShFj0vTUliir1/FxANxg6uPSs+DrQdcWiglo55udO1BuraKidtZ5bfDRaCmSY541jyC6ctthogAAGAf4uKawrHoUoq6u3I0jCg71QI149KSMpLa5ivwsZ6C8nJxKnplz/3KmmNn4OWNISrFgnR/GYwpIiDBkdsKixvIVetQRqSlSgz8wPvUXLbh7TRKXOl7orO2+mNYO3J/NBihUuM1IpUgMmbtNSEByVe1SJHbQ92pg01M9qmwXJv+tTojzIelP0HF7e/5CESxIhzcKlyN1v+Fd3UFsYUdIFgCAox6SCHVo0KsWp886enXYc5Y0z79Ha7VHENABAf4+Kap2CHQcSmizmBHI0ctYhVjYfNTynJgnkowv4ED24JFkiCHkl6mO2A/wDSogtg+0aegWM4d8PB9MVFP9hnzWQpp/avdulYJWVo+1tlYgPvrU9dNX803LzqNKJS83wAGDYJWstaB9ylUTi/usFWjzMjPpoMFQGB2rDHCocxzJOhVuUydN4Ld2lkFmQZoGxWSmqJdsigBAQf5OKSqWIke9T1nYLvh9qfKkjWm6kaKQxhd22z6Vtsz99JnmAE4KHnIz61fT9d+lqmu8ijuRSRJ6yejTKEMWL6VFGd08iigFdCh6Z1KlTvSpGdbvgKII2Pt8PejkbzH1Y0AWANqQCqAzaev+BKKSjFvahenZ1m4Pf1axgvOybuL6UAEshPX/NJE+yE+tIv3CBLntSm83sDwaFJxDRjt96azfNj2v6UeSTKPs1ISc1PBBISTemoM/fSg2V6x6VPyLrfJTztXwsUryL/AKdejEXuV6cAK9yyoDm5Ghs/ZWXfMFYgeh6/M/arKHm/FThgZnyrS4rZgP0JpkZHnIdFoIRGCK+pRYNMAjgwE0MPMQRo845SD1bUvXVgY+xak8bTDFeIwLKOuL3qCqZFXVv/AKBkIrEShFf4kdwpuguCgetQ0XQv+SkYxahI51WSUsrf1KgR7jIDsz6UeSLL3co2fqbOg5I2WkOHhTYzVYpYRNF80fJjGS7FTowahPopEqy+CKkYCJDFK45yuI5UCYgMK9VWtUruXrRE6IAz/ULAzZaIZy4sD6VMzDqU7OlyayKIwC+1MtLCfgtaJNF9wrCnmie7Xz3fZrDLffWpsPp71hj9L5rIG5im8Go+00Lu/c9CnU0P7ShCXMD5aHLWdgqBXDOdQACYRFABYD/6bf/+AAMA/9k=";
  const logoWidth = 20;
  const logoHeight = 20;
  doc.addImage(logoBase64, "PNG", (pageWidth - logoWidth) / 2, yPosition, logoWidth, logoHeight);
  yPosition += logoHeight + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Notarich Cafe", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 6;
  doc.text(title, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const address = "Jl. Mejobo Perum Kompleks Nojorono No.2c, Megawonbaru, Mlati Norowito, Kec. Kota Kudus, Kabupaten Kudus, Jawa Tengah 59319";
  const addressLines = doc.splitTextToSize(address, pageWidth - margin * 2);
  addressLines.forEach((line: string) => {
    checkPage();
    doc.text(line, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 4;
  });
  yPosition += 2;

  doc.setLineWidth(0.3);
  doc.setDrawColor(150);
  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  // Informasi Order
  const labelX = margin;
  const colonX = margin + 22;
  const valueX = margin + 24;
  const now = new Date();
  doc.text("Tanggal", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(now.toLocaleDateString(), valueX, yPosition);
  yPosition += 5;
  doc.text("Hari", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(now.toLocaleDateString("id-ID", { weekday: "long" }), valueX, yPosition);
  yPosition += 5;
  doc.text("Jam", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(now.toLocaleTimeString(), valueX, yPosition);
  yPosition += 5;
  doc.text("Kasir", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Kasir 1", valueX, yPosition);
  yPosition += 5;
  doc.text("Meja", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(String(order.tableNumber), valueX, yPosition);
  yPosition += 5;
  doc.text("Order ID", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(String(order.id), valueX, yPosition);
  yPosition += 5;
  doc.text("Nama", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(order.customerName || "-", valueX, yPosition);
  yPosition += 7;

  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  // Pesanan
  doc.setFont("helvetica", "bold");
  doc.text("Pesanan", margin, yPosition);
  yPosition += 5;
  doc.text("Item", margin, yPosition);
  doc.text("Qty", pageWidth - margin, yPosition, { align: "right" });
  yPosition += 7;

  const truncateMenuName = (name: string) => {
    const maxItemNameLength = 19;
    if (name.length > maxItemNameLength) {
      const firstLine = name.substring(0, maxItemNameLength);
      const secondLine = name.substring(maxItemNameLength);
      return [firstLine, secondLine];
    }
    return [name];
  };

  order.orderItems.forEach((item) => {
    if (item.menu.type === "BUNDLE") {
      const [bundleFirstLine, bundleSecondLine] = truncateMenuName(item.menu.name);
      checkPage();
      doc.setFont("helvetica", "bold");
      doc.text(`Bundle: ${bundleFirstLine}`, margin, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(`${item.quantity}`, pageWidth - margin, yPosition, { align: "right" });
      yPosition += 5;
      if (bundleSecondLine) {
        checkPage();
        doc.setFont("helvetica", "bold");
        doc.text(bundleSecondLine, margin, yPosition);
        yPosition += 5;
      }

      const category = title.includes("Kitchen") ? "Kitchen" : "Bar";
      const relevantBundleItems = item.menu.bundleCompositions.filter((bundleItem) => {
        const itemCategory = bundleItem.menu.category.toLowerCase();
        console.log(`Checking ${itemCategory} for ${category}`); // Debugging
        if (category === "Kitchen") {
          return ["main course", "snack", "makanan"].includes(itemCategory);
        } else {
          return ["coffee", "tea", "frappe", "juice", "milk base", "refresher", "cocorich", "mocktail", "minuman"].includes(itemCategory);
        }
      });

      if (relevantBundleItems.length > 0) {
        relevantBundleItems.forEach((bundleItem) => {
          const [itemFirstLine, itemSecondLine] = truncateMenuName(bundleItem.menu.name);
          checkPage();
          doc.setFont("helvetica", "normal");
          doc.text(`  - ${itemFirstLine}`, margin, yPosition);
          doc.text(`${bundleItem.amount * item.quantity}`, pageWidth - margin, yPosition, { align: "right" });
          yPosition += 5;
          if (itemSecondLine) {
            checkPage();
            doc.text(`    ${itemSecondLine}`, margin, yPosition);
            yPosition += 5;
          }
        });
      } else {
        checkPage();
        doc.setFont("helvetica", "italic");
        doc.text(`(No ${category} items in this bundle)`, margin, yPosition);
        doc.setFont("helvetica", "normal");
        yPosition += 5;
      }

      if (item.modifiers && item.modifiers.length > 0) {
        checkPage();
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        item.modifiers.forEach((modifier) => {
          doc.text(`- ${modifier.modifier.name} (Rp ${modifier.modifier.price.toLocaleString()})`, margin, yPosition);
          yPosition += 4;
        });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }

      if (item.note) {
        checkPage();
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        const noteText = `Catatan: ${item.note}`;
        const noteLines = doc.splitTextToSize(noteText, pageWidth - margin * 2);
        noteLines.forEach((line: any) => {
          checkPage();
          doc.text(line, margin, yPosition);
          yPosition += 4;
        });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }
    } else {
      const [firstLine, secondLine] = truncateMenuName(item.menu.name);
      checkPage();
      doc.setFont("helvetica", "bold");
      doc.text(firstLine, margin, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(`${item.quantity}`, pageWidth - margin, yPosition, { align: "right" });
      yPosition += 5;
      if (secondLine) {
        checkPage();
        doc.setFont("helvetica", "bold");
        doc.text(secondLine, margin, yPosition);
        yPosition += 5;
      }
    }
  });

  yPosition += 3;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;
  doc.setFont("helvetica", "italic");
  doc.text("Terimakasih telah berkunjung!", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 5;
  doc.text("Semoga hari Anda menyenangkan!", pageWidth / 2, yPosition, { align: "center" });

  doc.save(`struk_${title}.pdf`);
}
