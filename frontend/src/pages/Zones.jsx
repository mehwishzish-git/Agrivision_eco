import { useEffect, useState } from 'react';
import { Plus, Leaf, MoreVertical, Edit2, Check, X, Info } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { getZones, createZone, updateZone } from '../api';

const CROP_TYPES = ['Wheat', 'Rice', 'Mango', 'Cotton', 'Sugarcane', 'Soybean',
  'Corn/Maize', 'Tomato', 'Potato', 'Mixed Vegetables', 'Groundnut', 'Sunflower', 'Other'];
const GROWTH_STAGES = ['Germination', 'Seedling', 'Vegetative', 'Tillering', 'Heading',
  'Flowering', 'Grain Fill', 'Maturity', 'Harvest', 'Post-Harvest'];
const SOIL_TYPES = ['Loamy', 'Clayey', 'Sandy', 'Sandy Loam', 'Silt Loam', 'Clay Loam', 'Black Cotton', 'Red Laterite'];
const IRRIGATION_TYPES = ['Drip', 'Flood', 'Sprinkler', 'Furrow', 'Rain-fed', 'Canal', 'Borewell'];

const getScoreColor = (score) => {
  if (!score) return '#94A3B8';
  if (score >= 80) return '#10B981';
  if (score >= 65) return '#F59E0B';
  return '#EF4444';
};

const getRiskBadgeClass = (level) => {
  const map = { Low: 'badge-success', Medium: 'badge-warning', High: 'badge-danger', Critical: 'badge-danger' };
  return map[level] || 'badge-neutral';
};

function ZoneForm({ farmId, zone, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: zone?.name || '',
    area_ha: zone?.area_ha || '',
    crop_type: zone?.crop_type || '',
    growth_stage: zone?.growth_stage || '',
    soil_type: zone?.soil_type || '',
    irrigation_type: zone?.irrigation_type || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Zone name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      let saved;
      if (zone) {
        saved = await updateZone(zone.id, form);
      } else {
        saved = await createZone(farmId, form);
      }
      onSave(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <span className="card-title">{zone ? 'Edit Zone' : 'Add New Zone'}</span>
        <button className="btn btn-ghost btn-icon" onClick={onCancel}><X size={16} /></button>
      </div>
      <form onSubmit={handleSubmit} className="card-body">
        {error && <div className="alert alert-danger" style={{ marginBottom: 14 }}><Info size={14} />{error}</div>}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Zone Name *</label>
            <input className="form-input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. North Field" required />
          </div>
          <div className="form-group">
            <label className="form-label">Area (hectares)</label>
            <input className="form-input" type="number" step="0.1" min="0"
              value={form.area_ha} onChange={e => setForm(f => ({ ...f, area_ha: e.target.value }))}
              placeholder="0.0" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Crop Type</label>
            <select className="form-select" value={form.crop_type}
              onChange={e => setForm(f => ({ ...f, crop_type: e.target.value }))}>
              <option value="">Select crop…</option>
              {CROP_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Growth Stage</label>
            <select className="form-select" value={form.growth_stage}
              onChange={e => setForm(f => ({ ...f, growth_stage: e.target.value }))}>
              <option value="">Select stage…</option>
              {GROWTH_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Soil Type</label>
            <select className="form-select" value={form.soil_type}
              onChange={e => setForm(f => ({ ...f, soil_type: e.target.value }))}>
              <option value="">Select soil…</option>
              {SOIL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Irrigation Type</label>
            <select className="form-select" value={form.irrigation_type}
              onChange={e => setForm(f => ({ ...f, irrigation_type: e.target.value }))}>
              <option value="">Select irrigation…</option>
              {IRRIGATION_TYPES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><div className="spinner spinner-sm" /> Saving…</> : <><Check size={14} /> {zone ? 'Update Zone' : 'Add Zone'}</>}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Zones() {
  const { selectedFarmId } = useFarm();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState(null);

  const loadZones = async () => {
    if (!selectedFarmId) return;
    setLoading(true);
    try {
      const data = await getZones(selectedFarmId);
      setZones(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadZones(); }, [selectedFarmId]);

  const handleSave = (saved) => {
    setZones(prev => {
      const idx = prev.findIndex(z => z.id === saved.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [saved, ...prev];
    });
    setShowForm(false);
    setEditingZone(null);
  };

  if (loading) return <div className="page-container"><div className="loading-overlay"><div className="spinner" /><span>Loading zones…</span></div></div>;

  return (
    <div className="page-container">
      {error && <div className="alert alert-danger"><Info size={14} />{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {zones.length} zone{zones.length !== 1 ? 's' : ''} configured
          </div>
        </div>
        {!showForm && !editingZone && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Zone
          </button>
        )}
      </div>

      {(showForm && !editingZone) && (
        <ZoneForm
          farmId={selectedFarmId}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingZone && (
        <ZoneForm
          farmId={selectedFarmId}
          zone={editingZone}
          onSave={handleSave}
          onCancel={() => setEditingZone(null)}
        />
      )}

      {zones.length === 0 && !showForm ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon"><Leaf size={28} /></div>
              <div className="empty-state-title">No Zones Yet</div>
              <div className="empty-state-desc">Add your first zone to start monitoring crops.</div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>
                <Plus size={16} /> Add First Zone
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="zone-grid">
          {zones.map(zone => {
            const health = zone.latest_health;
            const soil = zone.latest_soil;
            const analysis = zone.latest_analysis;
            return (
              <div key={zone.id} className="zone-card">
                <div className="zone-card-header">
                  <div>
                    <div className="zone-card-name">{zone.name}</div>
                    <div className="zone-card-crop">
                      {zone.crop_type || '–'} · {zone.area_ha ? `${zone.area_ha} ha` : 'Area N/A'}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditingZone(zone)}>
                    <Edit2 size={14} />
                  </button>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {zone.growth_stage && <span className="badge badge-info">{zone.growth_stage}</span>}
                  {zone.irrigation_type && <span className="badge badge-neutral">{zone.irrigation_type}</span>}
                  {health && <span className={`badge ${getRiskBadgeClass(health.risk_level)}`}>{health.risk_level} Risk</span>}
                </div>

                {/* Metrics */}
                <div className="zone-metrics">
                  <div className="zone-metric">
                    <div className="zone-metric-val" style={{ color: getScoreColor(health?.overall_score) }}>
                      {health?.overall_score ?? '—'}
                    </div>
                    <div className="zone-metric-key">Health</div>
                  </div>
                  <div className="zone-metric">
                    <div className="zone-metric-val">{soil?.moisture_pct?.toFixed(0) ?? '—'}<span style={{ fontSize: 10 }}>%</span></div>
                    <div className="zone-metric-key">Moisture</div>
                  </div>
                  <div className="zone-metric">
                    <div className="zone-metric-val">{soil?.ph?.toFixed(1) ?? '—'}</div>
                    <div className="zone-metric-key">pH</div>
                  </div>
                </div>

                {/* Disease status */}
                {analysis && (
                  <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--bg)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 2 }}>Last Analysis</div>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: analysis.disease_detected === 'None Detected' ? 'var(--success)' : 'var(--warning)' }}>
                      {analysis.disease_detected === 'None Detected' ? '✓ No disease detected' : `⚠ ${analysis.disease_detected}`}
                    </div>
                  </div>
                )}

                {zone.soil_type && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>
                    🪨 {zone.soil_type}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
