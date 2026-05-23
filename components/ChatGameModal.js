import { useEffect, useRef, useState } from 'react';

const RAFFLE_API = process.env.NEXT_PUBLIC_RAFFLE_API || 'http://localhost:3000';

const SOURCE_BADGE = {
  twitch: { label: 'TWITCH', color: '#9147FF', bg: 'rgba(145,71,255,0.15)' },
  kick:   { label: 'KICK',   color: '#53FC1C', bg: 'rgba(83,252,28,0.12)' },
  youtube:{ label: 'YT',     color: '#FF4444', bg: 'rgba(255,0,0,0.12)' },
};

export default function ChatGameModal({ isOpen, onClose, onPlay }) {
  const [participants, setParticipants] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const esRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setParticipants([]);

    const es = new EventSource(`${RAFFLE_API}/api/game-session/stream`);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'init') {
          setParticipants(data.participants || []);
          setConnected(true);
        } else if (data.type === 'add') {
          setParticipants(prev => [...prev, data.participant]);
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      setConnected(false);
      setError(`Não foi possível conectar ao raffle-app (${RAFFLE_API}). Verifique se ele está rodando.`);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleClear = async () => {
    await fetch(`${RAFFLE_API}/api/game-session`, { method: 'DELETE' }).catch(() => {});
    setParticipants([]);
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`cgm-backdrop ${isClosing ? 'closing' : ''}`}
      onClick={e => e.target === e.currentTarget && handleClose()}
    >
      <div className={`cgm-modal ${isClosing ? 'closing' : ''}`}>

        {/* Header */}
        <div className="cgm-header">
          <div className="cgm-title-row">
            <span className="cgm-title">🎮 Jogar com o Chat</span>
            <div className="cgm-status">
              <span className={`cgm-dot ${connected ? 'live' : 'offline'}`} />
              <span className="cgm-status-text">{connected ? 'Conectado' : 'Desconectado'}</span>
            </div>
          </div>
          <button className="cgm-close" onClick={handleClose}>×</button>
        </div>

        {/* Body */}
        <div className="cgm-body">
          {error ? (
            <div className="cgm-error">{error}</div>
          ) : (
            <>
              <div className="cgm-info">
                Quem digitar <code>!entrar</code> no chat da live aparece aqui como elegível para jogar.
              </div>

              <div className="cgm-count-row">
                <span className="cgm-count-label">Participantes elegíveis</span>
                <span className="cgm-count">{participants.length}</span>
              </div>

              <div className="cgm-list">
                {participants.length === 0 ? (
                  <div className="cgm-empty">
                    Aguardando participantes digitarem <code>!entrar</code> no chat…
                  </div>
                ) : (
                  participants.map((p, i) => {
                    const badge = SOURCE_BADGE[p.source] || SOURCE_BADGE.twitch;
                    return (
                      <div key={`${p.name}_${i}`} className="cgm-item">
                        <span className="cgm-num">#{i + 1}</span>
                        <span className="cgm-name">{p.name}</span>
                        <span
                          className="cgm-badge"
                          style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.color}44` }}
                        >
                          {badge.label}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="cgm-footer">
          <button className="cgm-btn-clear" onClick={handleClear} disabled={participants.length === 0}>
            Limpar Lista
          </button>
          <button className="cgm-btn-play" onClick={() => { handleClose(); onPlay(); }} disabled={participants.length === 0}>
            Jogar Agora! ({participants.length})
          </button>
        </div>
      </div>

      <style jsx>{`
        .cgm-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.78);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          animation: cgmFadeIn 0.2s ease-out;
        }
        .cgm-backdrop.closing { animation: cgmFadeOut 0.2s ease-out forwards; }

        .cgm-modal {
          background: linear-gradient(135deg, rgba(0,0,0,0.97) 0%, rgba(0,20,40,0.95) 100%);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          width: 100%;
          max-width: 520px;
          max-height: 82vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 12px 48px rgba(0,0,0,0.8);
          animation: cgmSlideIn 0.2s ease-out;
          font-family: "Lexend", sans-serif;
          color: white;
          overflow: hidden;
        }
        .cgm-modal.closing { animation: cgmSlideOut 0.2s ease-out forwards; }

        .cgm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          flex-shrink: 0;
        }
        .cgm-title-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .cgm-title {
          font-size: 1.15rem;
          font-weight: 700;
        }
        .cgm-status {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .cgm-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #555;
        }
        .cgm-dot.live {
          background: #00ff88;
          box-shadow: 0 0 6px #00ff88;
          animation: cgmPulse 1.2s infinite;
        }
        .cgm-dot.offline { background: #ff4444; }
        .cgm-status-text { font-size: 11px; color: rgba(255,255,255,0.45); }
        .cgm-close {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          color: white;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .cgm-close:hover { background: rgba(255,255,255,0.18); }

        .cgm-body {
          flex: 1;
          overflow-y: auto;
          padding: 18px 22px;
          min-height: 0;
        }
        .cgm-error {
          padding: 14px;
          background: rgba(255,50,50,0.12);
          border: 1px solid rgba(255,50,50,0.3);
          border-radius: 8px;
          font-size: 13px;
          color: #ff7070;
          line-height: 1.5;
        }
        .cgm-info {
          font-size: 12px;
          color: rgba(255,255,255,0.45);
          margin-bottom: 14px;
          line-height: 1.6;
        }
        .cgm-info code {
          background: rgba(255,255,255,0.1);
          padding: 1px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: #00e5ff;
        }
        .cgm-count-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .cgm-count-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255,255,255,0.35);
        }
        .cgm-count {
          font-size: 15px;
          font-weight: 700;
          color: #00e5ff;
        }
        .cgm-list {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .cgm-empty {
          text-align: center;
          padding: 28px 0;
          font-size: 13px;
          color: rgba(255,255,255,0.28);
          line-height: 1.7;
        }
        .cgm-empty code {
          background: rgba(255,255,255,0.08);
          padding: 1px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: #9147ff;
        }
        .cgm-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          animation: cgmItemIn 0.15s ease-out;
        }
        .cgm-num {
          font-size: 10px;
          color: rgba(255,255,255,0.25);
          min-width: 26px;
          font-weight: 600;
        }
        .cgm-name {
          flex: 1;
          font-size: 13px;
          color: rgba(255,255,255,0.85);
        }
        .cgm-badge {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.06em;
          padding: 2px 6px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .cgm-footer {
          display: flex;
          gap: 10px;
          padding: 14px 22px 18px;
          border-top: 1px solid rgba(255,255,255,0.08);
          flex-shrink: 0;
        }
        .cgm-btn-clear {
          flex: 1;
          padding: 10px;
          border-radius: 9px;
          border: 1px solid rgba(255,80,80,0.35);
          background: rgba(255,50,50,0.1);
          color: #ff7070;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          font-family: "Lexend", sans-serif;
        }
        .cgm-btn-clear:hover:not(:disabled) {
          background: rgba(255,50,50,0.2);
        }
        .cgm-btn-clear:disabled { opacity: 0.35; cursor: default; }

        .cgm-btn-play {
          flex: 2;
          padding: 10px;
          border-radius: 9px;
          border: 1px solid rgba(0,229,255,0.45);
          background: linear-gradient(135deg, rgba(0,229,255,0.18), rgba(0,100,200,0.18));
          color: #00e5ff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          font-family: "Lexend", sans-serif;
          box-shadow: 0 0 14px rgba(0,229,255,0.12);
        }
        .cgm-btn-play:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(0,229,255,0.28), rgba(0,100,200,0.25));
          box-shadow: 0 0 22px rgba(0,229,255,0.22);
        }
        .cgm-btn-play:disabled { opacity: 0.35; cursor: default; }

        @keyframes cgmFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cgmFadeOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes cgmSlideIn {
          from { transform: scale(0.92) translateY(24px); opacity: 0 }
          to   { transform: scale(1)    translateY(0);    opacity: 1 }
        }
        @keyframes cgmSlideOut {
          from { transform: scale(1)    translateY(0);     opacity: 1 }
          to   { transform: scale(0.92) translateY(-20px); opacity: 0 }
        }
        @keyframes cgmPulse {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0.35 }
        }
        @keyframes cgmItemIn {
          from { transform: translateX(-8px); opacity: 0 }
          to   { transform: translateX(0);    opacity: 1 }
        }
      `}</style>
    </div>
  );
}
