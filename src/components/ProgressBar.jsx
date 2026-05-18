export default function ProgressBar({ owned, total }) {
  const pct = total === 0 ? 0 : Math.round((owned / total) * 100)
  return (
    <div className="progress">
      <div className="progress-head">
        <strong>Progreso del álbum</strong>
        <span>
          {owned} / {total} ({pct}%)
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
