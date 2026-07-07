import { useEffect } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import TabBar from './components/TabBar'
import Today from './pages/Today'
import Library from './pages/Library'
import Saved from './pages/Saved'
import Builder from './pages/Builder'
import Stats from './pages/Stats'
import RoutineDetail from './pages/RoutineDetail'
import Player from './pages/Player'
import Paywall from './pages/Paywall'
import Profile from './pages/Profile'
import { showBackButton, hideBackButton } from './lib/telegram'

// Внутренние экраны с кнопкой «назад» Telegram. Всё остальное (табы, плеер со
// своим крестиком, служебные пути вида #tgWebAppData=…) — без неё: тогда
// Telegram показывает «Закрыть» в шапке.
const INNER_PREFIXES = ['/routine/', '/paywall', '/profile']

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()

  const isInner = INNER_PREFIXES.some((p) => location.pathname.startsWith(p))
  const isPlayer = location.pathname.startsWith('/player')

  useEffect(() => {
    if (isInner) showBackButton(() => navigate(-1))
    else hideBackButton()
    return hideBackButton
  }, [location.pathname, isInner, navigate])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="app">
      <main className={isPlayer ? 'screen screen--player' : 'screen'}>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/library" element={<Library />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/builder" element={<Builder />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/routine/:slug" element={<RoutineDetail />} />
          <Route path="/player/:slug" element={<Player />} />
          <Route path="/paywall" element={<Paywall />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Today />} />
        </Routes>
      </main>
      {!isPlayer && <TabBar />}
    </div>
  )
}
