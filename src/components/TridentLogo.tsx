import React from 'react';

interface TridentLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const TridentLogo: React.FC<TridentLogoProps> = ({ className = '', size = 40, showText = true }) => {
  return (
    <div className={`flex items-center select-none shrink-0 ${showText ? 'gap-2.5' : ''} ${className}`}>
      <div 
        className="relative shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 via-rose-700 to-rose-950 p-2 shadow-lg shadow-rose-900/40 border border-rose-500/30 group hover:scale-105 transition-transform duration-300"
        style={{ width: size, height: size }}
      >
        {/* Glow halo */}
        <div className="absolute inset-0 bg-rose-500/30 rounded-xl blur-md group-hover:blur-lg transition-all" />

        {/* Trident SVG Icon matching logo design */}
        <svg 
          viewBox="0 0 100 100" 
          className="relative w-full h-full text-white fill-current shrink-0" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Trident central arrow stem */}
          <path d="M44 38 L44 14 L50 6 L56 14 L56 38 Z" />
          
          {/* Left prong tip */}
          <path d="M22 36 L22 22 L28 14 L32 26 L28 32 Z" />
          
          {/* Right prong tip */}
          <path d="M78 36 L78 22 L72 14 L68 26 L72 32 Z" />

          {/* Connected Trident Bar & Base */}
          <path 
            d="M 22 40 C 22 56, 44 58, 44 68 L 44 80 L 36 80 L 36 88 L 64 88 L 64 80 L 56 80 L 56 68 C 56 58, 78 56, 78 40 L 68 40 C 68 50, 56 52, 56 58 L 44 58 C 44 52, 32 50, 32 40 Z" 
          />
        </svg>
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
