export default function FriendIcon({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Two teammates - side by side */}
      {/* Person 1 - Left */}
      <circle cx="8" cy="7" r="2.2" fill="currentColor" />
      <path
        d="M8 9.5 Q5 11 5 14 L5 20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      
      {/* Person 2 - Right */}
      <circle cx="16" cy="7" r="2.2" fill="currentColor" />
      <path
        d="M16 9.5 Q19 11 19 14 L19 20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      
      {/* Arms reaching towards each other - teamwork */}
      <path
        d="M8 12 L10.5 13.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16 12 L13.5 13.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      
      {/* Ball in between */}
      <circle cx="12" cy="15" r="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M12 13.8 L12 16.2 M10.8 15 L13.2 15" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}
