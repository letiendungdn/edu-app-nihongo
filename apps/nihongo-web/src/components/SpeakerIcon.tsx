/** Icon loa (SVG, theo màu chữ) cho nút nền màu — emoji 🔊 hiện xám trên nền gradient. */
export default function SpeakerIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      style={{ display: 'block' }}
    >
      <path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4z" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
      />
    </svg>
  );
}
