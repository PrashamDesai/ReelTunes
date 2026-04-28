export default function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2.6"
      />
      <path
        className="opacity-95"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        d="M22 12a10 10 0 0 0-10-10"
      />
    </svg>
  );
}
