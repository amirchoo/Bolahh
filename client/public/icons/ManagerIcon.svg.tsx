export default function ManagerIcon({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Manager with glasses and clipboard */}
      {/* Head */}
      <circle cx="12" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      
      {/* Glasses */}
      <circle cx="10.5" cy="7" r="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="13.5" cy="7" r="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M11.7 7 L12.3 7" stroke="currentColor" strokeWidth="1.2" />
      
      {/* Body - shoulders */}
      <path
        d="M8 10 Q12 11 16 10"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      
      {/* Clipboard */}
      <rect
        x="8.5"
        y="13"
        width="7"
        height="8"
        rx="0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      
      {/* Clipboard clip */}
      <rect
        x="10.5"
        y="12"
        width="3"
        height="1.5"
        rx="0.3"
        fill="currentColor"
      />
      
      {/* Lines on clipboard - tactics/notes */}
      <path d="M10 15.5 L14 15.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M10 17.5 L14 17.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M10 19.5 L13 19.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
