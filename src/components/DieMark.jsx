// The brand die — the black-and-gold 3D die that stands in for the "C" in the
// "Craps Trainer" wordmark. Same geometry as the favicon (public/favicon.svg),
// minus the ground shadow and tighter-cropped so it sits inline like a glyph.
// Pips are drawn in unit grid space and matrix-mapped onto each face plane so
// the circles foreshorten into correct ellipses on the tilted faces.
export default function DieMark({ className = "", title = "Craps Trainer" }) {
  return (
    <svg className={className} viewBox="12 5 76 90" role="img" aria-label={title}
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bd-ft" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#40414b" /><stop offset="1" stopColor="#24252d" />
        </linearGradient>
        <linearGradient id="bd-fl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b1c23" /><stop offset="1" stopColor="#121319" />
        </linearGradient>
        <linearGradient id="bd-fr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f1014" /><stop offset="1" stopColor="#08080c" />
        </linearGradient>
        <radialGradient id="bd-pip" cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff2c2" /><stop offset="0.55" stopColor="#f5c518" /><stop offset="1" stopColor="#c99a06" />
        </radialGradient>
      </defs>
      <polygon points="50,8 85,28 50,48 15,28" fill="url(#bd-ft)" stroke="#000" strokeWidth="0.5" strokeLinejoin="round" />
      <polygon points="15,28 50,48 50,92 15,72" fill="url(#bd-fl)" stroke="#000" strokeWidth="0.5" strokeLinejoin="round" />
      <polygon points="85,28 50,48 50,92 85,72" fill="url(#bd-fr)" stroke="#000" strokeWidth="0.5" strokeLinejoin="round" />
      <polyline points="15,28 50,8 85,28" fill="none" stroke="#f5c518" strokeWidth="0.9" strokeLinecap="round" opacity="0.55" />
      <g fill="url(#bd-pip)">
        <g transform="matrix(35 -20 35 20 15 28)">
          <circle cx="0.28" cy="0.28" r="0.085" /><circle cx="0.72" cy="0.28" r="0.085" />
          <circle cx="0.5" cy="0.5" r="0.085" />
          <circle cx="0.28" cy="0.72" r="0.085" /><circle cx="0.72" cy="0.72" r="0.085" />
        </g>
        <g transform="matrix(35 20 0 44 15 28)">
          <circle cx="0.28" cy="0.28" r="0.08" /><circle cx="0.5" cy="0.5" r="0.08" /><circle cx="0.72" cy="0.72" r="0.08" />
        </g>
        <g transform="matrix(35 -20 0 44 50 48)">
          <circle cx="0.28" cy="0.26" r="0.075" /><circle cx="0.28" cy="0.5" r="0.075" /><circle cx="0.28" cy="0.74" r="0.075" />
          <circle cx="0.72" cy="0.26" r="0.075" /><circle cx="0.72" cy="0.5" r="0.075" /><circle cx="0.72" cy="0.74" r="0.075" />
        </g>
      </g>
    </svg>
  );
}
