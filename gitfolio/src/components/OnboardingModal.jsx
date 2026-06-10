import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
  X,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  AlertTriangle,
  Zap,
  Share2,
  Copy,
  Check,
  MessageCircle,
} from 'lucide-react';

const OnboardingModal = ({ isOpen, onClose, profile, analytics, coachingMessages = [] }) => {
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalSteps = 4;
  const profileUrl = `https://gitfolio.harmnix.com/u/${profile?.login || ''}`;

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = `Check out my Gitfolio profile! 🚀\n${profileUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const overallScore = analytics?.overall?.interviewReadiness || 0;
  const tier = analytics?.overall?.tier;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-[#1a3a2a] rounded-full">
                <BarChart3 size={32} className="text-[#3fb950]" />
              </div>
              <h2 className="text-xl font-bold text-[#e6edf3]">Your Score Overview</h2>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-5xl font-bold" style={{ color: tier?.color || '#3fb950' }}>
                {overallScore}
              </div>
              <Badge variant="info" style={{ backgroundColor: `${tier?.color}20`, borderColor: `${tier?.color}40`, color: tier?.color }}>
                {tier?.label || 'Developing'}
              </Badge>
            </div>
            {tier?.desc && <p className="text-sm text-[#8b949e] max-w-sm mx-auto">{tier.desc}</p>}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-[#3a1a1a] rounded-full">
                <AlertTriangle size={32} className="text-[#ef4444]" />
              </div>
              <h2 className="text-xl font-bold text-[#e6edf3]">Top 3 Weaknesses</h2>
            </div>
            <div className="space-y-3">
              {coachingMessages.slice(0, 3).map((msg, i) => (
                <div key={i} className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-[#ef4444] text-white text-xs flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm text-[#e6edf3]">{msg}</p>
                </div>
              ))}
              {coachingMessages.length === 0 && (
                <p className="text-center text-sm text-[#8b949e]">Great job! No major weaknesses detected.</p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-[#1c2a3a] rounded-full">
                <Zap size={32} className="text-[#58a6ff]" />
              </div>
              <h2 className="text-xl font-bold text-[#e6edf3]">Immediate Actions</h2>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-lg flex items-start gap-3">
                <Zap size={16} className="text-[#58a6ff] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#e6edf3]">Add a README to your top project</h4>
                  <p className="text-xs text-[#8b949e] mt-1">A good README helps recruiters understand your work quickly.</p>
                </div>
              </div>
              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-lg flex items-start gap-3">
                <Zap size={16} className="text-[#58a6ff] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#e6edf3]">Push commits for 3 consecutive days</h4>
                  <p className="text-xs text-[#8b949e] mt-1">Consistency builds a strong activity profile.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-[#1a3a2a] rounded-full">
                <Share2 size={32} className="text-[#3fb950]" />
              </div>
              <h2 className="text-xl font-bold text-[#e6edf3]">Share Your Profile</h2>
            </div>
            <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <input
                  value={profileUrl}
                  readOnly
                  className="flex-1 bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] font-mono truncate"
                />
                <Button variant="secondary" size="sm" onClick={handleCopy} className="shrink-0">
                  {copied ? (
                    <><Check size={14} className="mr-1 text-[#3fb950]" /> <span className="text-[#3fb950]">Copied</span></>
                  ) : (
                    <><Copy size={14} className="mr-1" /> Copy</>
                  )}
                </Button>
              </div>
            </div>
            <Button variant="primary" onClick={handleWhatsAppShare} className="w-full">
              <MessageCircle size={16} className="mr-2" /> Share on WhatsApp
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <Card className="w-full max-w-md relative space-y-6" padding="p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-md hover:bg-[#30363d] transition-colors"
        >
          <X size={16} className="text-[#8b949e]" />
        </button>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i + 1 <= step ? 'bg-[#58a6ff] w-6' : 'bg-[#30363d] w-2'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[200px]">{renderStep()}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-[#30363d]">
          <Button
            variant="outline"
            size="sm"
            onClick={prevStep}
            disabled={step === 1}
            className={step === 1 ? 'opacity-0 pointer-events-none' : ''}
          >
            <ChevronLeft size={14} className="mr-1" /> Back
          </Button>
          <span className="text-xs text-[#8b949e]">{step} / {totalSteps}</span>
          {step < totalSteps ? (
            <Button variant="primary" size="sm" onClick={nextStep}>
              Next <ChevronRight size={14} className="ml-1" />
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={onClose}>
              Finish
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default OnboardingModal;
