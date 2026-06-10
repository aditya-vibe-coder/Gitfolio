import React, { useMemo } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { CheckCircle, AlertTriangle, Info, Target, ArrowRight } from 'lucide-react';

const COLORS = {
  dsa: '#f97316',
  systemDesign: '#a855f7',
  techStack: '#3b82f6',
  projectDepth: '#22c55e',
};

const getTierColor = (score) => {
  if (score >= 80) return '#3fb950';
  if (score >= 60) return '#58a6ff';
  if (score >= 40) return '#f97316';
  return '#ef4444';
};

const getTierLabel = (score) => {
  if (score >= 80) return 'Strong Fit';
  if (score >= 60) return 'Good Fit';
  if (score >= 40) return 'Moderate Fit';
  return 'Weak Fit';
};

const Gauge = ({ value, size = 120, strokeWidth = 10, color }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#30363d"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>{value}%</span>
        <span className="text-xs text-[#8b949e]">{getTierLabel(value)}</span>
      </div>
    </div>
  );
};

const Bar = ({ label, score, color, max = 100 }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-[#e6edf3]">{label}</span>
      <span className="text-[#8b949e]">{score}/{max}</span>
    </div>
    <div className="h-2 w-full bg-[#30363d] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${(score / max) * 100}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

const ColumnList = ({ title, items, icon: Icon, color }) => (
  <div className="space-y-2">
    <h4 className="text-sm font-bold flex items-center gap-2" style={{ color }}>
      <Icon size={14} /> {title}
    </h4>
    <ul className="space-y-1.5">
      {items?.map((item, i) => (
        <li key={i} className="text-xs text-[#8b949e] flex gap-2">
          <span style={{ color }}>•</span> {item}
        </li>
      ))}
    </ul>
  </div>
);

const CompanyFitCard = ({ fitData }) => {
  const {
    fitScore,
    role,
    categoryScores = {},
    strongMatches = [],
    gaps = [],
    warnings = [],
    narrative = '',
    nextSteps = [],
  } = fitData || {};

  const gaugeColor = useMemo(() => getTierColor(fitScore), [fitScore]);

  const scores = [
    { label: 'DSA / Algorithmic', score: categoryScores.dsaAlgorithmic || 0, color: COLORS.dsa },
    { label: 'System Design', score: categoryScores.systemDesign || 0, color: COLORS.systemDesign },
    { label: 'Tech Stack Match', score: categoryScores.techStackMatch || 0, color: COLORS.techStack },
    { label: 'Project Depth', score: categoryScores.projectDepth || 0, color: COLORS.projectDepth },
  ];

  return (
    <Card className="space-y-6">
      <div className="flex items-center gap-3">
        <Target size={18} className="text-[#58a6ff]" />
        <h3 className="text-lg font-bold text-[#e6edf3]">Company Fit Analysis</h3>
        {role && <Badge variant="info">{role}</Badge>}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <Gauge value={fitScore || 0} color={gaugeColor} size={140} strokeWidth={12} />
        <div className="flex-1 w-full space-y-3">
          {scores.map((s) => (
            <Bar key={s.label} label={s.label} score={s.score} color={s.color} max={100} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ColumnList title="Strong Matches" items={strongMatches} icon={CheckCircle} color="#3fb950" />
        <ColumnList title="Gaps" items={gaps} icon={AlertTriangle} color="#ef4444" />
        <ColumnList title="Warnings" items={warnings} icon={Info} color="#f97316" />
      </div>

      {narrative && (
        <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
          <p className="text-sm text-[#8b949e] leading-relaxed">{narrative}</p>
        </div>
      )}

      {nextSteps.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-[#e6edf3] flex items-center gap-2">
            <ArrowRight size={14} className="text-[#58a6ff]" /> Next Steps
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            {nextSteps.map((step, i) => (
              <li key={i} className="text-xs text-[#8b949e]">{step}</li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
};

export default CompanyFitCard;
