export default function Stat({ label, value, good }) {
  return (
    <div className="flex justify-between py-1 text-xs border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
      <span style={{ color: 'var(--color-dim)' }}>{label}</span>
      <span className="font-bold" style={{ color: good === true ? 'var(--color-green)' : good === false ? 'var(--color-red)' : 'var(--color-text)' }}>
        {value}
      </span>
    </div>
  )
}
