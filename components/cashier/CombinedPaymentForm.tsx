import { useState, useEffect } from "react";
import toast from "react-hot-toast";

// Definisikan tipe Discount agar sesuai dengan yang digunakan di Kasir.tsx
interface Discount {
  id: number;
  name: string;
  type: "PERCENTAGE" | "NORMAL";
  scope: "MENU" | "TOTAL";
  value: number;
  isActive: boolean;
}

// Perbarui tipe props untuk menyertakan discounts
interface CombinedPaymentFormProps {
  total?: number;
  details?: {
    subtotal: number;
    modifier: number;
    discount: number;
    tax: number;
    gratuity: number;
  };
  onConfirmPayment: (
    paymentMethod: string,
    paymentId?: string,
    discountId?: number | null,
    cashGiven?: number,
    change?: number
  ) => Promise<void> | void;
  onCancel: () => void;
  discounts?: Discount[]; // Tambahkan discounts sebagai prop opsional
}

function CombinedPaymentForm({
  total = 0,
  details = { subtotal: 0, modifier: 0, discount: 0, tax: 0, gratuity: 0 },
  onConfirmPayment,
  onCancel,
  discounts = [],
}: CombinedPaymentFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("tunai");
  const [paymentId, setPaymentId] = useState<string>("");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [change, setChange] = useState<number>(0);
  const [selectedDiscountId, setSelectedDiscountId] = useState<number | null>(null);
  const [adjustedTotal, setAdjustedTotal] = useState<number>(total);
  const [adjustedDetails, setAdjustedDetails] = useState(details);

  const calculateAdjustedTotals = (discountId: number | null) => {
    let totalDiscount = details.discount;
    const subtotalWithModifiers = details.subtotal + details.modifier;

    if (discountId) {
      const selectedDiscount = discounts.find((d) => d.id === discountId);
      if (selectedDiscount && selectedDiscount.scope === "TOTAL") {
        const additionalDiscount =
          selectedDiscount.type === "PERCENTAGE"
            ? (selectedDiscount.value / 100) * subtotalWithModifiers
            : selectedDiscount.value;
        totalDiscount += additionalDiscount;
      }
    }

    totalDiscount = Math.min(totalDiscount, subtotalWithModifiers);
    const subtotalAfterDiscount = subtotalWithModifiers - totalDiscount;
    const tax = subtotalAfterDiscount * 0.10;
    const gratuity = subtotalAfterDiscount * 0.02;
    const finalTotal = subtotalAfterDiscount + tax + gratuity;

    return {
      subtotal: details.subtotal,
      modifier: details.modifier,
      discount: totalDiscount,
      tax,
      gratuity,
      finalTotal,
    };
  };

  useEffect(() => {
    const newTotals = calculateAdjustedTotals(selectedDiscountId);
    setAdjustedDetails(newTotals);
    setAdjustedTotal(newTotals.finalTotal);
  }, [selectedDiscountId, details]);

  const calculateChange = (given: string) => {
    const givenNumber = parseFloat(given) || 0;
    const changeAmount = givenNumber - adjustedTotal;
    setChange(changeAmount >= 0 ? changeAmount : 0);
    return changeAmount >= 0 ? changeAmount : 0;
  };

  const handleCashGivenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(value)) {
      setCashGiven(value);
      calculateChange(value);
    }
  };

  const handleConfirmPayment = () => {
    if (paymentMethod === "tunai") {
      const cashGivenNumber = parseFloat(cashGiven) || 0;
      if (cashGivenNumber < adjustedTotal) {
        toast.error("Uang yang diberikan kurang");
        return;
      }
      onConfirmPayment(paymentMethod, undefined, selectedDiscountId, cashGivenNumber, change);
    } else {
      onConfirmPayment(paymentMethod, paymentId, selectedDiscountId, undefined, undefined);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Pembayaran Gabungan</h2>
        <div className="mb-4">
          <p className="text-lg font-semibold">Rincian Pembayaran Gabungan:</p>
          <div className="text-gray-700 space-y-1">
            <p>Subtotal: Rp {adjustedDetails.subtotal.toLocaleString()}</p>
            <p>Modifier: Rp {adjustedDetails.modifier.toLocaleString()}</p>
            <p>Diskon: Rp {adjustedDetails.discount.toLocaleString()}</p>
            <p>Subtotal setelah diskon: Rp {(adjustedDetails.subtotal + adjustedDetails.modifier - adjustedDetails.discount).toLocaleString()}</p>
            <p>Pajak (10%): Rp {adjustedDetails.tax.toLocaleString()}</p>
            <p>Gratuity (2%): Rp {adjustedDetails.gratuity.toLocaleString()}</p>
            <p className="text-lg font-bold text-[#4CAF50]">
              Total yang harus dibayar: Rp {adjustedTotal.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Diskon Total:</label>
          <select
            value={selectedDiscountId || ""}
            onChange={(e) => setSelectedDiscountId(e.target.value ? Number(e.target.value) : null)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">Tidak ada diskon</option>
            {discounts.filter(d => d.scope === "TOTAL").map((discount) => (
              <option key={discount.id} value={discount.id}>
                {discount.name} ({discount.type === "PERCENTAGE" ? `${discount.value}%` : `Rp${discount.value}`})
              </option>
            ))}
          </select>
        </div>

        <select
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            setCashGiven("");
            setChange(0);
          }}
          className="w-full p-2 border border-gray-300 rounded-md mb-4"
        >
          <option value="tunai">Tunai</option>
          <option value="kartu">Kartu Kredit/Debit</option>
          <option value="e-wallet">E-Wallet</option>
        </select>

        {paymentMethod !== "tunai" && (
          <input
            type="text"
            placeholder="Masukkan ID Pembayaran"
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md mb-4"
          />
        )}

        {paymentMethod === "tunai" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Uang yang Diberikan</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*\.?[0-9]*"
              placeholder="Masukkan jumlah uang"
              value={cashGiven}
              onChange={handleCashGivenChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
            {cashGiven && change > 0 && (
              <p className="text-green-600 mt-2">Kembalian: Rp {change.toLocaleString()}</p>
            )}
            {cashGiven && change < 0 && (
              <p className="text-red-600 mt-2">Uang yang diberikan kurang: Rp {(-change).toLocaleString()}</p>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md"
          >
            Batal
          </button>
          <button
            onClick={handleConfirmPayment}
            className="px-4 py-2 bg-[#4CAF50] hover:bg-[#45a049] text-white rounded-md"
          >
            Konfirmasi Pembayaran
          </button>
        </div>
      </div>
    </div>
  );
}

export default CombinedPaymentForm;