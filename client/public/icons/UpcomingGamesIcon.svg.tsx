export default function UpcomingGamesIcon({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Calendar/Schedule with football theme */}
      {/* Calendar outline */}
      <rect
        x="4"
        y="5"
        width="16"
        height="16"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      
      {/* Calendar header */}
      <rect
        x="4"
        y="5"
        width="16"
        height="4"
        fill="currentColor"
      />
      
      {/* Binding rings */}
      <circle cx="7" cy="5" r="0.8" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="12" cy="5" r="0.8" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="17" cy="5" r="0.8" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
      
      {/* Calendar grid dots/markers */}
      <circle cx="7.5" cy="12" r="0.8" fill="currentColor" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
      <circle cx="16.5" cy="12" r="0.8" fill="currentColor" />
      
      <circle cx="7.5" cy="15.5" r="0.8" fill="currentColor" />
      <circle cx="12" cy="15.5" r="0.8" fill="currentColor" />
      <circle cx="16.5" cy="15.5" r="0.8" fill="currentColor" />
      
      {/* Highlighted date with small ball */}
      <circle cx="12" cy="18.5" r="1.8" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M12 17.2 L12 19.8 M10.7 18.5 L13.3 18.5" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}
