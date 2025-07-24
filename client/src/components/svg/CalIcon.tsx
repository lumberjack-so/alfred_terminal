export default function CalIcon({ className }: { className?: string }) {
  return (
    <svg
      width="195"
      height="195"
      viewBox="0 0 195 195"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Calendar base */}
      <rect
        x="25"
        y="40"
        width="145"
        height="130"
        rx="8"
        stroke="currentColor"
        strokeWidth="12"
        fill="none"
      />
      
      {/* Calendar header */}
      <rect
        x="25"
        y="40"
        width="145"
        height="35"
        rx="8"
        stroke="currentColor"
        strokeWidth="12"
        fill="currentColor"
        strokeLinejoin="round"
      />
      
      {/* Binding rings */}
      <rect
        x="60"
        y="20"
        width="8"
        height="40"
        rx="4"
        fill="currentColor"
      />
      <rect
        x="127"
        y="20"
        width="8"
        height="40"
        rx="4"
        fill="currentColor"
      />
      
      {/* Calendar dots for dates */}
      <circle cx="55" cy="105" r="6" fill="currentColor" />
      <circle cx="85" cy="105" r="6" fill="currentColor" />
      <circle cx="115" cy="105" r="6" fill="currentColor" />
      <circle cx="145" cy="105" r="6" fill="currentColor" />
      
      <circle cx="55" cy="135" r="6" fill="currentColor" />
      <circle cx="85" cy="135" r="6" fill="currentColor" />
      <circle cx="115" cy="135" r="6" fill="currentColor" />
      <circle cx="145" cy="135" r="6" fill="currentColor" />
    </svg>
  );
}
