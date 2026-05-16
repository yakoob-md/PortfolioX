'use client';

import { getScoreLabel } from '@/lib/utils';

interface Props {
  score: number;
}

export default function HealthScoreGauge({ score }: Props) {
  const { label, color } = getScoreLabel(score);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getStrokeColor = (s: number) => {
    if (s >= 80) return '#10b981';
    if (s >= 60) return '#14b8a6';
    if (s >= 40) return '#f59e0b';
    if (s >= 20) return '#f97316';
    return '#ef4444';
  };

  const strokeColor = getStrokeColor(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
          <circle cx="96" cy="96" r={radius} stroke="#1e293b" strokeWidth="8" fill="transparent" />
          <circle
            cx="96" cy="96" r={radius}
            stroke={strokeColor} strokeWidth="8" fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
            strokeLinecap="round"
          />
          <circle
            cx="96" cy="96" r={radius}
            stroke={strokeColor} strokeWidth="12" fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
            strokeLinecap="round" opacity="0.15" filter="blur(4px)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black data-value leading-none" style={{ color: strokeColor }}>{score}</span>
          <span className={`text-xs font-bold uppercase tracking-[0.15em] mt-2 ${color}`}>{label}</span>
        </div>
      </div>
    </div>
  );
}
