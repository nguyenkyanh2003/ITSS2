import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useNotification } from "../../context/NotificationContext";

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const errorTitle = "Lỗi";
  const successTitle = "Thành công";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const validateEmail = (val: string) => {
    if (!val) {
      return "Email không được để trống";
    } else if (!val.endsWith("@sis.hust.edu.vn")) {
      return "Vui lòng sử dụng email sinh viên định dạng @sis.hust.edu.vn";
    }
    return "";
  };

  const validatePassword = (val: string) => {
    if (!val) {
      return "Mật khẩu không được để trống";
    }
    return "";
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (emailTouched) {
      setEmailError(validateEmail(val));
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailError(validateEmail(email));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (passwordTouched) {
      setPasswordError(validatePassword(val));
    }
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
    setPasswordError(validatePassword(password));
  };

  const isFormInvalid = !!validateEmail(email) || !!validatePassword(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setEmailTouched(true);
    setPasswordTouched(true);
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    
    if (eErr) {
      showNotification(errorTitle, eErr, "error");
      return;
    }
    if (pErr) {
      showNotification(errorTitle, pErr, "error");
      return;
    }

    try {
      await login(email, password);
      showNotification(successTitle, t.loginButton + " thành công!", "success");
      navigate("/");
    } catch (error: any) {
      showNotification(errorTitle, error.message || "Đăng nhập thất bại", "error");
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

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t.loginTitle}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.emailLabel}
              </label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder={t.emailPlaceholder}
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
                onChange={handlePasswordChange}
                onBlur={handlePasswordBlur}
                placeholder={t.passwordPlaceholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5C00] focus:border-[#FF5C00] outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full text-white py-3 rounded-lg transition-all font-medium bg-[#FF5C00] hover:bg-[#E54F00] active:scale-[0.98] active:bg-[#CC4A00] shadow-md hover:shadow-lg"
            >
              {t.loginButton}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            {t.noAccount}{" "}
            <Link to="/register" className="text-[#FF5C00] hover:underline font-medium">
              {t.registerNow}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
