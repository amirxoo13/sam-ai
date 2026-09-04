export function SamMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect x="3" y="4" width="26" height="24" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10h16M8 16h12M8 22h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="23" cy="22" r="2.2" fill="currentColor" />
    </svg>
  );
}
