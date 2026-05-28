import { useState } from "react";
import { X } from "lucide-react";
import { Product } from "../store/ProductStore";
import { useLanguage } from "../context/LanguageContext";

interface BookingModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: (time: string, spot: string) => void;
}

const CAMPUS_SPOTS = [
  "Nhà B1",
  "Thư viện Tạ Quang Bửu",
  "Cổng Parabol",
  "Cổng Trần Đại Nghĩa",
];

export function BookingModal({ product, onClose, onConfirm }: BookingModalProps) {
  const { t } = useLanguage();
  const [selectedSpot, setSelectedSpot] = useState("");
  const [customSpot, setCustomSpot] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const isCustomSpot = selectedSpot === "__custom__";
  const finalSpot = isCustomSpot ? customSpot : selectedSpot;
  const canConfirm = finalSpot.trim() && selectedTime;

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm(selectedTime, finalSpot);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{t.bookingTitle}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Spot Selection */}
          <div>
            <label className="block font-semibold text-gray-900 mb-3">
              {t.selectSpotLabel} <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSpot}
              onChange={(e) => {
                setSelectedSpot(e.target.value);
                if (e.target.value !== "__custom__") setCustomSpot("");
              }}
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00] focus:border-transparent bg-white text-gray-900 border border-gray-200 shadow-lg"
            >
              <option value="">{t.selectSpotPlaceholder}</option>
              {CAMPUS_SPOTS.map((spot) => (
                <option key={spot} value={spot}>
                  {spot}
                </option>
              ))}
              <option value="__custom__">{t.customSpotOption}</option>
            </select>
          </div>

          {/* Custom Spot Input */}
          {isCustomSpot && (
            <div>
              <label className="block font-semibold text-gray-900 mb-3">
                {t.enterSpotLabel} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customSpot}
                onChange={(e) => setCustomSpot(e.target.value)}
                placeholder={t.enterSpotPlaceholder}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00] focus:border-transparent"
              />
            </div>
          )}

          {/* Time Slot Selection */}
          <div>
            <label className="block font-semibold text-gray-900 mb-3">
              {t.selectTimeLabel} <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {product.availableTimeSlots.map((slot, index) => {
                const timeValue = `${slot.day}: ${slot.time}`;
                const displayDay = t.days[slot.day] ?? slot.day;
                return (
                  <label
                    key={index}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTime === timeValue
                        ? "border-[#FF5C00] bg-orange-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="timeSlot"
                      value={timeValue}
                      checked={selectedTime === timeValue}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-4 h-4 text-[#FF5C00] focus:ring-[#FF5C00]"
                    />
                    <span className="ml-3 flex-1">
                      <span className="font-semibold">{displayDay}</span>
                      <span className="text-gray-600 ml-2">{slot.time}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                canConfirm
                  ? "bg-[#FF5C00] text-white hover:bg-[#E65100]"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {t.confirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
