import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/common/Sidebar'
import Dashboard from './pages/Dashboard'
import MapPage from './pages/MapPage'
import BusesPage from './pages/BusesPage'
import RoutesPage from './pages/RoutesPage'
import StopsPage from './pages/StopsPage'
import DriversPage from './pages/DriversPage'

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/buses" element={<BusesPage />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/stops" element={<StopsPage />} />
          <Route path="/drivers" element={<DriversPage />} />
        </Routes>
      </div>
    </div>
  )
}