const STAGES = [
  { id: "pickup", label: "Pickup", x: 78, y: 268 },
  { id: "transport", label: "Secure transport", x: 188, y: 148 },
  { id: "tracking", label: "Tracking", x: 320, y: 214 },
  { id: "delivery", label: "Delivery", x: 448, y: 118 },
  { id: "pod", label: "Proof of delivery", x: 558, y: 236 },
] as const;

export function LogisticsNetwork() {
  return (
    <div className="mkt-network relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-charcoal shadow-[0_40px_80px_-40px_rgba(0,0,0,0.85)]">
      <div className="mkt-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(26,111,181,0.22),transparent_42%)]" />
      <div className="mkt-scan pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-medical/0 via-medical/25 to-medical/0" />

      <svg viewBox="0 0 640 420" className="relative h-auto w-full max-h-[28rem] lg:max-h-[32rem]" aria-hidden="true">
        <defs>
          <linearGradient id="mkt-route" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1a6fb5" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#7ec8f2" />
            <stop offset="100%" stopColor="#1a6fb5" stopOpacity="0.2" />
          </linearGradient>
          <filter id="mkt-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <path
            id="mkt-path"
            d="M78 268 C140 268 150 148 188 148 S270 214 320 214 S400 118 448 118 S520 236 558 236"
          />
        </defs>

        <g opacity="0.22" stroke="#1a6fb5" strokeWidth="0.6">
          {Array.from({ length: 12 }, (_, i) => (
            <line key={`v-${i}`} x1={40 + i * 50} y1="24" x2={40 + i * 50} y2="396" />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <line key={`h-${i}`} x1="24" y1={36 + i * 46} x2="616" y2={36 + i * 46} />
          ))}
        </g>

        <circle cx="320" cy="210" r="92" fill="none" stroke="rgba(26,111,181,0.18)" />
        <circle cx="320" cy="210" r="148" fill="none" stroke="rgba(26,111,181,0.1)" />

        <use href="#mkt-path" fill="none" stroke="rgba(126,200,242,0.18)" strokeWidth="6" />
        <use
          href="#mkt-path"
          className="mkt-route-draw"
          fill="none"
          stroke="url(#mkt-route)"
          strokeWidth="2.2"
          filter="url(#mkt-glow)"
        />

        <circle r="5" fill="#e8eef3" className="mkt-shipment">
          <animateMotion dur="9s" repeatCount="indefinite">
            <mpath href="#mkt-path" />
          </animateMotion>
        </circle>

        {STAGES.map((stage, index) => (
          <g key={stage.id}>
            <circle
              cx={stage.x}
              cy={stage.y}
              r="18"
              fill="none"
              stroke="#2b86d1"
              strokeWidth="1.2"
              className="mkt-pulse"
              style={{ animationDelay: `${index * 0.45}s` }}
            />
            <circle cx={stage.x} cy={stage.y} r="6" fill="#1a6fb5" className="mkt-glow-node" />
            <circle cx={stage.x} cy={stage.y} r="2.2" fill="#e8eef3" />
            <text
              x={stage.x}
              y={stage.y + 34}
              textAnchor="middle"
              fill="#9aa8b5"
              fontSize="10"
              letterSpacing="0.14em"
              className="uppercase"
            >
              {stage.label}
            </text>
          </g>
        ))}

        <g fill="#9aa8b5" fontSize="9" letterSpacing="0.12em">
          <text x="36" y="40">
            39.9612° N
          </text>
          <text x="36" y="54">
            82.9988° W
          </text>
          <text x="470" y="40">
            NETWORK · LIVE
          </text>
          <text x="470" y="54">
            CUSTODY CHECKPOINTS
          </text>
        </g>
      </svg>

      <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-void/70 px-4 py-3 text-[0.7rem] uppercase tracking-[0.16em] text-mist-soft backdrop-blur-sm sm:px-5">
        <span>Pickup → Secure transport → Tracking → Delivery → POD</span>
        <span className="text-sky-300">Chain of custody in motion</span>
      </div>
    </div>
  );
}
