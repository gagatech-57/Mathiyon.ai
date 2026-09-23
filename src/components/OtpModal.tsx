import React, { useState, useRef, useEffect } from 'react';
import { X, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface OtpModalProps {
  isOpen: boolean;
  email: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const OtpModal: React.FC<OtpModalProps> = ({ isOpen, email, onClose, onSuccess }) => {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setTimer(60);
    setOtp(['', '', '', '', '', '']);
    setError('');
    setVerifiedSuccess(false);

    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pasteData)) return;

    const digits = pasteData.split('');
    setOtp(digits);
    inputRefs.current[5]?.focus();
  };

  const handleVerify = () => {
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setError('');
    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      setVerifiedSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md p-6 rounded-2xl glass-panel border border-rose-500/30 shadow-2xl bg-[#0e0a1a]"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!verifiedSuccess ? (
          <div>
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white font-['Outfit']">
              Enter Verification Code
            </h3>
            <p className="mt-1 text-sm text-slate-300">
              We sent a 6-digit code to <span className="font-semibold text-rose-300">{email || 'your email'}</span>.
            </p>

            {/* OTP Input Fields */}
            <div className="flex items-center justify-between gap-2 my-6">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  className="w-11 h-13 text-center text-xl font-bold text-white rounded-xl glass-input border-rose-500/30 focus:border-rose-500 focus:bg-rose-950/40"
                />
              ))}
            </div>

            {error && <p className="mb-4 text-xs text-center text-rose-400 font-medium">{error}</p>}

            <button
              onClick={handleVerify}
              disabled={isVerifying || otp.join('').length < 6}
              className="w-full py-3 px-4 rounded-xl mathiyon-btn-primary font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg shadow-rose-900/40 disabled:opacity-50"
            >
              {isVerifying ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Verify & Continue</span>
              )}
            </button>

            {/* Resend Timer */}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Didn't receive the code?</span>
              {timer > 0 ? (
                <span className="text-rose-400 font-medium">Resend in {timer}s</span>
              ) : (
                <button 
                  onClick={() => setTimer(60)}
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-bold"
                >
                  <RefreshCw className="w-3 h-3" /> Resend Code
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-white font-['Outfit']">
              Identity Verified!
            </h3>
            <p className="text-sm text-slate-300">
              Authentication successful. Redirecting to Mathiyon AI...
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
