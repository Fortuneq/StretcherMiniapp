// Иконки таббара и интерфейса — простые контурные, в духе Bend
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function HomeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-5h-4v5H5a1 1 0 0 1-1-1z" />
    </svg>
  )
}

export function BookmarkIcon({ filled, ...props }) {
  return (
    <svg {...base} fill={filled ? 'currentColor' : 'none'} {...props}>
      <path d="M7 4h10a1 1 0 0 1 1 1v16l-6-4-6 4V5a1 1 0 0 1 1-1z" />
    </svg>
  )
}

export function SparkleIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6z" />
      <path d="M18.5 15.5c.3 1.5 1 2.2 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.3 2.2-1 2.5-2.5z" />
    </svg>
  )
}

export function StatsIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="12" width="4.5" height="8" rx="2.25" />
      <rect x="14" y="4" width="4.5" height="16" rx="2.25" />
    </svg>
  )
}

export function GridIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="8" r="3.2" />
      <circle cx="16" cy="8" r="3.2" />
      <circle cx="8" cy="16" r="3.2" />
      <circle cx="16" cy="16" r="3.2" />
    </svg>
  )
}

export function CloseIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function BackIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </svg>
  )
}

export function PlayIcon(props) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M8.5 5.8v12.4a.8.8 0 0 0 1.22.68l9.6-6.2a.8.8 0 0 0 0-1.36l-9.6-6.2a.8.8 0 0 0-1.22.68z" />
    </svg>
  )
}

export function PauseIcon(props) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <rect x="7" y="5.5" width="3.4" height="13" rx="1.2" />
      <rect x="13.6" y="5.5" width="3.4" height="13" rx="1.2" />
    </svg>
  )
}

export function PrevIcon(props) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M11.8 12 18 7.5v9L11.8 12z" />
      <rect x="6" y="7" width="2.4" height="10" rx="1" />
    </svg>
  )
}

export function NextIcon(props) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M12.2 12 6 7.5v9l6.2-4.5z" />
      <rect x="15.6" y="7" width="2.4" height="10" rx="1" />
    </svg>
  )
}

export function CheckIcon(props) {
  return (
    <svg {...base} strokeWidth={2.4} {...props}>
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  )
}

export function InfoIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <path d="M12 8v.01" strokeWidth={2.6} />
    </svg>
  )
}

export function LockIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  )
}

export function TrashIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6h16M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6m4 0-1 13.5a1.5 1.5 0 0 1-1.5 1.4h-9A1.5 1.5 0 0 1 6 19.5L5 6" />
    </svg>
  )
}

export function FlameIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5c.5 3-1.3 4.4-2.6 6-1.2 1.4-2.4 3-2.4 5.2a5.9 5.9 0 0 0 11.9 0c0-3.9-3-5.3-3.5-8.2-1 .8-1.5 1.9-1.3 3.3-1.5-1.3-2.4-3.7-2.1-6.3z" />
    </svg>
  )
}
