import React from "react";

interface FlagUSProps {
  className?: string;
  size?: number;
}

export const FlagUS: React.FC<FlagUSProps> = ({ className = "", size = 20 }) => {
  return (
    <svg
      width={size}
      height={size * 0.7}
      viewBox="0 0 20 14"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* White background */}
      <rect width="20" height="14" fill="#FFFFFF"/>
      {/* Red stripes */}
      <rect y="0" width="20" height="1.08" fill="#B22234"/>
      <rect y="2.16" width="20" height="1.08" fill="#B22234"/>
      <rect y="4.32" width="20" height="1.08" fill="#B22234"/>
      <rect y="6.48" width="20" height="1.08" fill="#B22234"/>
      <rect y="8.64" width="20" height="1.08" fill="#B22234"/>
      <rect y="10.8" width="20" height="1.08" fill="#B22234"/>
      <rect y="12.96" width="20" height="1.04" fill="#B22234"/>
      {/* Blue canton */}
      <rect width="8" height="7.56" fill="#3C3B6E"/>
      {/* Stars pattern (simplified 5x6 grid) */}
      <g fill="#FFFFFF">
        <circle cx="1.2" cy="1.2" r="0.25"/>
        <circle cx="2.4" cy="1.2" r="0.25"/>
        <circle cx="3.6" cy="1.2" r="0.25"/>
        <circle cx="4.8" cy="1.2" r="0.25"/>
        <circle cx="6" cy="1.2" r="0.25"/>
        <circle cx="7.2" cy="1.2" r="0.25"/>
        <circle cx="1.8" cy="2.4" r="0.25"/>
        <circle cx="3" cy="2.4" r="0.25"/>
        <circle cx="4.2" cy="2.4" r="0.25"/>
        <circle cx="5.4" cy="2.4" r="0.25"/>
        <circle cx="6.6" cy="2.4" r="0.25"/>
        <circle cx="1.2" cy="3.6" r="0.25"/>
        <circle cx="2.4" cy="3.6" r="0.25"/>
        <circle cx="3.6" cy="3.6" r="0.25"/>
        <circle cx="4.8" cy="3.6" r="0.25"/>
        <circle cx="6" cy="3.6" r="0.25"/>
        <circle cx="7.2" cy="3.6" r="0.25"/>
        <circle cx="1.8" cy="4.8" r="0.25"/>
        <circle cx="3" cy="4.8" r="0.25"/>
        <circle cx="4.2" cy="4.8" r="0.25"/>
        <circle cx="5.4" cy="4.8" r="0.25"/>
        <circle cx="6.6" cy="4.8" r="0.25"/>
        <circle cx="1.2" cy="6" r="0.25"/>
        <circle cx="2.4" cy="6" r="0.25"/>
        <circle cx="3.6" cy="6" r="0.25"/>
        <circle cx="4.8" cy="6" r="0.25"/>
        <circle cx="6" cy="6" r="0.25"/>
        <circle cx="7.2" cy="6" r="0.25"/>
      </g>
    </svg>
  );
};

