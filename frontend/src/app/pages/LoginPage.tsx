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

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-sm shadow-md p-8 w-full max-w-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{t.loginTitle}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">{t.emailLabel}</label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder={t.emailPlaceholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-sm outline-none focus:border-[#EE4D2D] transition-colors"
              />
              {emailTouched && emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">{t.passwordLabel}</label>
              <input
                type="password"
                value={password}
                onChange={handlePasswordChange}
                onBlur={handlePasswordBlur}
                placeholder={t.passwordPlaceholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-sm outline-none focus:border-[#EE4D2D] transition-colors"
              />
              {passwordTouched && passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
            </div>

            <button
              type="submit"
              disabled={isFormInvalid}
              className="w-full text-white py-3 rounded-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#EE4D2D" }}
            >
              {t.loginButton}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-gray-500">
            {t.noAccount}{" "}
            <Link to="/register" className="font-medium hover:underline" style={{ color: "#EE4D2D" }}>
              {t.registerNow}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
