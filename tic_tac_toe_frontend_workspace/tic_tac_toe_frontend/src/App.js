import React, { useEffect, useState } from 'react';
import './App.css';

// PUBLIC_INTERFACE
/**
 * Modern Tic Tac Toe Game React App - frontend UI and backend API integration
 * Features:
 * - Interactive 3x3 grid
 * - Start new game/reset
 * - Winner/draw display, current player UI
 * - Minimalistic, responsive style, color-scheme from spec
 * - Works on desktop/mobile
 */
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const COLOR_SCHEME = {
  primary: '#1976d2',
  secondary: '#90caf9',
  accent: '#ff5252',
};

function getCellClass(value) {
  if (value === 'X') return 'cell x';
  if (value === 'O') return 'cell o';
  return 'cell';
}

// PUBLIC_INTERFACE
function App() {
  const [board, setBoard] = useState([
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ]);
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [status, setStatus] = useState('in_progress'); // in_progress | won | draw
  const [winner, setWinner] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Responsive inline style for board, using CSS vars for color
  useEffect(() => {
    document.documentElement.style.setProperty('--ttt-primary', COLOR_SCHEME.primary);
    document.documentElement.style.setProperty('--ttt-secondary', COLOR_SCHEME.secondary);
    document.documentElement.style.setProperty('--ttt-accent', COLOR_SCHEME.accent);
    document.body.style.backgroundColor = '#fff';
  }, []);

  // PUBLIC_INTERFACE
  async function fetchGameState() {
    try {
      const res = await fetch(`${API_BASE}/game/state`);
      const data = await res.json();
      setBoard(data.board);
      setCurrentPlayer(data.current_player);
      setStatus(data.status);
      setWinner(data.winner);
      setMessage('');
    } catch (err) {
      setMessage('Could not load game state.');
    }
  }

  // PUBLIC_INTERFACE
  async function startNewGame() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/game/start`, { method: 'POST' });
      const data = await res.json();
      setBoard(data.game.board);
      setCurrentPlayer(data.game.current_player);
      setStatus(data.game.status);
      setWinner(data.game.winner);
      setMessage('');
    } catch (err) {
      setMessage('Failed to start new game.');
    }
    setLoading(false);
  }

  // PUBLIC_INTERFACE
  async function resetGame() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/game/reset`, { method: 'POST' });
      const data = await res.json();
      setBoard(data.game.board);
      setCurrentPlayer(data.game.current_player);
      setStatus(data.game.status);
      setWinner(data.game.winner);
      setMessage('');
    } catch (err) {
      setMessage('Failed to reset game.');
    }
    setLoading(false);
  }

  // PUBLIC_INTERFACE
  async function handleCellClick(row, col) {
    if (loading) return;
    // Only allow move if game is in progress and cell is empty
    if (status !== 'in_progress' || board[row][col]) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/game/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row, col })
      });
      const data = await res.json();
      if (data?.game) {
        setBoard(data.game.board);
        setCurrentPlayer(data.game.current_player);
        setStatus(data.game.status);
        setWinner(data.game.winner);
        setMessage(data.message || '');
      } else if (data.message) {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage('Failed to make move.');
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchGameState();
    // eslint-disable-next-line
  }, []);

  // Display winner or draw message
  function getStatusDisplay() {
    if (status === 'won' && winner) {
      return <div className="ttt-status" style={{ color: 'var(--ttt-accent)', fontWeight: 700, fontSize: '1.2rem' }}>Winner: {winner}</div>
    }
    if (status === 'draw') {
      return <div className="ttt-status" style={{ color: 'var(--ttt-accent)', fontWeight: 700, fontSize: '1.2rem' }}>Draw!</div>
    }
    return <div className="ttt-status" style={{ color: 'var(--ttt-primary)' }}>Next: {currentPlayer}</div>
  }

  return (
    <div className="app ttt-app">
      <nav className="navbar">
        <div className="container" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div className="logo" style={{ color: 'var(--ttt-primary)' }}>
              <span className="logo-symbol" style={{ color: 'var(--ttt-accent)' }}>#</span> Tic Tac Toe
            </div>
            <button className="btn btn-large" style={{ backgroundColor: 'var(--ttt-accent)' }} onClick={startNewGame} disabled={loading}>New Game</button>
          </div>
        </div>
      </nav>

      <main>
        <div className="container ttt-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '95vh', gap: 0, justifyContent: 'center', paddingTop: 96 }}>
          <h1 className="title" style={{ letterSpacing: '0.01em', fontSize: '2.5rem', color: 'var(--ttt-primary)', margin: '20px 0 4px', fontWeight: 800 }}>Tic Tac Toe</h1>
          <div className="subtitle" style={{ color: 'var(--ttt-secondary)', fontSize: '1.1rem', fontWeight: 400 }}>Modern & Minimal · React + FastAPI</div>
          <div style={{
            marginTop: 16,
            marginBottom: 12,
            width: '100%',
            maxWidth: 480,
            textAlign: 'center'
          }}>
            {getStatusDisplay()}
            {message && <div className="ttt-message" style={{ color: '#b71c1c', fontSize: '1rem', marginTop: 2 }}>{message}</div>}
          </div>

          <div
            className="ttt-board"
            role="grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 0,
              width: '100%',
              maxWidth: 360,
              aspectRatio: '1',
              background: 'var(--ttt-secondary, #f5fafe)',
              borderRadius: 18,
              boxShadow: '0 2px 12px 1px rgba(25,118,210,0.06)',
              marginBottom: 28
            }}>
            {board.map((row, r) =>
              row.map((cell, c) => (
                <button
                  key={r + '-' + c}
                  className={getCellClass(cell) + ' ttt-cell'}
                  onClick={() => handleCellClick(r, c)}
                  disabled={loading || status !== 'in_progress' || cell}
                  aria-label={`Cell ${r},${c}`}
                  style={{
                    padding: 0,
                    fontWeight: 700,
                    fontSize: '2.4rem',
                    color: cell === 'X' ? 'var(--ttt-primary)' : (cell === 'O' ? 'var(--ttt-accent)' : '#222'),
                    background: 'white',
                    border: 'none',
                    borderRight: c < 2 ? '2px solid var(--ttt-secondary)' : 'none',
                    borderBottom: r < 2 ? '2px solid var(--ttt-secondary)' : 'none',
                    transition: 'background 0.13s',
                    height: '100%',
                    cursor: cell || status !== 'in_progress' || loading ? 'not-allowed' : 'pointer',
                    outline: 'none'
                  }}
                >
                  {cell ? cell : ''}
                </button>
              ))
            )}
          </div>

          <div style={{ display: 'flex', gap: 18, marginBottom: 36 }}>
            <button
              className="btn btn-large"
              style={{
                backgroundColor: 'var(--ttt-primary)',
                color: '#fff',
                fontWeight: 600,
                boxShadow: 'none'
              }}
              onClick={resetGame}
              disabled={loading}
            >
              Reset
            </button>
            <button
              className="btn btn-large"
              style={{
                backgroundColor: 'var(--ttt-accent)',
                color: '#fff',
                fontWeight: 600,
                boxShadow: 'none'
              }}
              onClick={startNewGame}
              disabled={loading}
            >
              New Game
            </button>
          </div>
          {/* for mobile users, extra margin below */}
          <div style={{ height: 32 }} />
        </div>
      </main>
    </div>
  );
}

export default App;
