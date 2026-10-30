import { NavLink } from 'react-router-dom'
import { haptic } from '../lib/telegram'
import { HomeIcon, BodyIcon, SparkleIcon, StatsIcon, GridIcon } from './Icons'

const tabs = [
  { to: '/', label: 'Что потянуть', Icon: BodyIcon },
  { to: '/today', label: 'Сегодня', Icon: HomeIcon },
  { to: '/builder', label: 'Создать', Icon: SparkleIcon },
  { to: '/stats', label: 'Статистика', Icon: StatsIcon },
  { to: '/library', label: 'Практики', Icon: GridIcon },
]

export default function TabBar() {
  return (
    <nav className="tabbar">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `tabbar__item${isActive ? ' is-active' : ''}`}
          onClick={() => haptic('light')}
          aria-label={label}
        >
          <Icon />
        </NavLink>
      ))}
    </nav>
  )
}
