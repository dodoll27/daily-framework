// Hand-drawn marks and collage bits. Pure SVG, so they stay crisp and light.

/** Wobbly marker underline that sits under a word. */
export function Scribble({ color = "var(--pink)", className = "" }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden className={`pointer-events-none ${className}`}>
      <path d="M3 9c22-5 44-6 66-4s40 3 62 0 44-5 66-2" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <path d="M12 12c30-3 70-4 110-2s52 0 70-2" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity=".6" />
    </svg>
  );
}

/** Hand-drawn circle loop for emphasis. */
export function Loop({ color = "var(--pink)", className = "" }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 120 60" preserveAspectRatio="none" aria-hidden className={`pointer-events-none ${className}`}>
      <path d="M62 6C30 3 6 14 5 30s26 25 58 24 52-12 51-27S88 2 50 9" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Star({ color = "var(--accent)", className = "" }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={`pointer-events-none ${className}`}>
      <path d="M20 3l3 12 13-2-11 8 7 12-12-7-9 10 2-13-11-6 13-1z" fill={color} stroke="var(--fg)" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function Arrow({ color = "var(--fg)", className = "" }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 80 40" aria-hidden className={`pointer-events-none ${className}`}>
      <path d="M4 30c14-14 34-22 62-16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M56 6l11 8-12 6" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Rubber-stamp ring with curved text. */
export function Stamp({ text, color = "var(--danger)", className = "" }: { text: string; color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={`pointer-events-none opacity-80 mix-blend-multiply ${className}`}>
      <defs>
        <path id="stamp-arc" d="M50 50m-34 0a34 34 0 1 1 68 0a34 34 0 1 1-68 0" />
      </defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="3" strokeDasharray="60 3 30 2" />
      <circle cx="50" cy="50" r="24" fill="none" stroke={color} strokeWidth="1.5" />
      <text fill={color} fontFamily="var(--font-space-mono)" fontSize="10.5" letterSpacing="2.5">
        <textPath href="#stamp-arc">{text}</textPath>
      </text>
    </svg>
  );
}

/** A torn scrap of coloured paper, for layering behind content. */
export function Scrap({ color, className = "", style }: { color: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute ${className}`}
      style={{
        background: color,
        backgroundImage: "var(--grain)",
        backgroundBlendMode: "multiply",
        clipPath: "polygon(2% 8%, 18% 0, 41% 6%, 63% 1%, 86% 7%, 100% 2%, 97% 38%, 100% 71%, 95% 100%, 70% 94%, 44% 100%, 21% 95%, 0 100%, 4% 64%, 0 33%)",
        ...style,
      }} />
  );
}
