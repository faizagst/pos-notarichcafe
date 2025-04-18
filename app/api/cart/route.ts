import { NextRequest, NextResponse } from "next/server";

interface Modifier {
  id: number;
  name: string;
  price: number;
  category: {
    id: number;
    name: string;
  };
}

interface Menu {
  id: number;
  name: string;
  price: number;
  image: string;
  discounts: { discount: { id: number; name: string; type: "PERCENTAGE" | "NORMAL"; scope: "MENU" | "TOTAL"; value: number; isActive: boolean } }[];
  modifiers: { modifier: Modifier }[];
}

interface CartItem {
  menu: Menu;
  quantity: number;
  note: string;
  modifierIds: { [categoryId: number]: number | null };
  uniqueKey: string;
}

let cartData: {
  cartItems: CartItem[];
  cashGiven: number;
  change: number;
  selectedDiscountId: number | null;
} = {
  cartItems: [],
  cashGiven: 0,
  change: 0,
  selectedDiscountId: null,
};

export async function GET(req: NextRequest) {
  return NextResponse.json(cartData);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { cartItems, cashGiven, change, selectedDiscountId } = body;

  cartData = {
    cartItems: cartItems || cartData.cartItems,
    cashGiven: cashGiven !== undefined ? Number(cashGiven) : cartData.cashGiven,
    change: change !== undefined ? Number(change) : cartData.change,
    selectedDiscountId: selectedDiscountId !== undefined ? selectedDiscountId : cartData.selectedDiscountId,
  };

  return NextResponse.json({ message: "Cart updated", ...cartData });
}
