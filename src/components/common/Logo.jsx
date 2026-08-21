/**
 * App logo — replace /logo.svg or /logo.png in public/ to use your own.
 * Falls back to gradient "MF" mark.
 */
export default function Logo({ size = 36, className = "" }) {
  const s = typeof size === "number" ? size : 36;
  return (
    <div
      className={`relative shrink-0 rounded-xl overflow-hidden flex items-center justify-center ${className}`}
      style={{ width: s, height: s }}
    >
      <img
        src="/money-stack.png"
        alt="MoneyFlow"
        className="w-full h-full object-contain"
        onError={(e) => {
          e.currentTarget.style.display = "none";
          const fallback = e.currentTarget.nextElementSibling;
          if (fallback) fallback.style.display = "flex";
        }}
      />
      <div
        className="absolute inset-0 hidden items-center justify-center text-white font-bold bg-gradient-to-br from-teal-500 to-teal-700 shadow-md shadow-teal-500/30"
        style={{ fontSize: Math.max(10, s * 0.35) }}
      >
        MF
      </div>
    </div>
  );
}
