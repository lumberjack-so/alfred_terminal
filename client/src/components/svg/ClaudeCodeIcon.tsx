import { cn } from '~/utils';

export default function ClaudeCodeIcon({
  size = 24,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn('fill-none stroke-current', className)}
      xmlns="http://www.w3.org/2000/svg"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Terminal window */}
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      
      {/* Terminal prompt */}
      <polyline points="8 9 11 12 8 15" />
      <line x1="13" y1="15" x2="17" y2="15" />
    </svg>
  );
}