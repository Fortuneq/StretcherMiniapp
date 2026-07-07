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

const TAB_PATHS = ['/', '/library', '/saved', '/builder', '/stats']

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()

  const isTab = TAB_PATHS.includes(location.pathname)
  const isPlayer = location.pathname.startsWith('/player')

  // Кнопка «назад» Telegram на внутренних экранах (кроме плеера — там свой крестик)
  useEffect(() => {
    if (isTab || isPlayer) hideBackButton()
    else showBackButton(() => navigate(-1))
    return hideBackButton
  }, [location.pathname, isTab, isPlayer, navigate])

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
