import { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, Info, Star, Filter, ArrowRight } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { getRecommendations, updateRecStatus } from '../api';

const PRIORITY_ORDER = { High: 1, Medium: 2, Low: 3 };
const CATEGORY_ICONS = {
  Disease: '🦠', Irrigation: '💧', Nutrition: '🌿', Soil: '🪨',
  Weather: '🌡️', General: '📋', Default: '📌'
};

function RecCard({ rec, onStatusChange }) {
  const [updating, setUpdating] = useState(false);
  const icon = CATEGORY_ICONS[rec.category] || CATEGORY_ICONS.Default;

  const handleMark = async (status) => {
    setUpdating(true);
    try {
      await updateRecStatus(rec.id, status);
      onStatusChange(rec.id, status);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={`rec-card priority-${rec.priority}`}>
      <div className="rec-header">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <div>
            <div className="rec-title">{rec.title}</div>
            <div className="rec-meta">
              {rec.zone_name && <span>Zone: <strong>{rec.zone_name}</strong> · </span>}
              <span>Category: <strong>{rec.category}</strong></span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 'none', alignItems: 'center' }}>
          <span className={`badge badge-${rec.priority === 'High' ? 'danger' : rec.priority === 'Medium' ? 'warning' : 'success'}`}>
            {rec.priority}
          </span>
          {rec.status !== 'done' && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => handleMark('done')}
              disabled={updating}
              title="Mark as done"
            >
              {updating ? <div className="spinner spinner-sm" /> : <CheckCircle size={14} />}
            </button>
          )}
          {rec.status !== 'dismissed' && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => handleMark('dismissed')}
              disabled={updating}
              title="Dismiss"
            >
              {updating ? '' : '✕'}
            </button>
          )}
        </div>
      </div>

      <div className="rec-meta" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {rec.description}
      </div>

      <div className="rec-action">
        <strong>Action:</strong> {rec.action}
      </div>

      {rec.estimated_impact && (
        <div className="rec-impact">
          <Star size={12} />
          <span>Expected Impact: {rec.estimated_impact}</span>
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
        ⚠️ Consult a qualified agronomist before applying any chemical treatments.
      </div>
    </div>
  );
}

export default function Recommendations() {
  const { selectedFarmId } = useFarm();
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [priorityFilter, setPriorityFilter] = useState('All');

  useEffect(() => {
    if (!selectedFarmId) return;
    setLoading(true);
    getRecommendations(selectedFarmId)
      .then(setRecs)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedFarmId]);

  const handleStatusChange = (id, status) => {
    setRecs(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const filtered = recs.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (priorityFilter !== 'All' && r.priority !== priorityFilter) return false;
    return true;
  });

  const counts = {
    pending: recs.filter(r => r.status === 'pending').length,
    done: recs.filter(r => r.status === 'done').length,
    dismissed: recs.filter(r => r.status === 'dismissed').length,
  };

  if (loading) return <div className="page-container"><div className="loading-overlay"><div className="spinner" /><span>Loading recommendations…</span></div></div>;

  return (
    <div className="page-container">
      {error && <div className="alert alert-danger"><Info size={14} />{error}</div>}

      {/* Summary cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card danger">
          <div className="stat-icon danger"><AlertTriangle size={20} /></div>
          <div className="stat-value">{recs.filter(r => r.priority === 'High' && r.status === 'pending').length}</div>
          <div className="stat-label">High Priority</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon warning"><Info size={20} /></div>
          <div className="stat-value">{recs.filter(r => r.priority === 'Medium' && r.status === 'pending').length}</div>
          <div className="stat-label">Medium Priority</div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon success"><CheckCircle size={20} /></div>
          <div className="stat-value">{counts.done}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="tabs" style={{ marginBottom: 0, flex: 'none' }}>
          {[['pending', `Pending (${counts.pending})`], ['done', `Done (${counts.done})`], ['dismissed', 'Dismissed'], ['all', 'All']].map(([v, l]) => (
            <div key={v} className={`tab${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>{l}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          {['All', 'High', 'Medium', 'Low'].map(p => (
            <button key={p} className={`btn btn-ghost btn-sm${priorityFilter === p ? ' btn-outline' : ''}`}
              onClick={() => setPriorityFilter(p)}>{p}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card"><div className="card-body">
          <div className="empty-state">
            <div className="empty-state-icon"><Star size={28} /></div>
            <div className="empty-state-title">No Recommendations</div>
            <div className="empty-state-desc">
              {filter === 'pending'
                ? 'All caught up! No pending recommendations. Run a crop analysis to generate new ones.'
                : 'No recommendations match the current filter.'}
            </div>
          </div>
        </div></div>
      ) : (
        filtered.map(rec => (
          <RecCard key={rec.id} rec={rec} onStatusChange={handleStatusChange} />
        ))
      )}

      <div className="alert alert-info" style={{ marginTop: 16 }}>
        <Info size={14} className="alert-icon" />
        <span>
          These recommendations are generated by a rule-based demo system. Always consult a qualified agronomist
          before implementing any treatment or changing farm practices.
        </span>
      </div>
    </div>
  );
}
