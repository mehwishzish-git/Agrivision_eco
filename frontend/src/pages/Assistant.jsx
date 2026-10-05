import { useEffect, useState, useRef } from 'react';
import { Bot, Send, User, Trash2, Info, AlertTriangle } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { sendAssistantMessage, getAssistantHistory, clearAssistantHistory } from '../api';

const QUICK_QUESTIONS = [
  "What is my farm health score?",
  "What is the current weather?",
  "What are my soil nutrient levels?",
  "Any disease alerts on the farm?",
  "What actions should I take?",
  "Which zones are at risk?",
  "List all my farm zones",
];

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';

  // Simple markdown-like rendering with XSS sanitization
  const renderContent = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((rawLine, i) => {
      // Escape HTML entities first to prevent XSS injection
      let line = rawLine
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      // Bold **text**
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Italic *text*
      line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');

      // Bullet
      if (line.startsWith('- ')) {
        return <li key={i} style={{ marginBottom: 3 }} dangerouslySetInnerHTML={{ __html: line.slice(2) }} />;
      }
      if (line.startsWith('# ')) {
        return <strong key={i} style={{ display: 'block', marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: line.slice(2) }} />;
      }
      if (line.trim() === '') return <br key={i} />;
      return <span key={i} style={{ display: 'block', marginBottom: 2 }} dangerouslySetInnerHTML={{ __html: line }} />;
    });
  };

  return (
    <div className={`chat-msg ${isUser ? 'user' : ''}`}>
      <div className={`chat-avatar ${isUser ? 'user' : 'ai'}`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className={`chat-bubble ${isUser ? 'user' : 'ai'}`}>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {renderContent(msg.content)}
        </ul>
      </div>
    </div>
  );
}

export default function Assistant() {
  const { selectedFarmId, selectedFarm } = useFarm();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!selectedFarmId) return;
    setMessages([]);
    getAssistantHistory(selectedFarmId).then(history => {
      if (history.length === 0) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I'm your AgriVision AI Assistant for **${selectedFarm?.name || 'your farm'}**.\n\nI can answer questions about your farm's health scores, soil nutrients, weather conditions, disease alerts, recommendations, and risk zones.\n\nAll my answers use real data from your farm database. Try asking me something!`,
        }]);
      } else {
        setMessages(history);
      }
    }).catch(() => {});
  }, [selectedFarmId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || !selectedFarmId) return;

    setInput('');
    setError(null);

    const userMsg = { id: Date.now(), role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      const { response } = await sendAssistantMessage(selectedFarmId, msg);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant',
        content: `Sorry, I couldn't process your request. ${err.message}`
      }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleClear = async () => {
    if (!selectedFarmId) return;
    setClearing(true);
    try {
      await clearAssistantHistory(selectedFarmId);
      setMessages([{
        id: 'welcome-new',
        role: 'assistant',
        content: 'Chat history cleared. How can I help you?',
      }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', padding: '20px 32px' }}>
      <div className="alert alert-info" style={{ marginBottom: 12, flexShrink: 0 }}>
        <Info size={14} className="alert-icon" />
        <span>
          <strong>AI Assistant:</strong> Uses actual data from your farm database. Does not invent or fabricate values.
          All responses are based on your real farm records.
        </span>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #38BDF8, #0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Bot size={18} />
            </div>
            <div>
              <div className="card-title">AgriVision Assistant</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {selectedFarm?.name} · {selectedFarm?.is_demo ? 'Demo Farm' : 'Live Farm'}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleClear} disabled={clearing}>
            {clearing ? <div className="spinner spinner-sm" /> : <Trash2 size={14} />}
            Clear History
          </button>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg) => (
            <MessageBubble key={msg.id || msg.created_at} msg={msg} />
          ))}
          {sending && (
            <div className="chat-msg">
              <div className="chat-avatar ai"><Bot size={16} /></div>
              <div className="chat-bubble ai">
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <div className="spinner spinner-sm" />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Thinking…</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick questions */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-light)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 6, whiteSpace: 'nowrap' }}>
            {QUICK_QUESTIONS.map(q => (
              <button key={q} className="btn btn-ghost btn-sm"
                style={{ flexShrink: 0, fontSize: 12, border: '1px solid var(--border)' }}
                onClick={() => handleSend(q)} disabled={sending}>
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <input
            ref={inputRef}
            className="chat-input"
            placeholder="Ask about your farm health, weather, soil, diseases, recommendations…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={sending}
            maxLength={1000}
          />
          <button className="chat-send-btn" onClick={() => handleSend()} disabled={sending || !input.trim()}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
