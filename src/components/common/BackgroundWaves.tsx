import React from 'react';

export const BackgroundWaves: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      
      {/* 1. Ambient Lighting Glows matching the exact luminosity of page_1 & page_2 */}
      <div 
        className="absolute top-0 right-0 w-[600px] h-[550px] rounded-full blur-[130px] pointer-events-none"
        style={{ 
          background: 'radial-gradient(circle, rgba(4, 167, 124, 0.3) 0%, rgba(2, 80, 56, 0.1) 60%, transparent 100%)' 
        }}
      />
      <div 
        className="absolute top-1/4 left-0 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none"
        style={{ 
          background: 'radial-gradient(circle, rgba(0, 230, 118, 0.15) 0%, transparent 70%)' 
        }}
      />
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] rounded-full blur-[140px] pointer-events-none"
        style={{ 
          background: 'radial-gradient(circle, rgba(54, 251, 168, 0.2) 0%, rgba(1, 60, 42, 0.1) 70%, transparent 100%)' 
        }}
      />

      {/* 2. Top-Right Contour Lines (seen in page_2 through page_10 behind the header & notifications bell) */}
      <svg 
        className="absolute top-0 right-0 w-[420px] h-[280px] opacity-40 pointer-events-none"
        viewBox="0 0 420 280" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {[0, 14, 28, 42, 56, 70, 84, 98, 112, 126].map((offset, i) => (
          <path
            key={`top-wave-${i}`}
            d={`M${50 + offset * 2.5} 0 C${120 + offset * 2} 70, ${260 + offset * 1.5} 120, 420 ${90 + offset * 1.4}`}
            stroke="rgba(80, 250, 180, 0.45)"
            strokeWidth="1.2"
            fill="none"
          />
        ))}
      </svg>

      {/* 3. Bottom Landscape Topographic Waves (Signature design in page_1 & page_2) */}
      <svg 
        className="absolute bottom-0 left-0 w-full h-[400px] sm:h-[480px] opacity-45 pointer-events-none"
        viewBox="0 0 1000 480" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        {/* Parallel contour curved topography lines rising up from bottom-left to bottom-right */}
        {Array.from({ length: 24 }).map((_, i) => {
          const step = i * 16;
          return (
            <path
              key={`bottom-topo-${i}`}
              d={`M-50 ${240 + step * 0.75} C 220 ${180 + step * 0.6}, 480 ${360 + step * 0.4}, 1050 ${190 + step * 0.7}`}
              stroke="rgba(109, 250, 198, 0.45)"
              strokeWidth={i % 4 === 0 ? "1.8" : "1.1"}
              strokeOpacity={0.3 + (i / 24) * 0.45}
              fill="none"
            />
          );
        })}

        {/* Secondary criss-crossing contour stream */}
        {Array.from({ length: 12 }).map((_, i) => {
          const step = i * 20;
          return (
            <path
              key={`bottom-topo-cross-${i}`}
              d={`M-30 ${320 + step * 0.7} C 350 ${280 + step * 0.5}, 650 ${440 + step * 0.3}, 1050 ${260 + step * 0.6}`}
              stroke="rgba(0, 230, 118, 0.35)"
              strokeWidth="1.2"
              fill="none"
            />
          );
        })}
      </svg>

    </div>
  );
};
