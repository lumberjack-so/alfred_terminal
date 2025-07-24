export default function GhostIcon({ className }: { className?: string }) {
  return (
    <svg
      width="195"
      height="195"
      viewBox="0 0 195 195"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Ghost body */}
      <path
        d="M97.5 25C67.3 25 42.5 49.8 42.5 80V140L55 127L67.5 140L80 127L92.5 140L105 127L117.5 140L130 127L142.5 140L155 127V80C155 49.8 130.2 25 100 25H97.5Z"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Ghost eyes */}
      <circle 
        cx="75" 
        cy="80" 
        r="8" 
        fill="currentColor"
      />
      <circle 
        cx="120" 
        cy="80" 
        r="8" 
        fill="currentColor"
      />
      
      {/* Ghost mouth */}
      <ellipse
        cx="97.5"
        cy="105"
        rx="12"
        ry="8"
        fill="currentColor"
      />
    </svg>
  );
}
  