import { DOCK_ZONES } from '../../lib/guide/dragDock'

// The translucent-green dashed drop targets shown while the guide box is being
// dragged (4 edges + 4 corners — the "book margins"). Presentational only: the
// active zone (under the pointer) is highlighted. pointer-events:none so it never
// blocks the drag underneath. Styling lives in index.css (.guide-dock-zones).
export default function GuideDockZones({ activeZone = null }) {
  return (
    <div className="guide-dock-zones" aria-hidden="true">
      {DOCK_ZONES.map((zone) => (
        <div
          key={zone}
          data-zone={zone}
          className={'guide-dock-zone guide-dock-zone-' + zone + (zone === activeZone ? ' is-active' : '')}
        />
      ))}
    </div>
  )
}
