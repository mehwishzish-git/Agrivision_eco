import { NavLink, useLocation } from 'react-router-dom';
import { useFarm } from '../context/FarmContext';
import {
  LayoutDashboard, Leaf, CloudSun, FlaskConical,
  HeartPulse, Star, Microscope, Beaker, Bot, Settings, Sprout
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/zones', icon: Leaf, label: 'Farm Zones' },
  { to: '/weather', icon: CloudSun, label: 'Weather' },
  { to: '/soil', icon: FlaskConical, label: 'Soil Analysis' },
  { to: '/analysis', icon: Microscope, label: 'Crop Analysis' },
  { to: '/health', icon: HeartPulse, label: 'Health Score' },
  { to: '/recommendations', icon: Star, label: 'Recommendations' },
  { to: '/simulation', icon: Beaker, label: 'What-If Simulation' },
  { to: '/assistant', icon: Bot, label: 'AI Assistant' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { farms, selectedFarmId, setSelectedFarmId } = useFarm();

  return (
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <div className="logo-icon">
            <Sprout size={20} />
          </div>
          <div>
            <div className="logo-text">AgriVision AI</div>
            <div className="logo-sub">Farm Intelligence</div>
          </div>
        </div>
      </div>

      {/* Farm selector */}
      <div className="farm-selector">
        <div className="farm-selector-label">Active Farm</div>
        <select
          className="farm-select"
          value={selectedFarmId || ''}
          onChange={(e) => setSelectedFarmId(Number(e.target.value))}
        >
          {farms.map(f => (
            <option key={f.id} value={f.id}>
              {f.name}{f.is_demo ? ' ★' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            onClick={onClose}
            end={to === '/'}
          >
            <Icon size={18} className="nav-item-icon" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="demo-badge">
          <Sprout size={14} />
          <span>Demo farm active</span>
        </div>
      </div>
    </aside>
  );
}
