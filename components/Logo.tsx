export function Logo({
  className = "",
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 40 44"
        className="h-9 w-8 shrink-0"
        aria-hidden="true"
      >
        <path
          d="M20 1.5 36 8.2v12.4c0 10.2-6.4 18.8-16 21.9C10.4 39.4 4 30.8 4 20.6V8.2L20 1.5Z"
          fill={inverted ? "#14b8a6" : "#0a2540"}
        />
        <path
          d="M20 5.2 32.6 10.4v9.8c0 8.2-5.1 15.1-12.6 17.6C13 35.3 7.4 28.4 7.4 20.2v-9.8L20 5.2Z"
          fill={inverted ? "#0a2540" : "#123456"}
        />
        <path
          d="M14 16.2c2.4-3.2 7.8-3.6 10.2-.4 1.4 1.8 1.3 4.2-.2 5.8L20 26.2l-4-4.6c-1.5-1.6-1.6-4-.2-5.8 1-1.3 2.8-1.8 4.5-1.4"
          fill="none"
          stroke="#14b8a6"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="24.8" cy="15.2" r="1.5" fill="#b8923a" />
      </svg>
      <span className="leading-tight">
        <span
          className={`display block text-[1.05rem] font-semibold tracking-tight ${inverted ? "text-white" : "text-navy"}`}
        >
          Safeway
        </span>
        <span
          className={`block text-[0.62rem] font-semibold uppercase tracking-[0.22em] ${inverted ? "text-teal-bright" : "text-teal"}`}
        >
          Couriers
        </span>
      </span>
    </span>
  );
}

export function LogoMark({ className = "h-10 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 44" className={className} aria-hidden="true">
      <path
        d="M20 1.5 36 8.2v12.4c0 10.2-6.4 18.8-16 21.9C10.4 39.4 4 30.8 4 20.6V8.2L20 1.5Z"
        fill="#0a2540"
      />
      <path
        d="M14 16.2c2.4-3.2 7.8-3.6 10.2-.4 1.4 1.8 1.3 4.2-.2 5.8L20 26.2l-4-4.6c-1.5-1.6-1.6-4-.2-5.8 1-1.3 2.8-1.8 4.5-1.4"
        fill="none"
        stroke="#14b8a6"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="24.8" cy="15.2" r="1.5" fill="#b8923a" />
    </svg>
  );
}
