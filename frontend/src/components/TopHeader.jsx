import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X, Bell, RefreshCw } from 'lucide-react';
import { useFarm } from '../context/FarmContext';

const PAGE_TITLES = {
  '/': { title: 'Dashboard', subtitle: 'Farm overview and key metrics' },
  '/zones': { title: 'Farm Zones', subtitle: 'Manage fields and growing areas' },
  '/weather': { title: 'Weather', subtitle: 'Weather data and trends' },
  '/soil': { title: 'Soil Analysis', subtitle: 'Nutrient levels and soil health' },
  '/analysis': { title: 'Crop Analysis', subtitle: 'AI-powered crop health detection' },
  '/health': { title: 'Health Score', subtitle: 'Farm health scoring and risk assessment' },
  '/recommendations': { title: 'Recommendations', subtitle: 'Actionable farm management advice' },
  '/simulation': { title: 'What-If Simulation', subtitle: 'Scenario planning and projections' },
  '/assistant': { title: 'AI Assistant', subtitle: 'Farm intelligence chatbot' },
};

export default function TopHeader({ mobileOpen, onMobileToggle }) {
  const location = useLocation();
  const { selectedFarm } = useFarm();
  const info = PAGE_TITLES[location.pathname] || { title: 'AgriVision AI', subtitle: '' };

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          className="btn btn-ghost btn-icon mobile-menu-btn"
          onClick={onMobileToggle}
          style={{ display: 'none' }}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div>
          <div className="page-title">{info.title}</div>
          {selectedFarm && (
            <div className="page-subtitle">
              {selectedFarm.name}{selectedFarm.is_demo ? ' · Demo Farm' : ''}
            </div>
          )}
        </div>
      </div>

      <div className="header-actions">
        {selectedFarm?.is_demo === 1 && (
          <span className="badge badge-demo">🌾 Demo Data</span>
        )}
      </div>
    </header>
  );
}
