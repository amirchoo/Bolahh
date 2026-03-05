export default function ProfileIcon({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Football player silhouette */}
      {/* Head */}
      <circle cx="12" cy="6" r="2.5" fill="currentColor" />
      
      {/* Body */}
      <path
        d="M12 8.5 L12 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Arms - raised like celebrating a goal */}
      <path
        d="M12 9.5 L9 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 9.5 L15 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Legs - running pose */}
      <path
        d="M12 14 L10 18.5 L9.5 20.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 14 L14.5 19 L15.5 20.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Ball near foot */}
      <circle cx="17" cy="19.5" r="1.8" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M17 18.2 L17 20.8 M15.7 19.5 L18.3 19.5" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}
