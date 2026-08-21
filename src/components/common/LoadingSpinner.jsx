export default function LoadingSpinner({ label = "Preparing workspace..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative w-16 h-12 flex items-center justify-center">
        {/* Back Card */}
        <div className="absolute inset-x-2 top-0 h-8 rounded-lg bg-teal-500/20 dark:bg-teal-500/10 border border-teal-500/20 animate-pulse [animation-delay:-0.4s]" />

        {/* Middle Card */}
        <div className="absolute inset-x-1 top-2 h-8 rounded-lg bg-teal-600/30 dark:bg-teal-500/20 border border-teal-500/30 animate-pulse [animation-delay:-0.2s]" />

        {/* Top Floating Glass Card */}
        <div className="relative inset-x-0 top-4 h-9 w-full rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-lg flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            MF
          </span>
        </div>
      </div>

      {label && (
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
          {label}
        </p>
      )}
    </div>
  );
}
