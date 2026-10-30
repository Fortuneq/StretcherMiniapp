import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Routines from './pages/Routines'
import RoutineDetail from './pages/RoutineDetail'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/routines" element={<Routines />} />
        <Route path="/routines/:slug" element={<RoutineDetail />} />
      </Route>
    </Routes>
  )
}
