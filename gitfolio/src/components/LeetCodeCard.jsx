import React, { useMemo } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Flame, Trophy, Code2, TrendingUp } from 'lucide-react';

const getDSATier = (total) => {
  if (total >= 500) return { label: 'Elite', color: '#a855f7' };
  if (total >= 300) return { label: 'Expert', color: '#3b82f6' };
  if (total >= 150) return { label: 'Advanced', color: '#22c55e' };
  if (total >= 50) return { label: 'Intermediate', color: '#f97316' };
  return { label: 'Beginner', color: '#6b7280' };
};

const LeetCodeCard = ({ data }) => {
  const { easy = 0, medium = 0, hard = 0, total = 0, streak = 0, ranking = 0, contestRating = 0, badges = [], submissionCalendar = [] } = data || {};

  const tier = useMemo(() => getDSATier(total), [total]);

  // Build a mini heat grid for the latest 12 weeks
  const weeks = 12;
  const daysPerWeek = 7;
  const heatGrid = useMemo(() => {
    const grid = [];
    const today = new Date();
    for (let w = 0; w < weeks; w++) {
      const weekRow = [];
      for (let d = 0; d < daysPerWeek; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - ((weeks - 1 - w) * 7 + (6 - d)));
        const dateStr = date.toISOString().split('T')[0];
        const count = submissionCalendar.find(s => s.date === dateStr)?.count || 0;
        let level = 0;
        if (count > 0) {
          if (count >= 4) level = 4;
          else if (count >= 3) level = 3;
          else if (count >= 2) level = 2;
          else level = 1;
        }
        weekRow.push({ date: dateStr, level, count });
      }
      grid.push(weekRow);
    }
    return grid;
  }, [submissionCalendar]);

  const heatColors = {
    0: '#161b22',
    1: '#0e4429',
    2: '#006d32',
    3: '#26a641',
    4: '#39d353',
  };

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 size={18} className="text-[#f97316]" />
          <h3 className="text-lg font-bold text-[#e6edf3]">LeetCode Stats</h3>
        </div>
        <Badge variant="info" style={{ backgroundColor: `${tier.color}20`, borderColor: `${tier.color}40`, color: tier.color }}>
          {tier.label}
        </Badge>
      </div>

      {/* Solve Breakdown */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#22c55e20', border: '1px solid #22c55e40', color: '#22c55e' }}>
          Easy: {easy}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#f9731620', border: '1px solid #f9731640', color: '#f97316' }}>
          Medium: {medium}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#ef444420', border: '1px solid #ef444440', color: '#ef4444' }}>
          Hard: {hard}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#58a6ff20', border: '1px solid #58a6ff40', color: '#58a6ff' }}>
          Total: {total}
        </div>
      </div>

      {/* Streak, Ranking, Contest */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center p-3 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-1">
          <Flame size={16} className="text-[#f97316]" />
          <span className="text-lg font-bold text-[#e6edf3]">{streak}</span>
          <span className="text-[10px] text-[#8b949e] uppercase">Streak</span>
        </div>
        <div className="flex flex-col items-center p-3 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-1">
          <Trophy size={16} className="text-[#eab308]" />
          <span className="text-lg font-bold text-[#e6edf3]">{ranking.toLocaleString()}</span>
          <span className="text-[10px] text-[#8b949e] uppercase">Ranking</span>
        </div>
        <div className="flex flex-col items-center p-3 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-1">
          <TrendingUp size={16} className="text-[#3fb950]" />
          <span className="text-lg font-bold text-[#e6edf3]">{contestRating || '-'}</span>
          <span className="text-[10px] text-[#8b949e] uppercase">Rating</span>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges.map((badge, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#21262d] text-[#8b949e] border border-[#30363d]">
              {badge}
            </span>
          ))}
        </div>
      )}

      {/* Mini Heat Grid */}
      <div className="space-y-2">
        <div className="text-xs text-[#8b949e] uppercase font-bold">Last 12 Weeks Activity</div>
        <div className="flex gap-[2px]">
          {heatGrid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map((day, di) => (
                <div
                  key={di}
                  className="w-3 h-3 rounded-[2px]"
                  style={{ backgroundColor: heatColors[day.level] }}
                  title={`${day.date}: ${day.count} submissions`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[#8b949e]">
          <span>Less</span>
          <div className="flex gap-[2px]">
            {Object.values(heatColors).map((c, i) => (
              <div key={i} className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </Card>
  );
};

export default LeetCodeCard;
