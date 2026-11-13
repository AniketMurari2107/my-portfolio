/**
 * Procedural local SVG preview graphics for default project showroom cards.
 * Keeps initial portfolio builds self-contained with zero broken external image URLs.
 * You can replace any project's `image` field in `portfolioData.js` with a custom image path or URL.
 */

function toSvgDataUri(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const PROJECT_THUMBNAILS = {
  attendance: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#071126"/>
          <stop offset="100%" stop-color="#0d1b38"/>
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#bg1)"/>
      <g stroke="#1e3a8a" stroke-opacity="0.35" stroke-width="1">
        <line x1="0" y1="60" x2="640" y2="60"/><line x1="0" y1="120" x2="640" y2="120"/>
        <line x1="0" y1="180" x2="640" y2="180"/><line x1="0" y1="240" x2="640" y2="240"/>
        <line x1="0" y1="300" x2="640" y2="300"/>
      </g>
      <rect x="44" y="38" width="552" height="284" rx="16" fill="#0b132b" stroke="#06b6d4" stroke-opacity="0.55" stroke-width="2"/>
      <rect x="68" y="62" width="170" height="22" rx="6" fill="#06b6d4" fill-opacity="0.22"/>
      <text x="80" y="77" fill="#38bdf8" font-family="monospace" font-size="12" font-weight="bold">ATTENDANCE TRACKER</text>
      <rect x="452" y="62" width="120" height="22" rx="6" fill="#10b981" fill-opacity="0.2"/>
      <text x="470" y="77" fill="#34d399" font-family="monospace" font-size="12" font-weight="bold">94% PRESENT</text>
      <rect x="68" y="106" width="504" height="44" rx="8" fill="#111c3a" stroke="#1e293b"/>
      <circle cx="94" cy="128" r="10" fill="#06b6d4"/>
      <rect x="118" y="121" width="160" height="14" rx="4" fill="#e2e8f0" fill-opacity="0.85"/>
      <rect x="488" y="118" width="66" height="20" rx="5" fill="#10b981" fill-opacity="0.25"/>
      <rect x="68" y="162" width="504" height="44" rx="8" fill="#111c3a" stroke="#1e293b"/>
      <circle cx="94" cy="184" r="10" fill="#3b82f6"/>
      <rect x="118" y="177" width="190" height="14" rx="4" fill="#cbd5e1" fill-opacity="0.8"/>
      <rect x="488" y="174" width="66" height="20" rx="5" fill="#10b981" fill-opacity="0.25"/>
      <rect x="68" y="218" width="504" height="44" rx="8" fill="#111c3a" stroke="#1e293b"/>
      <circle cx="94" cy="240" r="10" fill="#8b5cf6"/>
      <rect x="118" y="233" width="140" height="14" rx="4" fill="#94a3b8" fill-opacity="0.8"/>
      <rect x="488" y="230" width="66" height="20" rx="5" fill="#f59e0b" fill-opacity="0.25"/>
      <rect x="68" y="278" width="504" height="14" rx="7" fill="#1e293b"/>
      <rect x="68" y="278" width="390" height="14" rx="7" fill="#06b6d4"/>
    </svg>
  `),
  gym: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#090d1f"/>
          <stop offset="100%" stop-color="#171436"/>
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#bg2)"/>
      <rect x="44" y="38" width="552" height="284" rx="16" fill="#0c1228" stroke="#8b5cf6" stroke-opacity="0.55" stroke-width="2"/>
      <text x="68" y="76" fill="#c4b5fd" font-family="monospace" font-size="13" font-weight="bold">GYM MANAGEMENT CONSOLE</text>
      <rect x="68" y="96" width="156" height="92" rx="10" fill="#141c3a" stroke="#312e81"/>
      <text x="84" y="126" fill="#94a3b8" font-family="sans-serif" font-size="12">Active Members</text>
      <text x="84" y="162" fill="#38bdf8" font-family="monospace" font-size="28" font-weight="bold">248</text>
      <rect x="242" y="96" width="156" height="92" rx="10" fill="#141c3a" stroke="#312e81"/>
      <text x="258" y="126" fill="#94a3b8" font-family="sans-serif" font-size="12">Plans Renewed</text>
      <text x="258" y="162" fill="#a78bfa" font-family="monospace" font-size="28" font-weight="bold">92%</text>
      <rect x="416" y="96" width="156" height="92" rx="10" fill="#141c3a" stroke="#312e81"/>
      <text x="432" y="126" fill="#94a3b8" font-family="sans-serif" font-size="12">Daily Check-ins</text>
      <text x="432" y="162" fill="#34d399" font-family="monospace" font-size="28" font-weight="bold">114</text>
      <rect x="68" y="206" width="504" height="94" rx="10" fill="#101833" stroke="#1e293b"/>
      <polyline points="90,276 160,256 230,264 300,238 370,244 440,222 548,228" fill="none" stroke="#8b5cf6" stroke-width="4" stroke-linecap="round"/>
      <polyline points="90,284 160,270 230,274 300,254 370,260 440,242 548,246" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  `),
  portfolio3d: toSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="bg3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#050816"/>
          <stop offset="100%" stop-color="#0b1836"/>
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#bg3)"/>
      <g stroke="#06b6d4" stroke-opacity="0.22" stroke-width="1.2">
        <line x1="0" y1="260" x2="640" y2="260"/><line x1="80" y1="220" x2="560" y2="220"/>
        <line x1="320" y1="160" x2="40" y2="360"/><line x1="320" y1="160" x2="600" y2="360"/>
        <line x1="320" y1="160" x2="210" y2="360"/><line x1="320" y1="160" x2="430" y2="360"/>
      </g>
      <polygon points="110,190 190,105 270,190" fill="#0f172a" stroke="#1e40af" stroke-width="2"/>
      <polygon points="390,190 480,90 570,190" fill="#0f172a" stroke="#3b82f6" stroke-width="2"/>
      <rect x="210" y="218" width="220" height="54" rx="18" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5"/>
      <polygon points="248,218 286,192 364,192 394,218" fill="#1d4ed8" fill-opacity="0.65" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="262" cy="272" r="22" fill="#020617" stroke="#06b6d4" stroke-width="4"/>
      <circle cx="384" cy="272" r="22" fill="#020617" stroke="#06b6d4" stroke-width="4"/>
      <line x1="150" y1="248" x2="205" y2="248" stroke="#8b5cf6" stroke-width="4" stroke-linecap="round"/>
      <line x1="130" y1="260" x2="195" y2="260" stroke="#06b6d4" stroke-width="3" stroke-linecap="round"/>
      <text x="52" y="64" fill="#38bdf8" font-family="monospace" font-size="14" font-weight="bold">ANIKET // 3D INTERACTIVE UNIVERSE</text>
    </svg>
  `),
};
