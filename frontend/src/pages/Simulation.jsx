import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { Beaker, Play, Info, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { getZones, runSimulation, getSimulations } from '../api';

function SliderGroup({ label, value, onChange, min, max, step = 1, unit = '', description }) {
  return (
    <div className="sim-slider-group">
      <div className="sim-slider-header">
        <span className="sim-slider-label">{label}</span>
        <span className="sim-slider-value">
          {value > 0 ? '+' : ''}{value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
        <span>{min}{unit}</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{description}</span>
        <span>+{max}{unit}</span>
      </div>
    </div>
  );
}

function ResultCard({ result }) {
  const healthDiff = result.health_change;
  const healthColor = result.projected_health >= 80 ? '#10B981' : result.projected_health >= 65 ? '#F59E0B' : '#EF4444';
  const diffColor = healthDiff > 0 ? '#10B981' : healthDiff < 0 ? '#EF4444' : '#94A3B8';

  const barData = [
    { name: 'Baseline', value: result.baseline_health, fill: '#94A3B8' },
    { name: 'Projected', value: result.projected_health, fill: healthColor },
  ];

  const impactData = Object.entries(result.impact_breakdown || {}).map(([key, val]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: val,
    fill: val >= 0 ? '#10B981' : '#EF4444'
  }));

  return (
    <div>
      <div className="alert alert-demo" style={{ marginBottom: 16 }}>
        <AlertTriangle size={14} className="alert-icon" />
        {result.disclaimer}
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Health Score Projection</span></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Baseline</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#94A3B8' }}>{result.baseline_health}</div>
              </div>
              <div style={{ fontSize: 24, color: 'var(--text-muted)' }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Projected</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: healthColor }}>{result.projected_health}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Change</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: diffColor }}>
                  {healthDiff > 0 ? '↑' : healthDiff < 0 ? '↓' : '='} {Math.abs(healthDiff)}
                </div>
              </div>
            </div>
            <div className="chart-container" style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F7FB" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => `${v}/100`} />
                  <ReferenceLine y={80} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Good', fill: '#10B981', fontSize: 11 }} />
                  <ReferenceLine y={65} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Moderate', fill: '#F59E0B', fontSize: 11 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Impact Breakdown</span></div>
          <div className="card-body">
            <div className="chart-container" style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={impactData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F7FB" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="#E2EBF2" />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {impactData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header"><span className="card-title">Projected Conditions</span></div>
        <div className="card-body">
          <div className="form-row">
            {[
              { label: 'Soil Moisture', value: `${result.projected_moisture}%` },
              { label: 'Nitrogen', value: `${result.projected_nitrogen} ppm` },
              { label: 'Temperature', value: `${result.projected_temperature}°C` },
              { label: 'Yield Change', value: `${result.yield_change_pct > 0 ? '+' : ''}${result.yield_change_pct}%`, color: result.yield_change_pct >= 0 ? '#10B981' : '#EF4444' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: color || 'var(--text)', marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {result.notes?.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">Simulation Notes</span></div>
          <div className="card-body">
            {result.notes.map((n, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13.5 }}>
                <span>•</span><span>{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Simulation() {
  const { selectedFarmId } = useFarm();
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [params, setParams] = useState({
    irrigation_change_pct: 0,
    fertilizer_change_pct: 0,
    temperature_shift_c: 0,
    disease_treatment: false,
    scenario_name: 'My Scenario',
  });
  const [result, setResult] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('simulate');

  useEffect(() => {
    if (!selectedFarmId) return;
    getZones(selectedFarmId).then(zs => {
      setZones(zs);
      if (zs.length > 0) setSelectedZoneId(zs[0].id);
    });
  }, [selectedFarmId]);

  useEffect(() => {
    if (selectedZoneId) {
      getSimulations(selectedZoneId).then(setHistory).catch(() => {});
    }
  }, [selectedZoneId]);

  const handleRun = async () => {
    if (!selectedZoneId) return;
    setSimulating(true);
    setError(null);
    setResult(null);
    try {
      const res = await runSimulation(selectedZoneId, params);
      setResult(res);
      getSimulations(selectedZoneId).then(setHistory).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setSimulating(false);
    }
  };

  const presets = [
    { name: 'Optimal Irrigation', changes: { irrigation_change_pct: 20, fertilizer_change_pct: 0, temperature_shift_c: 0, disease_treatment: false } },
    { name: 'Drought Scenario', changes: { irrigation_change_pct: -50, fertilizer_change_pct: 0, temperature_shift_c: 5, disease_treatment: false } },
    { name: 'Disease Treatment', changes: { irrigation_change_pct: 0, fertilizer_change_pct: 0, temperature_shift_c: 0, disease_treatment: true } },
    { name: 'Full Optimization', changes: { irrigation_change_pct: 20, fertilizer_change_pct: 25, temperature_shift_c: 0, disease_treatment: true } },
  ];

  return (
    <div className="page-container">
      <div className="alert alert-warning" style={{ marginBottom: 16 }}>
        <AlertTriangle size={14} className="alert-icon" />
        <span>
          <strong>Simulation Estimates Only:</strong> Results are rule-based projections for planning purposes.
          They do not predict actual outcomes and should not replace professional agronomy advice.
        </span>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {[['simulate', '🧪 Run Simulation'], ['history', '📋 Simulation History']].map(([v, l]) => (
          <div key={v} className={`tab${activeTab === v ? ' active' : ''}`} onClick={() => setActiveTab(v)}>{l}</div>
        ))}
      </div>

      {activeTab === 'simulate' && (
        <div className="grid-2">
          {/* Controls */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">Scenario Setup</span></div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Select Zone</label>
                  <select className="form-select" value={selectedZoneId || ''}
                    onChange={e => setSelectedZoneId(Number(e.target.value))}>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Scenario Name</label>
                  <input className="form-input" value={params.scenario_name}
                    onChange={e => setParams(p => ({ ...p, scenario_name: e.target.value }))}
                    placeholder="e.g. Drought Response" />
                </div>

                {/* Presets */}
                <div style={{ marginBottom: 12 }}>
                  <div className="form-label">Quick Presets</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {presets.map(p => (
                      <button key={p.name} className="btn btn-ghost btn-sm"
                        onClick={() => setParams(prev => ({ ...prev, ...p.changes, scenario_name: p.name }))}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">Scenario Parameters</span></div>
              <div className="card-body">
                <SliderGroup
                  label="Irrigation Change"
                  value={params.irrigation_change_pct}
                  onChange={v => setParams(p => ({ ...p, irrigation_change_pct: v }))}
                  min={-50} max={50} unit="%" description="Water input change"
                />
                <SliderGroup
                  label="Fertilizer Change"
                  value={params.fertilizer_change_pct}
                  onChange={v => setParams(p => ({ ...p, fertilizer_change_pct: v }))}
                  min={-50} max={100} unit="%" description="Nitrogen input change"
                />
                <SliderGroup
                  label="Temperature Shift"
                  value={params.temperature_shift_c}
                  onChange={v => setParams(p => ({ ...p, temperature_shift_c: v }))}
                  min={-10} max={15} unit="°C" description="Ambient temp change"
                />

                {/* Disease treatment toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Apply Disease Treatment</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Assume effective intervention</div>
                  </div>
                  <div
                    onClick={() => setParams(p => ({ ...p, disease_treatment: !p.disease_treatment }))}
                    style={{
                      width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                      background: params.disease_treatment ? 'var(--primary)' : 'var(--border)',
                      position: 'relative', transition: 'background 0.2s'
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: params.disease_treatment ? 22 : 3,
                      width: 18, height: 18, borderRadius: 9, background: 'white',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="alert alert-danger"><AlertTriangle size={14} />{error}</div>}

            <button className="btn btn-primary w-full btn-lg" onClick={handleRun} disabled={simulating || !selectedZoneId}>
              {simulating ? <><div className="spinner spinner-sm" />Running Simulation…</> : <><Play size={18} />Run Simulation</>}
            </button>
          </div>

          {/* Results */}
          <div>
            {simulating && (
              <div className="card"><div className="card-body">
                <div className="loading-overlay"><div className="spinner" /><span>Computing scenario…</span></div>
              </div></div>
            )}
            {!simulating && result && <ResultCard result={result} />}
            {!simulating && !result && (
              <div className="card"><div className="card-body">
                <div className="empty-state">
                  <div className="empty-state-icon"><Beaker size={28} /></div>
                  <div className="empty-state-title">Configure Your Scenario</div>
                  <div className="empty-state-desc">
                    Adjust the sliders to set up a what-if scenario, then click "Run Simulation" to see projected outcomes.
                    <br /><br />
                    <strong>Example scenarios:</strong><br />
                    • What if we increase irrigation by 20%?<br />
                    • What happens during a drought (−50% water)?<br />
                    • How much does disease treatment help?
                  </div>
                </div>
              </div></div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {history.length === 0 ? (
            <div className="card"><div className="card-body">
              <div className="empty-state">
                <div className="empty-state-title">No Simulations Yet</div>
                <div className="empty-state-desc">Run your first simulation to see results here.</div>
              </div>
            </div></div>
          ) : (
            <div>
              {history.map(sim => (
                <div key={sim.id} className="card" style={{ marginBottom: 12, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{sim.scenario_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(sim.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                    {sim.results && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Health Change</div>
                        <div style={{ fontWeight: 700, color: sim.results.health_change >= 0 ? '#10B981' : '#EF4444', fontSize: 18 }}>
                          {sim.results.health_change > 0 ? '+' : ''}{sim.results.health_change}
                        </div>
                      </div>
                    )}
                  </div>
                  {sim.results && (
                    <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                      <span>Baseline: <strong>{sim.results.baseline_health}</strong></span>
                      <span>Projected: <strong>{sim.results.projected_health}</strong></span>
                      <span>Yield: <strong style={{ color: sim.results.yield_change_pct >= 0 ? '#10B981' : '#EF4444' }}>
                        {sim.results.yield_change_pct > 0 ? '+' : ''}{sim.results.yield_change_pct}%
                      </strong></span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
