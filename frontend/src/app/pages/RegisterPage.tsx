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
    console.log("Form Data:", { fullName, email, phone, password, confirmPassword });

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
      showNotification(successTitle, t.registerButton + " thành công!", "success");
      navigate("/");
    } catch (error: any) {
      showNotification(errorTitle, error.message || "Đăng ký thất bại", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Simple Header */}
      <header className="bg-[#FF5C00] px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2 text-white hover:opacity-90 transition-opacity w-fit">
            <Store className="w-8 h-8" />
            <h1 className="text-2xl font-bold">{t.appName}</h1>
          </Link>
        </div>
      </header>

      {/* Register Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t.registerTitle}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.fullNameLabel}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t.fullNamePlaceholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5C00] focus:border-[#FF5C00] outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.emailLabel}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5C00] focus:border-[#FF5C00] outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.phoneLabel}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.phonePlaceholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5C00] focus:border-[#FF5C00] outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.passwordLabel}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5C00] focus:border-[#FF5C00] outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5C00] focus:border-[#FF5C00] outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full text-white py-3 rounded-lg transition-all font-medium bg-[#FF5C00] hover:bg-[#E54F00] active:scale-[0.98] active:bg-[#CC4A00] shadow-md hover:shadow-lg mt-2"
            >
              {t.registerButton}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            {t.hasAccount}{" "}
            <Link to="/login" className="text-[#FF5C00] hover:underline font-medium">
              {t.loginNow}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
