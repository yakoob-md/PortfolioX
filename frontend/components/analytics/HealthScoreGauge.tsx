'use client';

interface Props {
  score: number;
}

export default function HealthScoreGauge({ score }: Props) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return '#10b981'; // Green
    if (s >= 50) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const color = getScoreColor(score);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-slate-800"
          />
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke={color}
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1s ease-out' }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black" style={{ color }}>{score}</span>
          <span className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Health Score</span>
        </div>
      </div>
    </div>
  );
}
