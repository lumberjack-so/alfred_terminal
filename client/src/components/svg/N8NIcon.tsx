export default function N8NIcon({ className }: { className?: string }) {
  return (
    <svg
      width="195"
      height="195"
      viewBox="0 0 195 195"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Node 1 */}
      <circle
        cx="60"
        cy="60"
        r="20"
        stroke="currentColor"
        strokeWidth="8"
        fill="none"
      />
      
      {/* Node 2 */}
      <circle
        cx="135"
        cy="60"
        r="20"
        stroke="currentColor"
        strokeWidth="8"
        fill="none"
      />
      
      {/* Node 3 */}
      <circle
        cx="97.5"
        cy="120"
        r="20"
        stroke="currentColor"
        strokeWidth="8"
        fill="none"
      />
      
      {/* Node 4 */}
      <circle
        cx="60"
        cy="170"
        r="20"
        stroke="currentColor"
        strokeWidth="8"
        fill="none"
      />
      
      {/* Node 5 */}
      <circle
        cx="135"
        cy="170"
        r="20"
        stroke="currentColor"
        strokeWidth="8"
        fill="none"
      />
      
      {/* Connection lines */}
      <path
        d="M80 60L115 60"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      
      <path
        d="M70 75L87 105"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      
      <path
        d="M125 75L108 105"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      
      <path
        d="M87 135L70 155"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      
      <path
        d="M108 135L125 155"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      
      {/* Arrow indicators */}
      <path
        d="M110 55L120 60L110 65"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
  