import React from 'react';

interface TridentLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const TridentLogo: React.FC<TridentLogoProps> = ({ className = '', size = 40, showText = true }) => {
  return (
    <div className={`flex items-center select-none shrink-0 ${showText ? 'gap-2.5' : ''} ${className}`}>
      {/* Brand Icon using authentic mathiyon.png asset */}
      <div 
        className="relative shrink-0 flex items-center justify-center rounded-xl shadow-lg shadow-rose-950/50 group hover:scale-105 transition-transform duration-300 overflow-hidden"
        style={{ width: size, height: size }}
      >
        <img
          src="/mathiyon.png"
          alt="Mathiyon Brand Logo"
          className="w-full h-full object-cover rounded-xl shrink-0"
        />
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-['Outfit'] truncate">
              MATHIYON
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full shrink-0">
              AI
            </span>
          </div>
          <span className="text-[10px] font-medium tracking-widest text-rose-300/80 uppercase truncate">
            மதியோன் • Platform
          </span>
        </div>
      )}
    </div>
  );
};
