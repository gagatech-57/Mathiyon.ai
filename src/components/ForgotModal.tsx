import React, { useState } from 'react';
import { X, Mail, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ForgotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOtp: (email: string) => void;
}

export const ForgotModal: React.FC<ForgotModalProps> = ({ isOpen, onClose, onOpenOtp }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1200);
  };

  const handleProceedToOtp = () => {
    onClose();
    onOpenOtp(email);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md p-6 rounded-2xl glass-panel border border-rose-500/30 shadow-2xl bg-[#0f0c1c]"
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {!isSubmitted ? (
            <div>
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
                <KeyRound className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white font-['Outfit']">
                Reset your password
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Enter your registered email address and we'll send you a 6-digit verification code to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-500"
                      required
                    />
                  </div>
                  {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl mathiyon-btn-primary font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg shadow-rose-900/40 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send Recovery Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white font-['Outfit']">
                Code Sent Successfully!
              </h3>
              <p className="text-sm text-slate-300">
                We've dispatched a 6-digit verification code to <span className="font-semibold text-rose-300">{email}</span>.
              </p>
              <button
                onClick={handleProceedToOtp}
                className="w-full mt-2 py-3 px-4 rounded-xl mathiyon-btn-primary font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg"
              >
                <span>Enter 6-Digit OTP</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
