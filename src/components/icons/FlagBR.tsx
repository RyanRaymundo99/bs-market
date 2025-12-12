import React from "react";

interface FlagBRProps {
  className?: string;
  size?: number;
}

export const FlagBR: React.FC<FlagBRProps> = ({ className = "", size = 20 }) => {
  return (
    <svg
      width={size}
      height={size * 0.7}
      viewBox="0 0 20 14"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Green background */}
      <rect width="20" height="14" fill="#009739"/>
      {/* Yellow diamond */}
      <path d="M10 0 L20 7 L10 14 L0 7 Z" fill="#FEDD00"/>
      {/* Blue circle */}
      <circle cx="10" cy="7" r="3.5" fill="#002776"/>
      {/* White band (simplified) */}
      <path d="M6.5 7 L13.5 7" stroke="#FFFFFF" strokeWidth="0.3" strokeLinecap="round"/>
    </svg>
  );
};

