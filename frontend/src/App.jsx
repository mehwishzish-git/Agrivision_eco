import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FarmProvider } from './context/FarmContext';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import Dashboard from './pages/Dashboard';
import Zones from './pages/Zones';
import Weather from './pages/Weather';
import Soil from './pages/Soil';
import Analysis from './pages/Analysis';
import HealthScore from './pages/HealthScore';
import Recommendations from './pages/Recommendations';
import Simulation from './pages/Simulation';
import Assistant from './pages/Assistant';

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 99 }}
        />
      )}
      <div className="main-content">
        <TopHeader mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen(o => !o)} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/zones" element={<Zones />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/soil" element={<Soil />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/health" element={<HealthScore />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <FarmProvider>
        <AppLayout />
      </FarmProvider>
    </BrowserRouter>
  );
}
