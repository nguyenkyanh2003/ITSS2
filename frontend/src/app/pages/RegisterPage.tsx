import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useNotification } from "../../context/NotificationContext";

export function RegisterPage() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const errorTitle = "Lỗi";
  const successTitle = "Thành công";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showNotification(errorTitle, "Vui lòng nhập họ và tên", "error");
      return;
    }

    if (!email.trim()) {
      showNotification(errorTitle, "Vui lòng nhập email sinh viên hợp lệ", "error");
      return;
    } else if (!email.endsWith("@sis.hust.edu.vn")) {
      showNotification(errorTitle, "Vui lòng nhập email sinh viên hợp lệ", "error");
      return;
    }

    if (!phone.trim()) {
      showNotification(errorTitle, "Vui lòng nhập số điện thoại", "error");
      return;
    }

    if (!password) {
      showNotification(errorTitle, "Vui lòng nhập mật khẩu", "error");
      return;
    }

    if (!confirmPassword) {
      showNotification(errorTitle, "Mật khẩu xác nhận không khớp", "error");
      return;
    } else if (password !== confirmPassword) {
      showNotification(errorTitle, "Mật khẩu xác nhận không khớp", "error");
      return;
    }

    try {
      await register(fullName, email, phone, password);
      showNotification(successTitle, t.registerButton + " thành công! Vui lòng đăng nhập.", "success");
      navigate("/login");
    } catch (error: any) {
      showNotification(errorTitle, error.message || "Đăng ký thất bại", "error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F5F5F5" }}>
      {/* Header */}
      <header style={{ backgroundColor: "#EE4D2D" }}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <Link to="/" className="inline-block">
            <span className="text-white text-xl font-black">
              Hust<span className="text-yellow-300">Trade</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Register Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-sm shadow-md p-8 w-full max-w-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{t.registerTitle}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">{t.fullNameLabel}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t.fullNamePlaceholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-sm outline-none focus:border-[#EE4D2D] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">{t.emailLabel}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-sm outline-none focus:border-[#EE4D2D] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">{t.phoneLabel}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.phonePlaceholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-sm outline-none focus:border-[#EE4D2D] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">{t.passwordLabel}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-sm outline-none focus:border-[#EE4D2D] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Xác nhận mật khẩu</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-sm outline-none focus:border-[#EE4D2D] transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full text-white py-3 rounded-sm font-medium transition-opacity hover:opacity-90 mt-2"
              style={{ backgroundColor: "#EE4D2D" }}
            >
              {t.registerButton}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-gray-500">
            {t.hasAccount}{" "}
            <Link to="/login" className="font-medium hover:underline" style={{ color: "#EE4D2D" }}>
              {t.loginNow}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
