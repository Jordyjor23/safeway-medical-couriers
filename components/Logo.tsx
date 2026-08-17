export function Logo({
  inverted = false,
  className = "",
}: {
  inverted?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill={inverted ? "#1a6fb5" : "#0b1c33"} />
        <path
          d="M11 26.5c3.2-7.4 7-12.2 9-14.8 2 2.6 5.8 7.4 9 14.8"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <circle cx="20" cy="10.5" r="2.1" fill="#7ec8f2" />
        <path
          d="M16.2 21.2h7.6"
          stroke="#7ec8f2"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <span className="leading-tight">
        <span
          className={`block text-[1.05rem] font-bold tracking-tight ${inverted ? "text-white" : "text-navy"}`}
        >
          Safeway
        </span>
        <span
          className={`block text-[0.62rem] font-semibold uppercase tracking-[0.2em] ${inverted ? "text-sky-200" : "text-medical"}`}
        >
          Couriers
        </span>
      </span>
    </span>
  );
}
