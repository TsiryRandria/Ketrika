import React from 'react';

interface KetrikaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  glow?: boolean;
}

export const KetrikaLogo: React.FC<KetrikaLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  glow = true,
}) => {
  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return { iconSize: 22, circleSize: 34, textSize: 'text-base' };
      case 'lg':
        return { iconSize: 44, circleSize: 68, textSize: 'text-2xl' };
      case 'xl':
        return { iconSize: 64, circleSize: 104, textSize: 'text-4xl' };
      case 'md':
      default:
        return { iconSize: 30, circleSize: 46, textSize: 'text-xl' };
    }
  };

  const { iconSize, circleSize, textSize } = getDimensions();

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Ketrika Icon Emblem */}
      <div 
        className={`relative flex items-center justify-center shrink-0 rounded-full transition-transform hover:scale-105 ${
          glow ? 'neon-glow-primary' : ''
        }`}
        style={{
          width: circleSize,
          height: circleSize,
          background: 'linear-gradient(135deg, rgba(6, 95, 70, 0.7) 0%, rgba(2, 44, 34, 0.9) 100%)',
          border: '1.5px solid rgba(52, 211, 153, 0.4)',
        }}
      >
        {/* Subtle decorative lateral dots matching the logo identity */}
        <div className="absolute -left-1 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_#38bdf8]" />
        <div className="absolute -right-1 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_#38bdf8]" />

        {/* Custom SVG combining lightbulb, inner gear, and sprout leaf */}
        <svg 
          width={iconSize} 
          height={iconSize} 
          viewBox="0 0 48 48" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
        >
          {/* Lightbulb contour */}
          <path 
            d="M24 6C16.268 6 10 12.268 10 20C10 24.848 12.457 29.123 16.216 31.643C16.969 32.148 17.5 32.96 17.5 33.864V36C17.5 37.105 18.395 38 19.5 38H28.5C29.605 38 30.5 37.105 30.5 36V33.864C30.5 32.96 31.031 32.148 31.784 31.643C35.543 29.123 38 24.848 38 20C38 12.268 31.732 6 24 6Z" 
            stroke="#38bdf8" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          {/* Sprout leaf inside */}
          <path 
            d="M24 28V18M24 18C24 15 28 14 28 14C28 18 25 18 24 18ZM24 22C24 19 20 18 20 18C20 22 23 22 24 22Z" 
            stroke="#00e676" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* Bulb base rings */}
          <path d="M20 41H28M22 44H26" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          {/* Small gear teeth / radiant rays around the bulb crown */}
          <path d="M24 2V4M12 8L13.5 9.5M36 8L34.5 9.5M6 20H8M40 20H42" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {/* Brand text */}
      {showText && (
        <span 
          className={`font-extrabold tracking-tight text-white ${textSize} drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]`}
          style={{ letterSpacing: '-0.03em' }}
        >
          ketrika
        </span>
      )}
    </div>
  );
};
