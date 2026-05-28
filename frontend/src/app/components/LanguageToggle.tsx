import { useLanguage } from "../context/LanguageContext";

export function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      onClick={toggleLang}
      title={lang === "vi" ? "日本語に切り替え" : "ベトナム語に切り替え"}
      className="flex items-center gap-1 bg-white bg-opacity-20 hover:bg-opacity-30 transition-all rounded-full px-3 py-1.5 border border-white border-opacity-40 select-none"
    >
      {/* Vietnamese side */}
      <span
        className={`flex items-center gap-1 transition-opacity ${
          lang === "vi" ? "opacity-100" : "opacity-50"
        }`}
      >
        <span className="text-base leading-none">🇻🇳</span>
        <span className="text-white text-xs font-bold tracking-wide">VI</span>
      </span>

      {/* Divider */}
      <span className="text-white text-opacity-60 mx-1 text-xs">|</span>

      {/* Japanese side */}
      <span
        className={`flex items-center gap-1 transition-opacity ${
          lang === "ja" ? "opacity-100" : "opacity-50"
        }`}
      >
        <span className="text-base leading-none">🇯🇵</span>
        <span className="text-white text-xs font-bold tracking-wide">JP</span>
      </span>
    </button>
  );
}
