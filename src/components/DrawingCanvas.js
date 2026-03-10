import React, { useRef, useState, useEffect, useCallback } from 'react';
import './DrawingCanvas.css';

const COLORS = [
  '#2C1810', '#6B4C2A', '#A0744A', '#C9A87C',
  '#D4857A', '#7A9BB5', '#8FAF8A', '#B5A0C4',
  '#F4C842', '#FFFFFF',
];

const BRUSH_SIZES = [2, 5, 10, 20];

export default function DrawingCanvas({ initialImage, onImageChange }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#2C1810');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('pen'); // pen | eraser
  const [history, setHistory] = useState([]);
  const lastPos = useRef(null);

  // 초기 이미지 로드
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // 배경 흰색
    ctx.fillStyle = '#FFFDF8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (initialImage) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = initialImage;
    }
    saveHistory();
  }, []);

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistory(prev => [...prev.slice(-19), canvas.toDataURL()]);
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const pos = getPos(e, canvas);
    lastPos.current = pos;
    setIsDrawing(true);

    // 점 찍기
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, (tool === 'eraser' ? brushSize * 2 : brushSize) / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === 'eraser' ? '#FFFDF8' : color;
    ctx.fill();
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#FFFDF8' : color;
    ctx.lineWidth = tool === 'eraser' ? brushSize * 2 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPos.current = null;
    saveHistory();
    const canvas = canvasRef.current;
    onImageChange?.(canvas.toDataURL());
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const prev = history[history.length - 2];
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      onImageChange?.(prev);
    };
    img.src = prev;
    setHistory(h => h.slice(0, -1));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFDF8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveHistory();
    onImageChange?.(canvas.toDataURL());
  };

  return (
    <div className="drawing-canvas-wrap">
      {/* Toolbar */}
      <div className="drawing-toolbar">
        <div className="toolbar-group">
          <button
            className={`tool-btn${tool === 'pen' ? ' active' : ''}`}
            onClick={() => setTool('pen')}
            title="펜"
          >✏️</button>
          <button
            className={`tool-btn${tool === 'eraser' ? ' active' : ''}`}
            onClick={() => setTool('eraser')}
            title="지우개"
          >🧹</button>
        </div>

        <div className="toolbar-group">
          {COLORS.map(c => (
            <button
              key={c}
              className={`color-btn${color === c && tool === 'pen' ? ' active' : ''}`}
              style={{ background: c, border: c === '#FFFFFF' ? '1.5px solid var(--tan)' : 'none' }}
              onClick={() => { setColor(c); setTool('pen'); }}
            />
          ))}
        </div>

        <div className="toolbar-group">
          {BRUSH_SIZES.map(s => (
            <button
              key={s}
              className={`size-btn${brushSize === s ? ' active' : ''}`}
              onClick={() => setBrushSize(s)}
            >
              <span style={{ width: s, height: s, background: 'var(--ink)', borderRadius: '50%', display: 'block' }} />
            </button>
          ))}
        </div>

        <div className="toolbar-group toolbar-actions">
          <button className="action-btn" onClick={handleUndo} disabled={history.length <= 1} title="실행취소">↩</button>
          <button className="action-btn" onClick={handleClear} title="전체 지우기">🗑️</button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={600}
        height={340}
        className={`drawing-canvas${tool === 'eraser' ? ' eraser-cursor' : ''}`}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
    </div>
  );
}