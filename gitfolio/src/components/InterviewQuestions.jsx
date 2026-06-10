import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { ChevronDown, ChevronUp, Code2, Brain, FolderGit, MessageSquare } from 'lucide-react';

const tabConfig = {
  technical: { label: 'Technical', icon: Code2, color: '#3b82f6' },
  dsa: { label: 'DSA', icon: Brain, color: '#a855f7' },
  projects: { label: 'Projects', icon: FolderGit, color: '#22c55e' },
  behavioral: { label: 'Behavioral', icon: MessageSquare, color: '#f97316' },
};

const QuestionCard = ({ q, difficulty, answerFramework }) => {
  const [isOpen, setIsOpen] = useState(false);

  const difficultyVariant =
    difficulty === 'Easy' ? 'success' : difficulty === 'Medium' ? 'warning' : 'danger';

  return (
    <div className="border border-[#30363d] rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[#0d1117] transition-colors"
      >
        <div className="flex items-center gap-3 flex-1">
          <Badge variant={difficultyVariant} className="text-[10px] shrink-0">
            {difficulty}
          </Badge>
          <span className="text-sm text-[#e6edf3] font-medium leading-snug">{q}</span>
        </div>
        {isOpen ? (
          <ChevronUp size={14} className="text-[#8b949e] shrink-0 ml-2" />
        ) : (
          <ChevronDown size={14} className="text-[#8b949e] shrink-0 ml-2" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0 border-t border-[#30363d]">
          <div className="mt-3 space-y-2">
            <h5 className="text-xs font-bold text-[#8b949e] uppercase tracking-wider">
              Answer Framework
            </h5>
            <ul className="space-y-1.5">
              {answerFramework?.map((point, i) => (
                <li key={i} className="text-xs text-[#e6edf3] flex gap-2 leading-relaxed">
                  <span className="text-[#58a6ff] shrink-0">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

const InterviewQuestions = ({ questions = {} }) => {
  const [activeTab, setActiveTab] = useState('technical');
  const availableKeys = Object.keys(tabConfig).filter((key) => questions[key]);

  return (
    <Card className="space-y-5">
      <div className="flex items-center gap-2">
        <Brain size={18} className="text-[#a855f7]" />
        <h3 className="text-lg font-bold text-[#e6edf3]">Interview Questions</h3>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#30363d] pb-3">
        {availableKeys.map((key) => {
          const config = tabConfig[key];
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'text-white'
                  : 'text-[#8b949e] hover:text-[#e6edf3]'
              }`}
              style={
                isActive
                  ? { backgroundColor: `${config.color}20`, border: `1px solid ${config.color}40` }
                  : {}
              }
            >
              <config.icon size={13} style={{ color: isActive ? config.color : 'inherit' }} />
              <span style={{ color: isActive ? config.color : 'inherit' }}>{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* Questions list */}
      <div className="space-y-3">
        {questions[activeTab]?.map((item, i) => (
          <QuestionCard key={i} q={item.q} difficulty={item.difficulty} answerFramework={item.answerFramework} />
        ))}
        {!questions[activeTab]?.length && (
          <div className="text-center py-6 text-[#8b949e] text-sm">No questions available for this category.</div>
        )}
      </div>
    </Card>
  );
};

export default InterviewQuestions;
