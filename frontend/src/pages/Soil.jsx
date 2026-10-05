import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FlaskConical, Plus, Info, ChevronDown } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { getZones, getSoil, addSoil } from '../api';

const formatDate = (str) => {
  try { return new Date(str).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }); }
  catch { return str; }
};

const getNutrientStatus = (value, optimal_low, optimal_high) => {
  if (value === null || value === undefined) return { label: 'N/A', cls: 'badge-neutral' };
  if (value < optimal_low) return { label: 'Low', cls: 'badge-danger' };
  if (value > optimal_high) return { label: 'High', cls: 'badge-warning' };
  return { label: 'Optimal', cls: 'badge-success' };
};

const OPTIMAL = {
  ph: [6.0, 7.0],
  nitrogen_ppm: [120, 250],
  phosphorus_ppm: [30, 60],
  potassium_ppm: [150, 300],
  moisture_pct: [60, 80],
  organic_matter_pct: [2.5, 5.0],
};

function AddSoilForm({ zoneId, onSaved, onCancel }) {
  const [form, setForm] = useState({
    ph: '', nitrogen_ppm: '', phosphorus_ppm: '',
    potassium_ppm: '', moisture_pct: '', organic_matter_pct: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === '' ? null : parseFloat(v)])
      );
      const saved = await addSoil(zoneId, payload);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'ph', label: 'pH', placeholder: '6.5', hint: 'Optimal: 6.0–7.0' },
    { key: 'nitrogen_ppm', label: 'Nitrogen (ppm)', placeholder: '150', hint: 'Optimal: 120–250 ppm' },
    { key: 'phosphorus_ppm', label: 'Phosphorus (ppm)', placeholder: '40', hint: 'Optimal: 30–60 ppm' },
    { key: 'potassium_ppm', label: 'Potassium (ppm)', placeholder: '200', hint: 'Optimal: 150–300 ppm' },
    { key: 'moisture_pct', label: 'Moisture (%)', placeholder: '65', hint: 'Optimal: 60–80%' },
    { key: 'organic_matter_pct', label: 'Organic Matter (%)', placeholder: '3.0', hint: 'Optimal: 2.5–5%' },
  ];

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <span className="card-title">Add Soil Reading</span>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
      <form onSubmit={handleSubmit} className="card-body">
        {error && <div className="alert alert-danger"><Info size={14} />{error}</div>}
        <div className="form-row">
          {fields.map(f => (
            <div className="form-group" key={f.key}>
              <label className="form-label">{f.label}</label>
              <input className="form-input" type="number" step="0.01"
                value={form[f.key]} placeholder={f.placeholder}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              <div className="form-hint">{f.hint}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><div className="spinner spinner-sm" />Saving…</> : 'Save Reading'}
          </button>
        </div>
      </form>
    </div>
  );
}

function NutrientBar({ label, value, optLow, optHigh, unit }) {
  const max = optHigh * 1.5;
  const pct = Math.min(100, (value / max) * 100);
  const status = getNutrientStatus(value, optLow, optHigh);
  const barColor = status.label === 'Optimal' ? '#10B981' : status.label === 'Low' ? '#EF4444' : '#F59E0B';

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{value?.toFixed?.(1) ?? 'N/A'} {unit}</span>
          <span className={`badge ${status.cls}`}>{status.label}</span>
        </div>
      </div>
      <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Optimal: {optLow}–{optHigh} {unit}</div>
    </div>
  );
}

export default function Soil() {
  const { selectedFarmId, selectedFarm } = useFarm();
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedFarmId) return;
    getZones(selectedFarmId).then(zs => {
      setZones(zs);
      if (zs.length > 0) setSelectedZoneId(zs[0].id);
    });
  }, [selectedFarmId]);

  useEffect(() => {
    if (!selectedZoneId) return;
    setLoading(true);
    getSoil(selectedZoneId)
      .then(data => setReadings(data.reverse()))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedZoneId]);

  const latest = readings.length > 0 ? readings[readings.length - 1] : null;
  const chartData = readings.map(r => ({
    date: formatDate(r.recorded_at),
    ph: r.ph, moisture: r.moisture_pct,
    nitrogen: r.nitrogen_ppm, potassium: r.potassium_ppm,
  }));

  const selectedZone = zones.find(z => z.id === selectedZoneId);

  return (
    <div className="page-container">
      {selectedFarm?.is_demo && (
        <div className="disclaimer-banner">
          <Info size={14} />
          <strong>Demo Data:</strong>&nbsp;Soil readings are simulated. Use "Add Reading" to input real sensor values.
        </div>
      )}
      {error && <div className="alert alert-danger"><Info size={14} />{error}</div>}

      {/* Zone selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="form-label">Select Zone</label>
          <select className="form-select" value={selectedZoneId || ''} onChange={e => setSelectedZoneId(Number(e.target.value))}>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name} – {z.crop_type}</option>)}
          </select>
        </div>
        {!showForm && (
          <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Reading
          </button>
        )}
      </div>

      {showForm && (
        <AddSoilForm
          zoneId={selectedZoneId}
          onSaved={(r) => { setReadings(p => [...p, r]); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <div className="loading-overlay"><div className="spinner" /><span>Loading soil data…</span></div>
      ) : (
        <>
          {/* Nutrient status bars */}
          {latest && (
            <div className="grid-2" style={{ marginBottom: 20 }}>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Current Nutrient Status</span>
                  {latest.is_simulated ? <span className="badge badge-demo">Simulated</span> : <span className="badge badge-success">Manual</span>}
                </div>
                <div className="card-body">
                  <NutrientBar label="pH" value={latest.ph} optLow={6.0} optHigh={7.0} unit="" />
                  <NutrientBar label="Nitrogen" value={latest.nitrogen_ppm} optLow={120} optHigh={250} unit="ppm" />
                  <NutrientBar label="Phosphorus" value={latest.phosphorus_ppm} optLow={30} optHigh={60} unit="ppm" />
                  <NutrientBar label="Potassium" value={latest.potassium_ppm} optLow={150} optHigh={300} unit="ppm" />
                  <NutrientBar label="Moisture" value={latest.moisture_pct} optLow={60} optHigh={80} unit="%" />
                  <NutrientBar label="Organic Matter" value={latest.organic_matter_pct} optLow={2.5} optHigh={5.0} unit="%" />
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">Soil Summary</span>
                </div>
                <div className="card-body">
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Zone</div>
                    <div style={{ fontWeight: 600 }}>{selectedZone?.name}</div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Soil Type</div>
                    <div style={{ fontWeight: 600 }}>{selectedZone?.soil_type || 'Not specified'}</div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Crop</div>
                    <div style={{ fontWeight: 600 }}>{selectedZone?.crop_type || 'Not specified'}</div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Last Updated</div>
                    <div style={{ fontWeight: 600 }}>{new Date(latest.recorded_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Readings Available</div>
                    <div style={{ fontWeight: 600 }}>{readings.length} data point{readings.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trend charts */}
          {readings.length > 1 && (
            <div className="grid-2" style={{ marginBottom: 20 }}>
              <div className="card">
                <div className="card-header"><span className="card-title">Moisture & pH Trend</span></div>
                <div className="card-body">
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F7FB" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="moisture" stroke="#38BDF8" strokeWidth={2} dot={false} name="Moisture (%)" />
                        <Line type="monotone" dataKey="ph" stroke="#10B981" strokeWidth={2} dot={false} name="pH" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><span className="card-title">Nitrogen & Potassium Trend</span></div>
                <div className="card-body">
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F7FB" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="nitrogen" stroke="#0284C7" strokeWidth={2} dot={false} name="Nitrogen (ppm)" />
                        <Line type="monotone" dataKey="potassium" stroke="#F59E0B" strokeWidth={2} dot={false} name="Potassium (ppm)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History table */}
          <div className="card">
            <div className="card-header"><span className="card-title">Reading History</span></div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th><th>pH</th><th>N (ppm)</th><th>P (ppm)</th>
                    <th>K (ppm)</th><th>Moisture (%)</th><th>OM (%)</th><th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.slice().reverse().slice(0, 14).map(r => (
                    <tr key={r.id}>
                      <td>{formatDate(r.recorded_at)}</td>
                      <td>{r.ph?.toFixed(1)}</td>
                      <td>{r.nitrogen_ppm?.toFixed(0)}</td>
                      <td>{r.phosphorus_ppm?.toFixed(0)}</td>
                      <td>{r.potassium_ppm?.toFixed(0)}</td>
                      <td>{r.moisture_pct?.toFixed(1)}</td>
                      <td>{r.organic_matter_pct?.toFixed(2)}</td>
                      <td>{r.is_simulated ? <span className="badge badge-demo">Simulated</span> : <span className="badge badge-success">Manual</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && readings.length === 0 && (
        <div className="card"><div className="card-body">
          <div className="empty-state">
            <div className="empty-state-icon"><FlaskConical size={28} /></div>
            <div className="empty-state-title">No Soil Readings</div>
            <div className="empty-state-desc">Add your first soil reading to start monitoring nutrients.</div>
          </div>
        </div></div>
      )}
    </div>
  );
}
