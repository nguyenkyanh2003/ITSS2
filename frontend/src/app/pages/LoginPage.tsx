import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, X, KeyRound, Mail, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useNotification } from "../../context/NotificationContext";
import { getApiUrl } from "../../utils/api";

// ── Forgot Password Modal ─────────────────────────────────────────────────────
function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [step, setStep] = useState<1 | 2>(1);
  const [fpEmail, setFpEmail] = useState("");
  const [fpToken, setFpToken] = useState("");
  const [fpNewPassword, setFpNewPassword] = useState("");
  const [fpConfirmPassword, setFpConfirmPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fpEmail.trim()) { setError(t.errForgotEmailRequired); return; }
    if (!fpEmail.endsWith("@sis.hust.edu.vn")) {
      setError(t.errForgotInvalidEmail);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Error");
      if (data.resetToken) setFpToken(data.resetToken);
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fpToken.trim()) { setError(t.errForgotTokenRequired); return; }
    if (fpNewPassword.length < 6) { setError(t.errForgotPwdTooShort); return; }
    if (fpNewPassword !== fpConfirmPassword) { setError(t.errForgotPwdMismatch); return; }
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: fpToken.trim(), newPassword: fpNewPassword }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Error");
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#EE4D2D]" />
            <h3 className="text-lg font-semibold text-gray-900">{t.forgotPasswordTitle}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicators */}
        {!done && (
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${step === 1 ? "bg-[#EE4D2D] text-white" : "bg-green-500 text-white"}`}>
              {step === 2 ? "✓" : "1"}
            </div>
            <div className={`flex-1 h-0.5 ${step === 2 ? "bg-[#EE4D2D]" : "bg-gray-200"}`} />
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${step === 2 ? "bg-[#EE4D2D] text-white" : "bg-gray-200 text-gray-500"}`}>
              2
            </div>
          </div>
        )}

        {/* Done state */}
        {done ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">{t.forgotPasswordDoneTitle}</h4>
            <p className="text-sm text-gray-500 mb-6">{t.forgotPasswordDoneDesc}</p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#EE4D2D" }}
            >
              {t.forgotPasswordBackToLogin}
            </button>
          </div>
        ) : step === 1 ? (
          /* Step 1: Enter email */
          <form onSubmit={handleRequestReset} className="space-y-4">
            <p className="text-sm text-gray-600">{t.forgotPasswordStep1Desc}</p>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5 font-medium">
                {t.forgotPasswordEmailLabel}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                  placeholder="ten.abc@sis.hust.edu.vn"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#EE4D2D] transition-colors"
                />
              </div>
            </div>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg text-white font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#EE4D2D" }}
            >
              {isLoading ? t.forgotPasswordSending : t.forgotPasswordSendBtn}
            </button>
          </form>
        ) : (
          /* Step 2: Enter token + new password */
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm text-gray-600">{t.forgotPasswordStep2Desc}</p>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5 font-medium">
                {t.forgotPasswordTokenLabel}
              </label>
              <input
                type="text"
                value={fpToken}
                onChange={(e) => setFpToken(e.target.value)}
                placeholder={t.forgotPasswordTokenPlaceholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#EE4D2D] transition-colors font-mono"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5 font-medium">
                {t.forgotPasswordNewPwdLabel}
              </label>
              <div className="relative">
                <input
                  type={showNewPwd ? "text" : "password"}
                  value={fpNewPassword}
                  onChange={(e) => setFpNewPassword(e.target.value)}
                  placeholder={t.forgotPasswordNewPwdPlaceholder}
                  className="w-full px-4 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#EE4D2D] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5 font-medium">
                {t.forgotPasswordConfirmPwdLabel}
              </label>
              <input
                type="password"
                value={fpConfirmPassword}
                onChange={(e) => setFpConfirmPassword(e.target.value)}
                placeholder={t.forgotPasswordConfirmPwdPlaceholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#EE4D2D] transition-colors"
              />
            </div>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2">{error}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep(1); setError(""); }}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                {t.forgotPasswordBack}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#EE4D2D" }}
              >
                {isLoading ? t.forgotPasswordSaving : t.forgotPasswordResetBtn}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── LoginPage ─────────────────────────────────────────────────────────────────
export function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const errorTitle = "Lỗi";
  const successTitle = "Thành công";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

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

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

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
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  placeholder={t.passwordPlaceholder}
                  className="w-full px-4 pr-10 py-2.5 border border-gray-300 rounded-sm text-sm outline-none focus:border-[#EE4D2D] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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

          {/* Forgot password link — below login button like Shopee */}
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-sm hover:underline transition-colors"
              style={{ color: "#EE4D2D" }}
            >
              {t.forgotPasswordLink}
            </button>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
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
