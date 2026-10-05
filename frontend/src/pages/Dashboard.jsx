import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  HeartPulse, CloudSun, Leaf, AlertTriangle,
  TrendingUp, Droplets, Thermometer, Wind,
  CheckCircle, XCircle, ArrowRight, Info, Sprout
} from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { getDashboard } from '../api';

const getRiskClass = (level) => {
  const map = { Low: 'success', Medium: 'warning', High: 'danger', Critical: 'danger' };
  return map[level] || 'neutral';
};

const getScoreColor = (score) => {
  if (score >= 80) return '#10B981';
  if (score >= 65) return '#F59E0B';
  if (score >= 45) return '#EF4444';
  return '#7C3AED';
};

function HealthRing({ score, size = 80 }) {
  const radius = (size - 10) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * circ;
  const color = getScoreColor(score);

  return (
    <div className="health-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E2EBF2" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="health-ring-label">
        <div className="health-ring-value" style={{ color, fontSize: size * 0.22 }}>{score}</div>
        <div className="health-ring-unit">/100</div>
      </div>
    </div>
  );
}

const formatDate = (str) => {
  if (!str) return '';
  try {
    return new Date(str).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch { return str; }
};

export default function Dashboard() {
  const { selectedFarmId, selectedFarm } = useFarm();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedFarmId) return;
    setLoading(true);
    setError(null);
    getDashboard(selectedFarmId)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedFarmId]);

  if (loading) return (
    <div className="page-container">
      <div className="loading-overlay"><div className="spinner" /><span>Loading dashboard…</span></div>
    </div>
  );

  if (error) return (
    <div className="page-container">
      <div className="alert alert-danger"><AlertTriangle size={16} /><span>{error}</span></div>
    </div>
  );

  if (!data) return null;

  const {
    farm_health_average = 0,
    zone_health = [],
    latest_weather = null,
    high_priority_recs = 0,
    medium_priority_recs = 0,
    disease_alerts = [],
    weather_trend = [],
    soil_trend = [],
    zones_count = 0
  } = data || {};

  const validZoneHealth = Array.isArray(zone_health) ? zone_health : [];

  // Radar data
  const radarData = validZoneHealth.length > 0 ? [
    { subject: 'Soil', value: Math.round(validZoneHealth.reduce((s, z) => s + (z.soil_score || 0), 0) / validZoneHealth.length) },
    { subject: 'Weather', value: Math.round(validZoneHealth.reduce((s, z) => s + (z.weather_score || 0), 0) / validZoneHealth.length) },
    { subject: 'Crop', value: Math.round(validZoneHealth.reduce((s, z) => s + (z.crop_score || 0), 0) / validZoneHealth.length) },
    { subject: 'Overall', value: farm_health_average },
  ] : [];

  return (
    <div className="page-container">
      {selectedFarm?.is_demo === 1 && (
        <div className="disclaimer-banner">
          <Info size={14} />
          <span>
            <strong>Demo Farm Active:</strong> All data shown is simulated for demonstration. Not real farm data.
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className={`stat-card ${farm_health_average < 65 ? 'danger' : farm_health_average < 80 ? 'warning' : 'success'}`}>
          <div className={`stat-icon ${farm_health_average < 65 ? 'danger' : farm_health_average < 80 ? 'warning' : 'success'}`}>
            <HeartPulse size={20} />
          </div>
          <div className="stat-value">{farm_health_average}</div>
          <div className="stat-label">Farm Health Score</div>
          <div className={`stat-change ${farm_health_average >= 70 ? 'positive' : 'negative'}`}>
            {farm_health_average >= 80 ? '✓ Good' : farm_health_average >= 65 ? '⚠ Moderate' : '✗ Needs Attention'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Leaf size={20} /></div>
          <div className="stat-value">{zones_count}</div>
          <div className="stat-label">Farm Zones</div>
          <div className="stat-change neutral">{zones_count} active zones</div>
        </div>

        <div className={`stat-card ${high_priority_recs > 0 ? 'danger' : 'success'}`}>
          <div className={`stat-icon ${high_priority_recs > 0 ? 'danger' : 'success'}`}>
            <AlertTriangle size={20} />
          </div>
          <div className="stat-value">{high_priority_recs + medium_priority_recs}</div>
          <div className="stat-label">Pending Actions</div>
          <div className={`stat-change ${high_priority_recs > 0 ? 'negative' : 'positive'}`}>
            {high_priority_recs} high priority
          </div>
        </div>

        {latest_weather && (
          <div className="stat-card">
            <div className="stat-icon"><Thermometer size={20} /></div>
            <div className="stat-value">{latest_weather.temperature_c}°C</div>
            <div className="stat-label">Temperature</div>
            <div className="stat-change neutral">
              Humidity {latest_weather.humidity_pct}%
            </div>
          </div>
        )}
      </div>

      {/* Main content grid */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Zone Health */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Zone Health Scores</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/health')}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="card-body">
            {zone_health.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">No health data yet</div>
                <div className="empty-state-desc">Run a crop analysis to generate health scores.</div>
              </div>
            ) : (
              zone_health.map((z) => (
                <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <HealthRing score={z.overall_score} size={56} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 2 }}>{z.zone_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{z.crop_type}</div>
                    <div style={{ marginTop: 4 }}>
                      <span className={`badge badge-${getRiskClass(z.risk_level)}`}>
                        {z.risk_level} Risk
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                    <div>Soil: <strong>{z.soil_score}</strong></div>
                    <div>Crop: <strong>{z.crop_score}</strong></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Radar chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Farm Performance Radar</span>
          </div>
          <div className="card-body">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E2EBF2" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#475569' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Radar name="Score" dataKey="value" stroke="#38BDF8" fill="#38BDF8" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip formatter={(v) => `${v}/100`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><div className="empty-state-desc">Run analyses to see radar chart.</div></div>
            )}
          </div>
        </div>
      </div>

      {/* Weather trend */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Temperature Trend (7 days)</span>
            {selectedFarm?.is_demo && <span className="badge badge-demo">Simulated</span>}
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weather_trend.map(w => ({
                  date: formatDate(w.recorded_at),
                  temp: w.temperature_c,
                  humidity: w.humidity_pct,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F7FB" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="temp" stroke="#38BDF8" fill="#E0F2FE" strokeWidth={2} name="Temp (°C)" />
                  <Area type="monotone" dataKey="humidity" stroke="#F59E0B" fill="#FFFBEB" strokeWidth={2} name="Humidity (%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Soil Moisture Trend</span>
            {selectedFarm?.is_demo && <span className="badge badge-demo">Simulated</span>}
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={soil_trend.map(s => ({
                  date: formatDate(s.recorded_at),
                  moisture: s.moisture_pct,
                  nitrogen: s.nitrogen_ppm,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F7FB" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="moisture" fill="#38BDF8" radius={[4, 4, 0, 0]} name="Moisture (%)" />
                  <Bar dataKey="nitrogen" fill="#0284C7" radius={[4, 4, 0, 0]} name="Nitrogen (ppm)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Disease Alerts & Quick actions */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Disease Alerts</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/analysis')}>
              Analyze <ArrowRight size={14} />
            </button>
          </div>
          <div className="card-body">
            {disease_alerts.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--success)', padding: '8px 0' }}>
                <CheckCircle size={20} />
                <span style={{ fontWeight: 500 }}>No disease alerts across all zones.</span>
              </div>
            ) : (
              disease_alerts.map((a, i) => (
                <div key={i} className="alert alert-warning" style={{ marginBottom: 8 }}>
                  <AlertTriangle size={16} className="alert-icon" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{a.zone_name}</div>
                    <div style={{ fontSize: 12 }}>{a.disease} — Confidence: {a.confidence?.toFixed(0)}%</div>
                    <div style={{ fontSize: 11.5, marginTop: 2, color: 'var(--text-muted)' }}>
                      ⚠️ Verify in field before treatment
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Quick Actions</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: Leaf, label: 'Manage Farm Zones', to: '/zones', color: 'success' },
              { icon: HeartPulse, label: 'View Health Scores', to: '/health', color: 'info' },
              { icon: TrendingUp, label: 'Run What-If Simulation', to: '/simulation', color: 'warning' },
              { icon: Sprout, label: 'Ask AI Assistant', to: '/assistant', color: 'info' },
            ].map(({ icon: Icon, label, to, color }) => (
              <button key={to} className="btn btn-outline" style={{ justifyContent: 'flex-start', gap: 10 }} onClick={() => navigate(to)}>
                <Icon size={16} />
                {label}
                <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
