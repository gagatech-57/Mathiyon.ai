import React, { useState } from 'react';
import { TridentLogo } from './TridentLogo';
import { ShowcasePanel } from './ShowcasePanel';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { LogIn, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserProfile } from '../api';

interface AuthCardProps {
  onSuccess: (user: UserProfile) => void;
}

export const AuthCard: React.FC<AuthCardProps> = ({ onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  return (
    <div className="relative z-10 w-full max-w-5xl rounded-3xl glass-panel border border-rose-500/25 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
      {/* Left side: Branding & Feature Showcase Panel */}
      <ShowcasePanel />

      {/* Right side: Auth Form Portal */}
      <div className="p-6 sm:p-10 flex flex-col justify-between bg-[#0c0919]/90">
        {/* Mobile Header Logo */}
        <div className="lg:hidden mb-6 flex justify-center">
          <TridentLogo size={44} />
        </div>

        <div>
          {/* Header Title */}
          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit'] tracking-tight">
              {activeTab === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {activeTab === 'signin'
                ? 'Sign in to access your Mathiyon AI projects & agents.'
                : 'Join Mathiyon AI today and build next-gen intelligence.'}
            </p>
          </div>

          {/* Tab Navigation Controls */}
          <div className="relative p-1 mb-6 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 gap-1">
            <button
              onClick={() => setActiveTab('signin')}
              className={`relative py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'signin' ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {activeTab === 'signin' && (
                <motion.div
                  layoutId="activeTabBg"
                  className="absolute inset-0 bg-gradient-to-r from-rose-600 to-rose-700 rounded-lg shadow-md"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <LogIn className="relative z-10 w-4 h-4" />
              <span className="relative z-10">Sign In</span>
            </button>

            <button
              onClick={() => setActiveTab('signup')}
              className={`relative py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'signup' ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {activeTab === 'signup' && (
                <motion.div
                  layoutId="activeTabBg"
                  className="absolute inset-0 bg-gradient-to-r from-rose-600 to-rose-700 rounded-lg shadow-md"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <UserPlus className="relative z-10 w-4 h-4" />
              <span className="relative z-10">Sign Up</span>
            </button>
          </div>

          {/* Form Content Switching with AnimatePresence */}
          <AnimatePresence mode="wait">
            {activeTab === 'signin' ? (
              <SignInForm 
                key="signin" 
                onSuccess={onSuccess} 
              />
            ) : (
              <SignUpForm 
                key="signup" 
                onSuccess={onSuccess} 
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer info & switch prompt */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
          {activeTab === 'signin' ? (
            <p>
              Don't have a Mathiyon account?{' '}
              <button 
                onClick={() => setActiveTab('signup')}
                className="text-rose-400 hover:text-rose-300 font-bold hover:underline cursor-pointer"
              >
                Sign Up for free
              </button>
            </p>
          ) : (
            <p>
              Already registered with Mathiyon?{' '}
              <button 
                onClick={() => setActiveTab('signin')}
                className="text-rose-400 hover:text-rose-300 font-bold hover:underline cursor-pointer"
              >
                Sign In to account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
