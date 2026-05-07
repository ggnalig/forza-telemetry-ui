import React from 'react';

interface ShiftLightsProps {
  activeCount: number;
  blink: boolean;
  color: string;
  totalLights?: number;
}

export const ShiftLights: React.FC<ShiftLightsProps> = ({ 
  activeCount, 
  blink, 
  color,
  totalLights = 10 
}) => {
  return (
    <div className="w-full flex justify-center gap-2 py-4 px-6 bg-black border-b-2 border-gray-800">
      {Array.from({ length: totalLights }).map((_, i) => {
        const isActive = i < activeCount;
        let lightColor = 'bg-gray-800';
        let glow = '';
        
        if (isActive) {
          if (color === 'red') {
            lightColor = 'bg-red-500';
            glow = 'shadow-[0_0_15px_rgba(239,68,68,0.8)]';
          } else if (color === 'yellow') {
            lightColor = 'bg-yellow-400';
            glow = 'shadow-[0_0_15px_rgba(250,204,21,0.8)]';
          } else if (color === 'green') {
            lightColor = 'bg-green-500';
            glow = 'shadow-[0_0_15px_rgba(34,197,94,0.8)]';
          } else {
            lightColor = 'bg-blue-500';
            glow = 'shadow-[0_0_15px_rgba(59,130,246,0.8)]';
          }
        }

        const isBlinking = blink && isActive;

        return (
          <div 
            key={i}
            className={`w-8 h-8 rounded-full transition-all duration-75 
              ${lightColor} ${glow} 
              ${isBlinking ? 'animate-pulse' : ''}
              ${!isActive ? 'opacity-30' : 'opacity-100'}
            `}
          />
        );
      })}
    </div>
  );
};
