// Decorative SVG scenes used across onboarding screens.

import type { CSSProperties } from 'react';

export function FieldScene({ style }: { style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 600 800"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="onb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8f4d4" />
          <stop offset="100%" stopColor="#fef6e0" />
        </linearGradient>
        <radialGradient id="onb-sun-glow" cx="0.7" cy="0.25" r="0.5">
          <stop offset="0%" stopColor="rgba(255, 220, 140, .8)" />
          <stop offset="100%" stopColor="rgba(255, 220, 140, 0)" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="600" height="450" fill="url(#onb-sky)" />
      <rect x="0" y="0" width="600" height="500" fill="url(#onb-sun-glow)" />
      <circle cx="430" cy="180" r="60" fill="#fce8a3" opacity="0.85" />
      <path d="M0 420 Q 150 380, 300 410 T 600 400 L 600 480 L 0 480 Z" fill="#a4c281" opacity=".5" />
      <path d="M0 450 Q 200 420, 400 445 T 600 440 L 600 500 L 0 500 Z" fill="#7fa05f" opacity=".7" />
      {Array.from({ length: 18 }).map((_, i) => {
        const t = i / 17;
        const yTop = 460 + t * t * 240;
        const yBot = 460 + ((i + 1) / 17) ** 2 * 240;
        const colors = ['#7fa05f', '#9bbf6c', '#88aa57', '#6f9249', '#a8cd76'];
        return <path key={i} d={`M0 ${yTop} L 600 ${yTop} L 600 ${yBot} L 0 ${yBot} Z`} fill={colors[i % colors.length]} />;
      })}
      {Array.from({ length: 24 }).map((_, i) => {
        const x = (i * 26 + (i % 2 ? 13 : 0)) % 620;
        const y = 700 + (i % 3) * 30;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M0 0 q -3 -10, 0 -20 q 3 10, 0 20" fill="#3f6d2a" />
            <path d="M-4 0 q -5 -8, -3 -16" stroke="#3f6d2a" strokeWidth="1.5" fill="none" />
            <path d="M4 0 q 5 -8, 3 -16" stroke="#3f6d2a" strokeWidth="1.5" fill="none" />
          </g>
        );
      })}
      <path d="M150 220 q 8 -8 16 0 q 8 -8 16 0" stroke="#3f6212" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M210 200 q 6 -6 12 0 q 6 -6 12 0" stroke="#3f6212" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <g transform="translate(80 440)">
        <rect x="-2" y="-2" width="4" height="40" fill="#4a3520" />
        <ellipse cx="0" cy="-12" rx="22" ry="20" fill="#5a7c3a" />
        <ellipse cx="-12" cy="-2" rx="14" ry="14" fill="#6b8d44" />
        <ellipse cx="14" cy="-4" rx="14" ry="14" fill="#6b8d44" />
      </g>
    </svg>
  );
}

export function SatellitePreview() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%' }} aria-hidden="true">
      <defs>
        <pattern id="onb-rows1" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(20)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(0,0,0,.18)" strokeWidth=".8" />
        </pattern>
        <pattern id="onb-rows2" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(-30)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(0,0,0,.15)" strokeWidth=".8" />
        </pattern>
      </defs>
      <rect width="400" height="300" fill="#a8884a" />
      <path d="M0 40 L 180 30 L 200 160 L 0 170 Z" fill="#7fa05f" />
      <path d="M0 40 L 180 30 L 200 160 L 0 170 Z" fill="url(#onb-rows1)" />
      <path d="M210 40 L 400 60 L 400 150 L 220 155 Z" fill="#c5a85a" />
      <path d="M210 40 L 400 60 L 400 150 L 220 155 Z" fill="url(#onb-rows2)" opacity=".7" />
      <path d="M0 180 L 195 175 L 200 280 L 0 300 L 0 180 Z" fill="#9bbf6c" />
      <path d="M0 180 L 195 175 L 200 280 L 0 300 L 0 180 Z" fill="url(#onb-rows1)" opacity=".5" />
      <path d="M220 170 L 400 165 L 400 240 L 230 250 Z" fill="#bfd485" />
      <path d="M220 170 L 400 165 L 400 240 L 230 250 Z" fill="url(#onb-rows2)" opacity=".5" />
      <path d="M230 260 L 400 250 L 400 300 L 240 300 Z" fill="#5a7c3a" />
      <path d="M203 0 L 207 300" stroke="#e3d2b0" strokeWidth="3" />
      <path d="M0 165 L 400 158" stroke="#e3d2b0" strokeWidth="3" />
      <g transform="translate(280 225)">
        <rect x="-12" y="-6" width="24" height="12" fill="#fff" stroke="#1f2a27" strokeWidth=".8" />
        <path d="M-13 -6 L 0 -14 L 13 -6" fill="#c8623d" stroke="#1f2a27" strokeWidth=".8" />
        <rect x="14" y="-3" width="10" height="9" fill="#d4d0c4" stroke="#1f2a27" strokeWidth=".8" />
      </g>
      <g transform="translate(200 150)">
        <circle r="22" fill="rgba(10, 143, 95, .15)">
          <animate attributeName="r" from="14" to="28" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from=".4" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle r="14" fill="rgba(10, 143, 95, .25)" />
        <path d="M0 -16 C -10 -16, -10 -2, 0 8 C 10 -2, 10 -16, 0 -16 Z" fill="#0a8f5f" stroke="white" strokeWidth="1.5" />
        <circle cx="0" cy="-8" r="3.5" fill="white" />
      </g>
    </svg>
  );
}

export function TileScene({ kind, selected }: { kind: 'sprout' | 'tractor' | 'building'; selected: boolean }) {
  const fg = selected ? '#0a8f5f' : '#5a7c3a';
  const bg = selected ? '#d1fae5' : '#f0f4ed';
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all .15s',
      }}
    >
      {kind === 'sprout' && (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M16 28V14" stroke={fg} strokeWidth="2" strokeLinecap="round" />
          <path d="M16 14c0-4 3-7 7-8 0 4-3 8-7 8z" fill={fg} opacity=".7" />
          <path d="M16 14c0-3-3-5-6-5 0 3 2 5 6 5z" fill={fg} />
          <path d="M8 28h16" stroke={fg} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {kind === 'tractor' && (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <circle cx="9" cy="22" r="4" stroke={fg} strokeWidth="2" />
          <circle cx="9" cy="22" r="1.5" fill={fg} />
          <circle cx="22" cy="23" r="2.5" stroke={fg} strokeWidth="2" />
          <path d="M5 18v-7h7l3 5h7v6" stroke={fg} strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 11V7h4" stroke={fg} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {kind === 'building' && (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M6 28V10l10-4 10 4v18" stroke={fg} strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 28v-6h8v6" stroke={fg} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="11" cy="14" r="1" fill={fg} />
          <circle cx="16" cy="14" r="1" fill={fg} />
          <circle cx="21" cy="14" r="1" fill={fg} />
          <circle cx="11" cy="18" r="1" fill={fg} />
          <circle cx="21" cy="18" r="1" fill={fg} />
        </svg>
      )}
    </div>
  );
}
