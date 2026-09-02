/** Icone couronne doree du logo RexFoot -- id doit etre unique par instance (gradient SVG). */
export function CrownIcon({
    id,
    className,
    size = 20,
}: {
    id: string;
    className?: string;
    size?: number;
}) {
    const gradientId = "crown-gold-" + id;
    return (
          <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#FFE9A8" />
      <stop offset="45%" stopColor="#F5C243" />
      <stop offset="100%" stopColor="#B8860B" />
      </linearGradient>
      <path d="M4.7 16.5c-.1.3-.2.7-.2 1.1 0 .2.2.4.4.4h14.2c.2 0 .4-.2.4-.4 0-.4-.1-.8-.2-1.1L21 8l-5 3.5L12 6 8 11.5 3 8l1.7 8.5z" fill={`url(#${gradientId})`} stroke="#8A5A00" strokeWidth={0.4} strokeLinejoin="round" />
      <rect x={4.9} y={18} width={14.2} height={2} rx={1} fill={`url(#${gradientId})`} stroke="#8A5A00" strokeWidth={0.4} />
      <circle cx={12} cy={6} r={1.1} fill="#fff" opacity={0.9} />
      <circle cx={3} cy={8} r={1} fill="#fff" opacity={0.9} />
      <circle cx={21} cy={8} r={1} fill="#fff" opacity={0.9} />
      </svg>
    );
}
