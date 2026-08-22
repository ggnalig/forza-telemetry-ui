import React from "react";

interface CarNameplateProps {
  carName: string | null;
}

export const CarNameplate: React.FC<CarNameplateProps> = ({ carName }) => {
  return (
    <div className="w-full text-center py-1.5 px-8 bg-black border-b border-gray-800">
      <span className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase truncate block">
        {carName ?? "Unknown Vehicle"}
      </span>
    </div>
  );
};
