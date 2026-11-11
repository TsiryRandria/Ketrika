import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';

export const WelcomeScreen: React.FC = () => {
  const { setCurrentTab } = useApp();
  const [isExiting, setIsExiting] = useState(false);
  const redirectedRef = useRef(false);

  // Navigate to home screen with smooth transition
  const handleEnter = () => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    setIsExiting(true);
    setTimeout(() => {
      setCurrentTab('accueil');
    }, 280);
  };

  useEffect(() => {
    // Automatic redirection at the end of the 2.8s 360° animation (+ 150ms buffer)
    const timer = setTimeout(() => {
      handleEnter();
    }, 2950);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Enter', 'Space', 'Escape', 'ArrowRight'].includes(e.code) || e.key === ' ') {
        handleEnter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div 
      onClick={handleEnter}
      className={`fixed inset-0 z-50 w-full h-full bg-[#015a43] flex items-center justify-center cursor-pointer select-none overflow-hidden transition-all duration-300 ${
        isExiting ? 'opacity-0 scale-[1.02]' : 'opacity-100 scale-100'
      }`}
      title="Cliquer ou appuyer pour accéder immédiatement à l'accueil"
    >
      {/* Container preserving the exact 849 x 1853 aspect ratio of page_1.png */}
      <div className="relative aspect-[849/1853] h-full max-h-screen w-auto max-w-full flex items-center justify-center overflow-hidden">
        
        {/* Base authentic artwork from page_1.png (Background, Logo, and Waves stay 100% fixed) */}
        <img
          src="/assets/aistudio/page_1_ea1cec3d.png"
          alt="Ketrika - Page de bienvenue"
          className="w-full h-full object-contain pointer-events-none select-none drop-shadow-2xl"
        />

        {/* 
          SVG Animation Overlay matching the 849 x 1853 coordinates:
          - Covers original static dots
          - Reconstructs continuous white circular track
          - Rotates the two glowing blue dots 360° around the fixed central logo
        */}
        <svg
          viewBox="0 0 849 1853"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Authentic cyan neon gradient matching page_1.png dots */}
            <radialGradient id="blueDotGlowGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#e0f7fa" />
              <stop offset="30%" stopColor="#67e8f9" />
              <stop offset="70%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </radialGradient>

            {/* Glowing neon drop-shadow */}
            <filter id="dotNeonShadow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. Subtle masks over the static dots in the background image */}
          <circle cx="185.66" cy="819.89" r="17.5" fill="#015a43" />
          <circle cx="663.71" cy="819.89" r="17.5" fill="#015a43" />

          {/* 2. Pristine white circular path seamless through the mask points */}
          <circle 
            cx="424.685" 
            cy="819.89" 
            r="239.025" 
            fill="none" 
            stroke="#ffffff" 
            strokeWidth="2.8"
            opacity="0.95"
          />

          {/* 
            3. The 360° Rotating Group:
            Starts at 0° (left and right sides of circle), rotates a full 360° around
            center point (424.685, 819.89), while the logo and background remain fixed.
          */}
          <g 
            className="animate-dots-360"
            style={{ 
              transformOrigin: '424.685px 819.89px',
            }}
            onAnimationEnd={handleEnter}
          >
            {/* Native SVG animation transform guarantee for 100% browser compatibility */}
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 424.685 819.89"
              to="360 424.685 819.89"
              dur="2.8s"
              repeatCount="1"
              fill="freeze"
              calcMode="spline"
              keyTimes="0; 1"
              keySplines="0.4 0 0.2 1"
            />

            {/* Left Blue Dot */}
            <g className="animate-dot-pulse">
              {/* Outer soft cyan aura */}
              <circle 
                cx="185.66" 
                cy="819.89" 
                r="18" 
                fill="#38bdf8" 
                opacity="0.35" 
                filter="url(#dotNeonShadow)"
              />
              {/* Core radiant cyan dot */}
              <circle 
                cx="185.66" 
                cy="819.89" 
                r="13.8" 
                fill="url(#blueDotGlowGrad)" 
                stroke="#ffffff"
                strokeWidth="1.2"
                filter="url(#dotNeonShadow)"
              />
            </g>

            {/* Right Blue Dot */}
            <g className="animate-dot-pulse">
              {/* Outer soft cyan aura */}
              <circle 
                cx="663.71" 
                cy="819.89" 
                r="18" 
                fill="#38bdf8" 
                opacity="0.35" 
                filter="url(#dotNeonShadow)"
              />
              {/* Core radiant cyan dot */}
              <circle 
                cx="663.71" 
                cy="819.89" 
                r="13.8" 
                fill="url(#blueDotGlowGrad)" 
                stroke="#ffffff"
                strokeWidth="1.2"
                filter="url(#dotNeonShadow)"
              />
            </g>
          </g>
        </svg>

        {/* Discreet skip indicator at bottom */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-emerald-950/70 backdrop-blur-md border border-emerald-400/30 text-emerald-200/80 text-[11px] font-medium tracking-wide flex items-center gap-2 pointer-events-none shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>Chargement de Ketrika...</span>
        </div>

      </div>
    </div>
  );
};

