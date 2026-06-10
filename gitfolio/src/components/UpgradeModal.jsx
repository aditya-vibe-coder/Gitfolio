import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import usePremium from '../hooks/usePremium';
import { createOrder, openRazorpayCheckout } from '../services/payment';
import { Button, Badge } from '../components/ui';

const FEATURES = [
  { text: 'Company Fit Score', impact: 'Know if you\'re ready for Amazon' },
  { text: 'AI 60-Day Roadmap', impact: 'Personalized week-by-week action plan' },
  { text: 'Resume Builder', impact: 'One-click PDF resume from your GitHub' },
  { text: 'LeetCode + Codeforces Integration', impact: 'Combined placement score' },
  { text: 'Peer Benchmarking', impact: 'See your percentile vs college peers' },
  { text: 'Interview Question Predictor', impact: 'Know what they\'ll ask before you walk in' },
  { text: 'GitHub Profile README Generator', impact: 'Auto-generated, copy and paste' },
  { text: 'PDF Portfolio Export', impact: '3 professional templates' },
  { text: 'Advanced Code Quality Analysis', impact: 'Deep dive into your commit history' },
  { text: 'A5 Placement Card with QR Code', impact: 'Hand out at placement drives' },
  { text: 'Unlimited AI Features', impact: '20 calls/hour vs 3/day on free' },
  { text: 'All future features included', impact: 'Never pay again' },
];

const UpgradeModal = () => {
  const { user } = useAuth();
  const { isUpgradeModalOpen, closeUpgradeModal, activate } = usePremium();
  const [isProcessing, setIsProcessing] = useState(false);
  const [premiumCount, setPremiumCount] = useState(null);

  useEffect(() => {
    if (isUpgradeModalOpen) {
      fetch(`${import.meta.env.VITE_WORKER_URL}/stats/premium-count`)
        .then(r => r.json())
        .then(d => setPremiumCount(d.count))
        .catch(() => {});
    }
  }, [isUpgradeModalOpen]);

  if (!isUpgradeModalOpen) return null;

  const handlePayment = async (plan) => {
    setIsProcessing(true);
    try {
      const orderData = await createOrder(plan);
      const paymentResponse = await openRazorpayCheckout(orderData, user);

      // Polling for license
      const orderId = paymentResponse.razorpay_order_id;
      let licenseKey = null;
      let attempts = 0;
      const maxAttempts = 22;

      while (attempts < maxAttempts) {
        try {
          const response = await fetch(`${import.meta.env.VITE_WORKER_URL}/license/by-order?order_id=${orderId}`);
          const data = await response.json();
          if (data.licenseKey) {
            licenseKey = data.licenseKey;
            break;
          }
        } catch (e) {
          console.error('Polling error:', e);
        }
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }

      if (licenseKey) {
        const success = await activate(licenseKey);
        if (success) {
          // In a real app, we'd use a toast library here
          alert('Premium activated! 🎉');
          closeUpgradeModal();
        } else {
          throw new Error('License activation failed');
        }
      } else {
        throw new Error('Payment is processing. If you were charged, your premium will activate within 5 minutes. Refresh the page to check.');
      }
    } catch (error) {
      console.error('Payment flow error:', error);
      if (error !== 'dismissed') {
        alert(error instanceof Error ? error.message : 'Payment failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        onClick={closeUpgradeModal}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md mx-auto my-4 sm:my-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 sm:p-8 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
            <div className="text-center mb-6 sm:mb-8">
              <Badge className="mb-3 sm:mb-4 px-3 py-1 text-xs font-medium text-green-400 bg-green-400/10 border-green-400/20">
                Go Premium
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Unlock your full portfolio potential
              </h2>
            </div>

            <div className="space-y-2 sm:space-y-3 mb-5 sm:mb-6">
              {FEATURES.map((feature, index) => (
                <div key={index} className="flex items-center justify-between gap-2 sm:gap-3 text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-[10px] sm:text-xs">✓</span>
                    <span className="text-xs sm:text-sm">{feature.text}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-zinc-500 italic whitespace-nowrap">{feature.impact}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5 sm:mb-6">
              <Button
                onClick={() => handlePayment('monthly')}
                disabled={isProcessing}
                className="h-12 sm:h-14 text-base sm:text-lg font-semibold transition-all hover:scale-105 relative"
                variant="outline"
              >
                ₹299/month
              </Button>
              <div className="relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 bg-[#3fb950] text-[10px] font-bold text-white rounded-full whitespace-nowrap">
                  Most Popular
                </div>
                <Button
                  onClick={() => handlePayment('lifetime')}
                  disabled={isProcessing}
                  className="h-12 sm:h-14 text-base sm:text-lg font-semibold transition-all hover:scale-105 w-full"
                >
                  ₹999 lifetime
                </Button>
                <p className="text-[9px] sm:text-[10px] text-zinc-500 text-center mt-1">One-time · Never pay again · All future features</p>
              </div>
            </div>

            <div className="text-center space-y-1 sm:space-y-2">
              {premiumCount && (
                <p className="text-xs text-[#3fb950] font-medium">
                  Join {premiumCount} students who upgraded this month
                </p>
              )}
              <p className="text-[11px] sm:text-xs text-zinc-500">
                ₹999 price valid during beta. Increasing to ₹1999 soon.
              </p>
              <p className="text-[11px] sm:text-xs text-zinc-500">
                Not useful? Email us within 48 hours for a full refund.
              </p>
            </div>
          </div>
          
          <button 
            onClick={closeUpgradeModal}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 text-zinc-500 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default UpgradeModal;
