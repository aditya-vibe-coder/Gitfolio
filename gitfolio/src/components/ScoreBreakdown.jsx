import React from 'react';
import { Card } from './ui/Card';
import { BarChart3 } from 'lucide-react';

const COLORS = {
  project: '#22c55e',
  language: '#3b82f6',
  contribution: '#a855f7',
  profile: '#eab308',
  hygiene: '#f97316',
};

const LABELS = {
  project: 'Project',
  language: 'Language',
  contribution: 'Contrib',
  profile: 'Profile',
  hygiene: 'Hygiene',
};

const ScoreBreakdown = ({ breakdown }) => {
  if (!breakdown) return null;

  const entries = Object.entries(breakdown).map(([key, data]) => ({
    key,
    label: LABELS[key] || key,
    ...data,
    color: COLORS[key] || '#8b949e',
  }));

  const totalMax = entries.reduce((sum, e) => sum + (e.max || 0), 0);

  return (
    <Card className="space-y-5">
      <div className="flex items-center gap-2">
        <BarChart3 size={18} className="text-[#58a6ff]" />
        <h3 className="text-lg font-bold text-[#e6edf3]">Score Breakdown</h3>
      </div>

      {/* Stacked horizontal bar */}
      <div className="flex h-4 w-full rounded-full overflow-hidden">
        {entries.map((seg) => (
          <div
            key={seg.key}
            className="h-full transition-all duration-1000 group relative"
            style={{
              flex: seg.max > 0 ? `${seg.max} 0 auto` : '0 0 auto',
              minWidth: seg.max > 0 ? `${(seg.max / totalMax) * 100}%` : '0%',
              backgroundColor: seg.color,
              opacity: seg.max > 0 ? Math.max(0.15, (seg.earned / seg.max)) : 0.15,
            }}
            title={`${seg.label}: ${seg.earned}/${seg.max}`}
          >
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#1c2128] border border-[#30363d] rounded-md px-2 py-1 text-[10px] text-[#e6edf3] whitespace-nowrap z-10">
              {seg.label}: {seg.earned}/{seg.max}
            </div>
          </div>
        ))}
      </div>

      {/* Pill stats */}
      <div className="flex flex-wrap gap-2">
        {entries.map((seg) => (
          <div
            key={seg.key}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs"
            style={{
              backgroundColor: `${seg.color}15`,
              border: `0.5px solid ${seg.color}40`,
            }}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
            <span style={{ color: seg.color, fontWeight: 600 }}>{seg.label}</span>
            <span className="text-[#e6edf3]">
              {seg.earned}/{seg.max}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ScoreBreakdown;
