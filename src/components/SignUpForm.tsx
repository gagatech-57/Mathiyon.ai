import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Wand2 } from 'lucide-react';
import { PasswordStrength } from './PasswordStrength';
import { motion } from 'framer-motion';
import { apiRegister } from '../api';
import type { UserProfile } from '../api';

interface SignUpFormProps {
  onSuccess: (user: UserProfile) => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!termsAgreed) {
      setError('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setError('');
    setIsLoading(true);

    const result = await apiRegister(fullName, email, password);
    setIsLoading(false);

    if (result.success && result.user) {
      onSuccess(result.user);
    } else {
      setError(result.message || 'Registration failed.');
    }
  };

  const handleDemoFill = () => {
    setFullName('Mathiyon 1.1');
    setEmail('mathiyon1.1@mathiyon.ai');
    setPassword('password123');
    setConfirmPassword('password123');
    setTermsAgreed(true);
    setError('');
  };

  return (
    <motion.form 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSignUp}
      className="space-y-4"
    >
      {/* Demo Fill button */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
        <div className="flex items-center gap-2 text-rose-300">
          <Wand2 className="w-4 h-4 text-rose-400" />
          <span>Create Mathiyon 1.1 Account</span>
        </div>
        <button
          type="button"
          onClick={handleDemoFill}
          className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 font-bold tracking-wide transition-colors border border-rose-500/40 cursor-pointer"
        >
          Auto-Fill Mathiyon 1.1
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-300 font-medium">
          {error}
        </div>
      )}

      {/* Full Name */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
          Full Name
        </label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Mathiyon 1.0"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-500"
            required
          />
        </div>
      </div>

      {/* Email Address */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
          Work Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="mathiyon1.0@mathiyon.ai"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-500"
            required
          />
        </div>
      </div>

      {/* Password & Live Strength Meter */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
          Create Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-500"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <PasswordStrength password={password} />
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-500 ${
              confirmPassword && confirmPassword !== password ? 'border-rose-500/80 bg-rose-950/20' : ''
            }`}
            required
          />
        </div>
        {confirmPassword && confirmPassword !== password && (
          <p className="mt-1 text-[11px] text-rose-400 font-medium">Passwords do not match</p>
        )}
      </div>

      {/* Terms Agreement */}
      <div className="pt-1">
        <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={termsAgreed}
            onChange={(e) => setTermsAgreed(e.target.checked)}
            className="mt-0.5 rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500"
          />
          <span className="leading-tight">
            I agree to the <a href="#terms" onClick={(e) => e.preventDefault()} className="text-rose-400 hover:underline">Terms of Service</a> and <a href="#privacy" onClick={(e) => e.preventDefault()} className="text-rose-400 hover:underline">Privacy Policy</a>.
          </span>
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 rounded-xl mathiyon-btn-primary font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg shadow-rose-900/40 disabled:opacity-50 cursor-pointer"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <span>Create Mathiyon Account</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </motion.form>
  );
};
