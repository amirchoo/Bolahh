export default function HomeIcon({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Soccer ball as home icon */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
      
      {/* Pentagon in center */}
      <path
        d="M12 5.5 L14.5 8.5 L13.5 11.5 L10.5 11.5 L9.5 8.5 Z"
        fill="currentColor"
      />
      
      {/* Hexagon patterns around */}
      <path
        d="M14.5 8.5 L17 10 L16 13"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M13.5 11.5 L15 14.5 L13 17"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M10.5 11.5 L9 14.5 L11 17"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M9.5 8.5 L7 10 L8 13"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M11 17 L12 19.5 L13 17"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}
