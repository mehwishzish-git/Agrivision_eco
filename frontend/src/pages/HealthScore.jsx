import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend, LineChart, Line
} from 'recharts';
import { HeartPulse, AlertTriangle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { getFarmHealth, getZones, analyzeZone } from '../api';

const getRiskColor = (level) => {
  return { Low: '#10B981', Medium: '#F59E0B', High: '#EF4444', Critical: '#7C3AED' }[level] || '#94A3B8';
};

const getRiskBadge = (level) => {
  const cls = { Low: 'badge-success', Medium: 'badge-warning', High: 'badge-danger', Critical: 'badge-danger' }[level] || 'badge-neutral';
  return <span className={`badge ${cls}`}>{level}</span>;
};

function HealthDonut({ score, size = 100, label }) {
  const radius = (size - 12) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score || 0));
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? '#10B981' : pct >= 65 ? '#F59E0B' : pct >= 45 ? '#EF4444' : '#7C3AED';

  return (
    <div style={{ textAlign: 'center' }}>
      <div className="health-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E2EBF2" strokeWidth={10} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={10}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div className="health-ring-label">
          <div className="health-ring-value" style={{ color, fontSize: size * 0.2 }}>{score ?? '—'}</div>
          <div className="health-ring-unit">/100</div>
        </div>
      </div>
      {label && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{label}</div>}
    </div>
  );
}

export default function HealthScore() {
  const { selectedFarmId } = useFarm();
  const [healthData, setHealthData] = useState(null);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    if (!selectedFarmId) return;
    setLoading(true);
    setError(null);
    try {
      const [health, zs] = await Promise.all([
        getFarmHealth(selectedFarmId),
        getZones(selectedFarmId)
      ]);
      setHealthData(health);
      setZones(zs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedFarmId]);

  const reanalyzeAll = async () => {
    setReanalyzing(true);
    try {
      for (const z of zones) {
        await analyzeZone(z.id, new FormData());
      }
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) return <div className="page-container"><div className="loading-overlay"><div className="spinner" /><span>Loading health scores…</span></div></div>;

  const zoneHealth = healthData?.zones || [];
  const farmAvg = healthData?.farm_average || 0;

  // Chart data
  const barData = zoneHealth.map(z => ({
    name: z.zone_name?.split(' - ')[0] || z.zone_name,
    overall: z.overall_score,
    soil: z.soil_score,
    crop: z.crop_score,
    weather: z.weather_score,
  }));

  const radarData = zoneHealth.length > 0 ? [
    { subject: 'Soil', value: Math.round(zoneHealth.reduce((s, z) => s + (z.soil_score || 0), 0) / zoneHealth.length) },
    { subject: 'Crop Health', value: Math.round(zoneHealth.reduce((s, z) => s + (z.crop_score || 0), 0) / zoneHealth.length) },
    { subject: 'Weather', value: Math.round(zoneHealth.reduce((s, z) => s + (z.weather_score || 0), 0) / zoneHealth.length) },
    { subject: 'Overall', value: farmAvg },
  ] : [];

  const alerts = zoneHealth.filter(z => z.risk_level === 'High' || z.risk_level === 'Critical');

  return (
    <div className="page-container">
      {error && <div className="alert alert-danger"><Info size={14} />{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-outline" onClick={reanalyzeAll} disabled={reanalyzing}>
          {reanalyzing ? <><div className="spinner spinner-sm" />Reanalyzing…</> : <><RefreshCw size={14} />Refresh All Scores</>}
        </button>
      </div>

      {/* Farm overview */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
          <HealthDonut score={farmAvg} size={90} />
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Farm Average Score</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{farmAvg}/100</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {farmAvg >= 80 ? '✓ Farm is in good health' : farmAvg >= 65 ? '⚠ Moderate – some zones need attention' : '✗ Farm needs attention'}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Zone Summary</div>
          {zoneHealth.map(z => (
            <div key={z.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{z.zone_name}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: z.overall_score >= 80 ? '#10B981' : z.overall_score >= 65 ? '#F59E0B' : '#EF4444', fontSize: 14 }}>
                  {z.overall_score}
                </span>
                {getRiskBadge(z.risk_level)}
              </div>
            </div>
          ))}
        </div>

        {alerts.length > 0 && (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', marginBottom: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
              <AlertTriangle size={16} /> High Risk Zones
            </div>
            {alerts.map(z => (
              <div key={z.id} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{z.zone_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{z.crop_type}</div>
                {Array.isArray(z.risk_factors) && z.risk_factors.slice(0, 2).map((f, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--danger)', marginTop: 2 }}>↳ {f}</div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Score Breakdown by Zone</span></div>
          <div className="card-body">
            <div className="chart-container tall">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F7FB" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="soil" fill="#38BDF8" name="Soil" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="crop" fill="#10B981" name="Crop" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="weather" fill="#F59E0B" name="Weather" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Farm Performance Radar</span></div>
          <div className="card-body">
            <div className="chart-container tall">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E2EBF2" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#475569' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Radar name="Farm Score" dataKey="value" stroke="#38BDF8" fill="#38BDF8" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip formatter={(v) => `${v}/100`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Zone Detail Cards */}
      <div className="section-title"><HeartPulse size={18} /> Zone Health Details</div>
      <div className="zone-grid">
        {zoneHealth.map(z => (
          <div key={z.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <HealthDonut score={z.overall_score} size={64} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{z.zone_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{z.crop_type}</div>
                <div style={{ marginTop: 4 }}>{getRiskBadge(z.risk_level)}</div>
              </div>
            </div>

            {/* Sub-scores */}
            {[
              { label: 'Soil', value: z.soil_score, color: '#38BDF8' },
              { label: 'Crop', value: z.crop_score, color: '#10B981' },
              { label: 'Weather', value: z.weather_score, color: '#F59E0B' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <strong>{value}</strong>
                </div>
                <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}>
                  <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 3 }} />
                </div>
              </div>
            ))}

            {/* Risk factors */}
            {Array.isArray(z.risk_factors) && z.risk_factors.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Risk Factors</div>
                {z.risk_factors.slice(0, 3).map((f, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>
                    {z.risk_level === 'High' ? '⚠' : '•'} {f}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {zoneHealth.length === 0 && (
        <div className="card"><div className="card-body">
          <div className="empty-state">
            <div className="empty-state-icon"><HeartPulse size={28} /></div>
            <div className="empty-state-title">No Health Scores Yet</div>
            <div className="empty-state-desc">Run a crop analysis to generate health scores for your zones.</div>
          </div>
        </div></div>
      )}
    </div>
  );
}
