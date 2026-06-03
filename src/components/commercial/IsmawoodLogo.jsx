import React from "react";

/** Logo vectoriel Ismawood (bois / panneaux). */
const IsmawoodLogo = ({ className = "h-14 w-auto", variant = "light" }) => {
  const wood = variant === "light" ? "#9DC183" : "#4B3621";
  const dark = variant === "light" ? "#FFFFFF" : "#4B3621";
  const accent = variant === "light" ? "#f5ede3" : "#9DC183";

  return (
    <svg
      viewBox="0 0 200 56"
      className={className}
      role="img"
      aria-label="Ismawood"
    >
      <rect x="0" y="8" width="48" height="40" rx="8" fill={wood} opacity="0.9" />
      <path
        d="M12 38 L24 18 L36 38 Z"
        fill={dark}
        opacity="0.15"
      />
      <rect x="14" y="22" width="6" height="16" rx="1" fill={accent} />
      <rect x="22" y="26" width="6" height="12" rx="1" fill={accent} />
      <rect x="30" y="20" width="6" height="18" rx="1" fill={accent} />
      <text
        x="58"
        y="34"
        fill={dark}
        fontFamily="system-ui, Arial, sans-serif"
        fontSize="22"
        fontWeight="800"
        letterSpacing="1"
      >
        ISMAWOOD
      </text>
      <text
        x="58"
        y="48"
        fill={wood}
        fontFamily="system-ui, Arial, sans-serif"
        fontSize="9"
        fontWeight="600"
        letterSpacing="2"
      >
        BOIS &amp; PANNEAUX
      </text>
    </svg>
  );
};

export default IsmawoodLogo;
