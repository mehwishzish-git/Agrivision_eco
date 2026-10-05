import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Microscope, Upload, CheckCircle, AlertTriangle, Info, X, ImageIcon, Loader } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { getZones, analyzeZone, getAnalyses } from '../api';

const getConfidenceClass = (pct) => {
  if (pct >= 75) return 'badge-success';
  if (pct >= 50) return 'badge-warning';
  return 'badge-danger';
};

const getConfidenceLabel = (pct) => {
  if (pct >= 75) return 'High Confidence';
  if (pct >= 50) return 'Moderate Confidence';
  if (pct > 0) return 'Low Confidence – Verify in Field';
  return 'Manual Entry';
};

function DropzoneUpload({ onFileSelected, file, onClear }) {
  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) return;
    if (accepted.length > 0) onFileSelected(accepted[0]);
  }, [onFileSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  if (file) {
    return (
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '2px solid var(--primary)' }}>
        <img src={URL.createObjectURL(file)} alt="Upload preview"
          style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
        <button
          onClick={onClear}
          className="btn btn-ghost btn-icon"
          style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.9)' }}
        >
          <X size={16} />
        </button>
        <div style={{ padding: '8px 14px', background: 'var(--primary-xlight)', fontSize: 12, color: 'var(--primary-dark)' }}>
          📷 {file.name} ({(file.size / 1024).toFixed(0)}KB)
        </div>
      </div>
    );
  }

  return (
    <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'drag-active' : ''}`}>
      <input {...getInputProps()} />
      <div className="upload-icon"><Upload size={22} /></div>
      <div className="upload-text">{isDragActive ? 'Drop image here' : 'Drag & drop a crop image'}</div>
      <div className="upload-hint">PNG, JPG, WebP · Max 10MB</div>
      <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>
        <ImageIcon size={14} /> Browse
      </button>
    </div>
  );
}

function AnalysisResult({ result }) {
  const { analysis, health_score } = result;
  const diseaseDetected = analysis.disease_detected !== 'None Detected';

  return (
    <div>
      <div className="alert alert-demo" style={{ marginBottom: 16 }}>
        <Info size={14} className="alert-icon" />
        {analysis.disclaimer || 'Demo analysis – not scientifically validated.'}
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-body">
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: analysis.health_score >= 80 ? '#10B981' : analysis.health_score >= 65 ? '#F59E0B' : '#EF4444' }}>
                {analysis.health_score}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Crop Health Score</div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Disease Detected</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {diseaseDetected
                  ? <AlertTriangle size={16} color="#F59E0B" />
                  : <CheckCircle size={16} color="#10B981" />}
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{analysis.disease_detected}</span>
              </div>
            </div>

            {analysis.confidence_pct > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Confidence</div>
                <span className={`badge ${getConfidenceClass(analysis.confidence_pct)}`}>
                  {analysis.confidence_pct?.toFixed(0)}% – {getConfidenceLabel(analysis.confidence_pct)}
                </span>
              </div>
            )}

            {analysis.ndvi_estimate && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>NDVI Estimate</div>
                <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--primary-dark)' }}>
                  {analysis.ndvi_estimate?.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Health Score Breakdown</span></div>
          <div className="card-body">
            {[
              { label: 'Overall Score', value: health_score.overall_score, max: 100 },
              { label: 'Crop Score', value: health_score.crop_score, max: 100 },
              { label: 'Soil Score', value: health_score.soil_score, max: 100 },
              { label: 'Weather Score', value: health_score.weather_score, max: 100 },
            ].map(({ label, value, max }) => {
              const color = value >= 80 ? '#10B981' : value >= 65 ? '#F59E0B' : '#EF4444';
              return (
                <div key={label} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <strong style={{ color }}>{value}/100</strong>
                  </div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                    <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Risk Level: </span>
              <span className={`badge risk-badge-${health_score.risk_level?.toLowerCase()}`} style={{ marginLeft: 4 }}>
                {health_score.risk_level}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header"><span className="card-title">Observed Symptoms</span></div>
        <div className="card-body">
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{analysis.symptoms}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Recommended Actions</span></div>
        <div className="card-body">
          <div className="rec-action">{analysis.recommendations}</div>
          {diseaseDetected && (
            <div className="alert alert-warning" style={{ marginTop: 12, marginBottom: 0 }}>
              <AlertTriangle size={14} className="alert-icon" />
              <span>Always verify disease in field before applying any treatment. Consult a qualified agronomist for treatment decisions. Do not use unsafe chemical dosages.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Analysis() {
  const { selectedFarmId, selectedFarm } = useFarm();
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analyze');

  useEffect(() => {
    if (!selectedFarmId) return;
    getZones(selectedFarmId).then(zs => {
      setZones(zs);
      if (zs.length > 0) setSelectedZoneId(zs[0].id);
    });
  }, [selectedFarmId]);

  useEffect(() => {
    if (!selectedZoneId) return;
    setResult(null);
    getAnalyses(selectedZoneId).then(setHistory).catch(() => {});
  }, [selectedZoneId]);

  const handleAnalyze = async () => {
    if (!selectedZoneId) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      if (file) formData.append('image', file);
      const res = await analyzeZone(selectedZoneId, formData);
      setResult(res);
      getAnalyses(selectedZoneId).then(setHistory).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedZone = zones.find(z => z.id === selectedZoneId);

  return (
    <div className="page-container">
      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <Info size={16} className="alert-icon" />
        <span>
          <strong>Demo AI Model:</strong> This crop analysis uses a rule-based simulation, not a real AI/ML model.
          Results are for demonstration only and must not be used for real farm decisions without field verification.
        </span>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {['analyze', 'history'].map(t => (
          <div key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t === 'analyze' ? '🔬 Analyze Crop' : '📋 Analysis History'}
          </div>
        ))}
      </div>

      {activeTab === 'analyze' && (
        <div className="grid-2">
          {/* Left panel */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">Select Zone</span></div>
              <div className="card-body">
                <select className="form-select" value={selectedZoneId || ''}
                  onChange={e => setSelectedZoneId(Number(e.target.value))}>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name} – {z.crop_type || 'No crop'}</option>)}
                </select>
                {selectedZone && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedZone.crop_type && <span className="badge badge-info">{selectedZone.crop_type}</span>}
                    {selectedZone.growth_stage && <span className="badge badge-neutral">{selectedZone.growth_stage}</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">Upload Crop Image</span>
                <span className="badge badge-neutral">Optional</span>
              </div>
              <div className="card-body">
                <DropzoneUpload file={file} onFileSelected={setFile} onClear={() => setFile(null)} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
                  Optional: Upload a photo for demo image analysis. Without an image, a rule-based analysis is performed.
                </div>
              </div>
            </div>

            {error && <div className="alert alert-danger"><AlertTriangle size={14} className="alert-icon" />{error}</div>}

            <button
              className="btn btn-primary w-full btn-lg"
              onClick={handleAnalyze}
              disabled={analyzing || !selectedZoneId}
            >
              {analyzing ? (
                <><div className="spinner spinner-sm" /> Analyzing…</>
              ) : (
                <><Microscope size={18} /> Run Crop Analysis</>
              )}
            </button>
          </div>

          {/* Right panel */}
          <div>
            {analyzing && (
              <div className="card"><div className="card-body">
                <div className="loading-overlay">
                  <div className="spinner" />
                  <span>Running analysis…</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Evaluating crop health, soil, and weather data</span>
                </div>
              </div></div>
            )}
            {!analyzing && result && <AnalysisResult result={result} />}
            {!analyzing && !result && (
              <div className="card"><div className="card-body">
                <div className="empty-state">
                  <div className="empty-state-icon"><Microscope size={28} /></div>
                  <div className="empty-state-title">No Analysis Yet</div>
                  <div className="empty-state-desc">
                    Select a zone and optionally upload a crop image, then click "Run Crop Analysis".
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
                <div className="empty-state-title">No Analysis History</div>
                <div className="empty-state-desc">Run a crop analysis to see results here.</div>
              </div>
            </div></div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Health Score</th><th>Disease Detected</th><th>Confidence</th><th>NDVI</th><th>Type</th></tr>
                </thead>
                <tbody>
                  {history.map(a => (
                    <tr key={a.id}>
                      <td>{new Date(a.analyzed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: a.health_score >= 80 ? '#10B981' : a.health_score >= 65 ? '#F59E0B' : '#EF4444' }}>
                          {a.health_score}/100
                        </span>
                      </td>
                      <td>{a.disease_detected || '—'}</td>
                      <td>
                        {a.confidence_pct > 0
                          ? <span className={`badge ${getConfidenceClass(a.confidence_pct)}`}>{a.confidence_pct?.toFixed(0)}%</span>
                          : '—'}
                      </td>
                      <td>{a.ndvi_estimate?.toFixed(2) || '—'}</td>
                      <td><span className={`badge ${a.is_simulated ? 'badge-demo' : 'badge-info'}`}>{a.analysis_type}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
