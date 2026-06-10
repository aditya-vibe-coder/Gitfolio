import React, { useMemo } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Users, BarChart3, GitBranch, Code } from 'lucide-react';

const WIDTH = 600;
const HEIGHT = 200;
const PADDING = 40;

const normalPdf = (x, mean, stdDev) => {
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
};

const PeerBenchmarking = ({ stats, userStats }) => {
  const {
    totalStudents = 0,
    avgScore = 0,
    p25 = 0,
    p50 = 0,
    p75 = 0,
    p90 = 0,
    topScore = 0,
    domainBreakdown = [],
    avgLanguages = 0,
    avgRepos = 0,
  } = stats || {};

  const {
    userScore = 0,
    userRepos = 0,
    userActiveDays = 0,
    userLangs = 0,
    college = '',
  } = userStats || {};

  const mean = p50 || avgScore;
  const stdDev = (p75 - p25) / 1.348;

  // Generate bell curve points
  const startX = 0;
  const endX = topScore || mean * 2;
  const points = useMemo(() => {
    const arr = [];
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      arr.push({ x, y: normalPdf(x, mean, stdDev || 1) });
    }
    return arr;
  }, [mean, stdDev, startX, endX]);

  const maxPdf = Math.max(...points.map(p => p.y));

  const scaleX = (val) => PADDING + ((val - startX) / (endX - startX)) * (WIDTH - 2 * PADDING);
  const scaleY = (val) => HEIGHT - PADDING - (val / maxPdf) * (HEIGHT - 2 * PADDING);

  const userX = Math.min(Math.max(userScore, startX), endX);
  const userY = normalPdf(userX, mean, stdDev || 1);

  const collegeDiff = userScore - avgScore;

  return (
    <Card className="space-y-5">
      <div className="flex items-center gap-2">
        <Users size={18} className="text-[#58a6ff]" />
        <h3 className="text-lg font-bold text-[#e6edf3]">Peer Benchmarking</h3>
        {college && <Badge variant="info">{college}</Badge>}
      </div>

      {/* Bell Curve SVG */}
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ minWidth: '300px' }}>
          {/* Grid lines */}
          {[p25, p50, p75, p90].map((p, i) => (
            <g key={i}>
              <line
                x1={scaleX(p)}
                y1={PADDING}
                x2={scaleX(p)}
                y2={HEIGHT - PADDING}
                stroke="#30363d"
                strokeDasharray="3,3"
              />
              <text x={scaleX(p)} y={HEIGHT - PADDING + 14} textAnchor="middle" fill="#8b949e" fontSize="10">
                P{i === 0 ? '25' : i === 1 ? '50' : i === 2 ? '75' : '90'}
              </text>
            </g>
          ))}

          {/* Bell curve path */}
          <path
            d={`M ${points.map(p => `${scaleX(p.x)} ${scaleY(p.y)}`).join(' L ')}`}
            fill="none"
            stroke="#58a6ff"
            strokeWidth="2"
          />

          {/* User marker */}
          <circle
            cx={scaleX(userX)}
            cy={scaleY(userY)}
            r="6"
            fill="#ef4444"
            stroke="#e6edf3"
            strokeWidth="2"
          />
          <text
            x={scaleX(userX)}
            y={scaleY(userY) - 10}
            textAnchor="middle"
            fill="#ef4444"
            fontSize="11"
            fontWeight="bold"
          >
            You
          </text>
        </svg>
      </div>

      {/* Comparison Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center justify-between p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
          <div className="flex items-center gap-2 text-xs text-[#8b949e]">
            <BarChart3 size={14} className="text-[#58a6ff]" /> Score
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#e6edf3]">{userScore}</span>
            <span className={`text-xs font-medium ${collegeDiff >= 0 ? 'text-[#3fb950]' : 'text-[#ef4444]'}`}>
              {collegeDiff >= 0 ? '+' : ''}{collegeDiff}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
          <div className="flex items-center gap-2 text-xs text-[#8b949e]">
            <GitBranch size={14} className="text-[#a855f7]" /> Repos
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#e6edf3]">{userRepos}</span>
            <span className={`text-xs font-medium ${userRepos >= avgRepos ? 'text-[#3fb950]' : 'text-[#ef4444]'}`}>
              avg {avgRepos}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
          <div className="flex items-center gap-2 text-xs text-[#8b949e]">
            <Code size={14} className="text-[#22c55e]" /> Languages
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#e6edf3]">{userLangs}</span>
            <span className={`text-xs font-medium ${userLangs >= avgLanguages ? 'text-[#3fb950]' : 'text-[#ef4444]'}`}>
              avg {avgLanguages}
            </span>
          </div>
        </div>
      </div>

      {/* Domain Breakdown Bars */}
      {domainBreakdown.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-[#e6edf3] flex items-center gap-2">
            <BarChart3 size={14} className="text-[#58a6ff]" /> Domain Breakdown
          </h4>
          {domainBreakdown.map((domain, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#e6edf3]">{domain.name}</span>
                <span className="text-[#8b949e]">{domain.avg}% avg</span>
              </div>
              <div className="h-2 w-full bg-[#30363d] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#58a6ff]"
                  style={{ width: `${Math.min(domain.avg, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-[#8b949e] text-right">
        Based on {totalStudents} students
      </div>
    </Card>
  );
};

export default PeerBenchmarking;
