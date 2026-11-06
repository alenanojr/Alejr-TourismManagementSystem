// Island panorama for banners (home hero, dashboard welcome, auth). Transparent:
// the container supplies the sky. Silhouettes use currentColor — set `color` in CSS.

function Palm({ x, y, s = 1, lean = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="currentColor">
      <path d={`M${-30 * lean} 130 C${-20 * lean} 90 ${-12 * lean} 40 0 0`} stroke="currentColor" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M0 0 C-20 -18 -50 -14 -66 6 C-46 -2 -24 0 0 0Z" />
      <path d="M0 0 C20 -20 52 -16 68 4 C48 -4 24 -2 0 0Z" />
      <path d="M0 0 C-12 -26 -36 -38 -56 -30 C-36 -24 -18 -14 0 0Z" />
      <path d="M0 0 C14 -28 40 -38 58 -28 C38 -22 20 -12 0 0Z" />
      <path d="M0 0 C-6 14 -24 30 -40 34 C-26 22 -12 10 0 0Z" />
      <path d="M0 0 C8 14 26 28 42 30 C28 20 14 10 0 0Z" />
    </g>
  );
}

// Filipino outrigger boat.
function Bangka({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-40 7 Q0 11 40 7" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M-30 -2 L-36 7 M30 -2 L36 7 M-12 -1 L-14 8 M12 -1 L14 8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M-27 -5 Q0 8 27 -5 L23 -9 Q0 0 -23 -9Z" fill="currentColor" />
      <path d="M-4 -8 L-2 -26 L12 -10Z" fill="currentColor" />
    </g>
  );
}

export function HeroArt({ className = '' }) {
  return (
    <svg className={`hero-art ${className}`} viewBox="0 0 1440 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <g fill="currentColor">
        <path opacity=".18" d="M-20 196 C60 158 140 146 230 170 C270 162 320 164 370 182 L370 240 L-20 240Z" />
        <path opacity=".18" d="M850 192 C940 136 1060 122 1170 166 C1230 152 1310 154 1460 178 L1460 240 L850 240Z" />
        <path opacity=".3" d="M1000 214 C1056 180 1180 172 1270 210Z" />
      </g>
      <g opacity=".3">
        <Palm x={1100} y={142} s={0.58} />
        <Palm x={1166} y={130} s={0.66} lean={-1} />
      </g>
      <g fill="#fff">
        <path opacity=".07" d="M0 204 C120 194 240 214 360 204 S600 194 720 204 S960 214 1080 204 S1320 194 1440 204 V240 H0Z" />
        <path opacity=".09" d="M0 220 C140 212 260 228 400 220 S640 212 780 220 S1040 228 1180 220 S1360 214 1440 220 V240 H0Z" />
      </g>
      <g opacity=".45"><Bangka x={430} y={206} s={1.6} /></g>
      <g stroke="#fff" strokeOpacity=".7" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M1286 118 q6 -6 12 0 q6 -6 12 0" />
        <path d="M1316 106 q5 -5 10 0 q5 -5 10 0" />
        <path d="M1304 132 q4 -4 8 0 q4 -4 8 0" />
      </g>
    </svg>
  );
}
