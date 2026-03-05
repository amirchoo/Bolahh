export default function LoadingIcon({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ animation: 'spin 1s linear infinite' }}
    >
      {/* Spinning football/soccer ball */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
      
      {/* Animated arc */}
      <path
        d="M21 12 A9 9 0 0 1 12 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Pentagon pattern for football look */}
      <path
        d="M12 6 L14.5 8.5 L13.5 11.5 L10.5 11.5 L9.5 8.5 Z"
        fill="currentColor"
        opacity="0.6"
      />
      
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </svg>
  );
}
