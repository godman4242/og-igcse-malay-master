export default function LoadingSpinner({ size = 24, label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-4">
      <div
        className="rounded-full border-2 animate-spin"
        style={{
          width: size,
          height: size,
          borderColor: 'var(--color-border)',
          borderTopColor: 'var(--color-accent)',
        }}
      />
      {label && (
        <span className="text-xs font-medium" style={{ color: 'var(--color-dim)' }}>
          {label}
        </span>
      )}
    </div>
  );
}
