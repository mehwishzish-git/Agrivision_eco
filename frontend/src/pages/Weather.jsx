import { useEffect, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { CloudSun, Thermometer, Droplets, Wind, Sun, Plus, Info } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { getWeather, addWeather } from '../api';

const formatDate = (str) => {
  try { return new Date(str).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }); }
  catch { return str; }
};

function AddWeatherForm({ farmId, onSaved, onCancel }) {
  const [form, setForm] = useState({
    temperature_c: '', humidity_pct: '', rainfall_mm: '',
    wind_speed_kmh: '', solar_radiation: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await addWeather(farmId, {
        temperature_c: parseFloat(form.temperature_c) || null,
        humidity_pct: parseFloat(form.humidity_pct) || null,
        rainfall_mm: parseFloat(form.rainfall_mm) || 0,
        wind_speed_kmh: parseFloat(form.wind_speed_kmh) || null,
        solar_radiation: parseFloat(form.solar_radiation) || null,
      });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'temperature_c', label: 'Temperature (°C)', placeholder: '28.5' },
    { key: 'humidity_pct', label: 'Humidity (%)', placeholder: '65' },
    { key: 'rainfall_mm', label: 'Rainfall (mm)', placeholder: '0' },
    { key: 'wind_speed_kmh', label: 'Wind Speed (km/h)', placeholder: '12' },
    { key: 'solar_radiation', label: 'Solar Radiation (MJ/m²)', placeholder: '18' },
  ];

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <span className="card-title">Add Weather Reading</span>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
      <form onSubmit={handleSubmit} className="card-body">
        {error && <div className="alert alert-danger"><Info size={14} />{error}</div>}
        <div className="form-row">
          {fields.map(f => (
            <div className="form-group" key={f.key}>
              <label className="form-label">{f.label}</label>
              <input className="form-input" type="number" step="0.1"
                value={form[f.key]} placeholder={f.placeholder}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><div className="spinner spinner-sm" /> Saving…</> : 'Save Reading'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Weather() {
  const { selectedFarmId, selectedFarm } = useFarm();
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedFarmId) return;
    setLoading(true);
    getWeather(selectedFarmId)
      .then(data => { setReadings([...(data || [])].reverse()); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedFarmId]);

  const latest = readings.length > 0 ? readings[readings.length - 1] : null;
  const chartData = readings.map(r => ({
    date: formatDate(r.recorded_at),
    temp: r.temperature_c,
    humidity: r.humidity_pct,
    rainfall: r.rainfall_mm,
    wind: r.wind_speed_kmh,
    solar: r.solar_radiation,
  }));

  if (loading) return <div className="page-container"><div className="loading-overlay"><div className="spinner" /><span>Loading weather…</span></div></div>;

  return (
    <div className="page-container">
      {selectedFarm?.is_demo && (
        <div className="disclaimer-banner">
          <Info size={14} />
          <strong>Demo Data:</strong>&nbsp;Weather readings shown are simulated for demonstration. Not real sensor data.
        </div>
      )}
      {error && <div className="alert alert-danger"><Info size={14} />{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Reading
          </button>
        )}
      </div>

      {showForm && (
        <AddWeatherForm
          farmId={selectedFarmId}
          onSaved={(r) => { setReadings(p => [...p, r]); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Current conditions */}
      {latest && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { icon: Thermometer, label: 'Temperature', value: `${latest.temperature_c}°C`, color: 'info',
              sub: latest.temperature_c > 38 ? '⚠ Heat stress risk' : latest.temperature_c < 15 ? '⚠ Cold stress risk' : '✓ Normal range' },
            { icon: Droplets, label: 'Humidity', value: `${latest.humidity_pct}%`, color: 'info',
              sub: latest.humidity_pct > 85 ? '⚠ High – disease risk' : latest.humidity_pct < 30 ? '⚠ Very dry' : '✓ Normal range' },
            { icon: CloudSun, label: 'Rainfall', value: `${latest.rainfall_mm} mm`, color: '',
              sub: 'Last recorded' },
            { icon: Wind, label: 'Wind Speed', value: `${latest.wind_speed_kmh} km/h`, color: '',
              sub: '' },
            { icon: Sun, label: 'Solar Radiation', value: `${latest.solar_radiation} MJ/m²`, color: '',
              sub: '' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className={`stat-icon${s.color ? ' ' + s.color : ''}`}><s.icon size={20} /></div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              {s.sub && <div className={`stat-change ${s.sub.startsWith('⚠') ? 'negative' : s.sub.startsWith('✓') ? 'positive' : 'neutral'}`}>{s.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Temperature & Humidity Trend</span>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F7FB" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="temp" stroke="#38BDF8" strokeWidth={2} dot={false} name="Temp (°C)" />
                  <Line type="monotone" dataKey="humidity" stroke="#F59E0B" strokeWidth={2} dot={false} name="Humidity (%)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Rainfall (mm)</span>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F7FB" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="rainfall" fill="#0284C7" radius={[4, 4, 0, 0]} name="Rainfall (mm)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Weather History</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Temp (°C)</th><th>Humidity (%)</th>
                <th>Rainfall (mm)</th><th>Wind (km/h)</th><th>Solar (MJ/m²)</th><th>Source</th>
              </tr>
            </thead>
            <tbody>
              {readings.slice().reverse().slice(0, 14).map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.recorded_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</td>
                  <td>{r.temperature_c}</td>
                  <td>{r.humidity_pct}</td>
                  <td>{r.rainfall_mm}</td>
                  <td>{r.wind_speed_kmh}</td>
                  <td>{r.solar_radiation}</td>
                  <td>{r.is_simulated ? <span className="badge badge-demo">Simulated</span> : <span className="badge badge-success">Manual</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
