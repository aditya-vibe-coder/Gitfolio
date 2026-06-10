import React from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { MapPin, Clock, TrendingUp, Check } from 'lucide-react';

const difficultyColors = {
  Easy: 'bg-green-900/30 text-green-400 border-green-900/50',
  Medium: 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50',
  Hard: 'bg-red-900/30 text-red-400 border-red-900/50',
};

const priorityColors = {
  High: '#ef4444',
  Medium: '#f97316',
  Low: '#8b949e',
};

const RoadmapTimeline = ({ milestones = [], checkedSet = new Set(), onToggleCheck }) => {

  // Group milestones by week
  const weekGroups = milestones.reduce((acc, m) => {
    if (!acc[m.week]) acc[m.week] = [];
    acc[m.week].push(m);
    return acc;
  }, {});

  const sortedWeeks = Object.keys(weekGroups).sort((a, b) => Number(a) - Number(b));

  return (
    <Card className="space-y-6">
      <div className="flex items-center gap-2">
        <MapPin size={18} className="text-[#3fb950]" />
        <h3 className="text-lg font-bold text-[#e6edf3]">Interview Roadmap</h3>
      </div>

      <div className="relative pl-4 sm:pl-8 space-y-8">
        {sortedWeeks.map((week, weekIndex) => (
          <div key={week} className="relative">
            {/* Week marker on timeline */}
            <div className="absolute left-0 top-0 -translate-x-1/2 flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-[#58a6ff] border-2 border-[#161b22] z-10" />
              {weekIndex < sortedWeeks.length - 1 && (
                <div className="w-0.5 h-full bg-[#30363d] absolute top-3 left-1/2 -translate-x-1/2" style={{ height: 'calc(100% + 24px)' }} />
              )}
            </div>

            {/* Week header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-[#58a6ff]">Week {week}</span>
              <div className="flex-1 h-px bg-[#30363d]" />
            </div>

            {/* Milestones for this week */}
            <div className="space-y-3">
              {weekGroups[week].map((milestone, i) => {
                const id = milestone.id || `${week}-${i}`;
                const isChecked = checkedSet.has(id);
                return (
                  <div
                    key={id}
                    className={`p-4 rounded-lg border transition-all ${
                      isChecked
                        ? 'bg-[#0d1117] border-[#30363d] opacity-70'
                        : 'bg-[#161b22] border-[#30363d]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onToggleCheck?.(id)}
                        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-[#3fb950] border-[#3fb950]'
                            : 'bg-transparent border-[#8b949e] hover:border-[#58a6ff]'
                        }`}
                      >
                        {isChecked && <Check size={12} className="text-white" />}
                      </button>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <h4 className={`text-sm font-bold ${isChecked ? 'line-through text-[#8b949e]' : 'text-[#e6edf3]'}`}>
                            {milestone.title}
                          </h4>
                          <div className="flex items-center gap-1.5">
                            {milestone.category && (
                              <Badge variant="info" className="text-[10px]">
                                {milestone.category}
                              </Badge>
                            )}
                            {milestone.difficulty && (
                              <Badge variant={milestone.difficulty === 'Easy' ? 'success' : milestone.difficulty === 'Hard' ? 'danger' : 'warning'} className="text-[10px]">
                                {milestone.difficulty}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-[#8b949e] leading-relaxed">{milestone.description}</p>
                        {milestone.successMetric && (
                          <div className="flex items-center gap-2 text-xs text-[#8b949e]">
                            <TrendingUp size={12} className="text-[#3fb950]" />
                            <span>Target: {milestone.successMetric}</span>
                          </div>
                        )}
                        {milestone.priority && (
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} style={{ color: priorityColors[milestone.priority] || '#8b949e' }} />
                            <span className="text-[11px]" style={{ color: priorityColors[milestone.priority] || '#8b949e' }}>
                              {milestone.priority} Priority
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {sortedWeeks.length === 0 && (
          <div className="text-center py-8 text-[#8b949e] text-sm">
            No milestones defined yet.
          </div>
        )}
      </div>
    </Card>
  );
};

export default RoadmapTimeline;
