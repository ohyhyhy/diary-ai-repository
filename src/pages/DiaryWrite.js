import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DiaryContext } from '../App';
import { supabase } from '../SupabaseClient';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import DrawingCanvas from '../components/DrawingCanvas';
import './DiaryWrite.css';

const MOODS = [
  { key: 'happy', emoji: '😊', label: '행복' },
  { key: 'calm', emoji: '😌', label: '평온' },
  { key: 'excited', emoji: '🎉', label: '설렘' },
  { key: 'sad', emoji: '😢', label: '슬픔' },
  { key: 'angry', emoji: '😤', label: '화남' },
  { key: 'tired', emoji: '😴', label: '피곤' },
];

const WEATHERS = [
  { key: 'sunny', icon: '☀️', label: '맑음' },
  { key: 'cloudy', icon: '☁️', label: '흐림' },
  { key: 'rainy', icon: '🌧️', label: '비' },
  { key: 'snowy', icon: '❄️', label: '눈' },
  { key: 'windy', icon: '💨', label: '바람' },
];

export default function DiaryWrite() {
  const { entries, saveEntry } = useContext(DiaryContext);
  const navigate = useNavigate();
  const { date: dateParam } = useParams();

  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(dateParam || today);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [weather, setWeather] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('write'); // 'write' | 'draw'
  const [drawingData, setDrawingData] = useState(null); // base64
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const existing = entries.find(e => e.date === date);
    if (existing) {
      setTitle(existing.title || '');
      setContent(existing.content || '');
      setMood(existing.mood || '');
      setWeather(existing.weather || '');
      setTags(existing.tags || []);
      setDrawingData(existing.drawing_url || null);
    } else {
      setTitle('');
      setContent('');
      setMood('');
      setWeather('');
      setTags([]);
      setDrawingData(null);
    }
    setSaved(false);
  }, [date]);

  // base64를 Supabase Storage에 업로드하고 URL 반환
  const uploadDrawing = async (base64Data) => {
    if (!base64Data) return null;
    try {
      // base64 → Blob
      const res = await fetch(base64Data);
      const blob = await res.blob();
      const fileName = `drawing-${date}-${Date.now()}.png`;

      const { error } = await supabase.storage
        .from('diary-drawings')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('diary-drawings')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error('이미지 업로드 실패:', err.message);
      return base64Data; // 폴백: base64 그대로 저장
    }
  };

  const handleSave = async () => {
    if (!content.trim() && !drawingData) return;
    setUploadingImage(true);

    let drawingUrl = null;
    if (drawingData && drawingData.startsWith('data:')) {
      drawingUrl = await uploadDrawing(drawingData);
    } else {
      drawingUrl = drawingData;
    }

    saveEntry({ date, title, content, mood, weather, tags, drawing_url: drawingUrl });
    setSaved(true);
    setUploadingImage(false);
    setTimeout(() => navigate('/'), 700);
  };

  const handleAddTag = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/^#/, '');
      if (!tags.includes(newTag)) setTags([...tags, newTag]);
      setTagInput('');
    }
  };

  const removeTag = (tag) => setTags(tags.filter(t => t !== tag));

  const formatDisplayDate = (d) => {
    try {
      return format(new Date(d + 'T00:00:00'), 'yyyy년 M월 d일 EEEE', { locale: ko });
    } catch { return d; }
  };

  const canSave = content.trim() || drawingData;
  const wordCount = content.trim().length;

  return (
    <div className="write-container">
      <header className="write-header">
        <button className="btn-back" onClick={() => navigate('/')}>← 돌아가기</button>
        <div className="write-header-center">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="date-input"
          />
          <span className="date-display">{formatDisplayDate(date)}</span>
        </div>
        <button
          className={`btn-save ${saved ? 'saved' : ''} ${!canSave || uploadingImage ? 'disabled' : ''}`}
          onClick={handleSave}
          disabled={!canSave || uploadingImage}
        >
          {uploadingImage ? '저장 중...' : saved ? '✓ 저장됨' : '저장하기'}
        </button>
      </header>

      <div className="write-body">
        {/* Meta */}
        <div className="write-meta">
          <div className="meta-section">
            <label className="meta-label">오늘의 기분</label>
            <div className="mood-grid">
              {MOODS.map(m => (
                <button
                  key={m.key}
                  className={`mood-btn ${mood === m.key ? 'selected' : ''}`}
                  onClick={() => setMood(mood === m.key ? '' : m.key)}
                >
                  <span className="mood-emoji">{m.emoji}</span>
                  <span className="mood-label">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="meta-section">
            <label className="meta-label">날씨</label>
            <div className="weather-row">
              {WEATHERS.map(w => (
                <button
                  key={w.key}
                  className={`weather-btn ${weather === w.key ? 'selected' : ''}`}
                  onClick={() => setWeather(weather === w.key ? '' : w.key)}
                >
                  <span>{w.icon}</span>
                  <span className="weather-label">{w.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="write-tabs">
          <button
            className={`write-tab${activeTab === 'write' ? ' active' : ''}`}
            onClick={() => setActiveTab('write')}
          >✏️ 글쓰기</button>
          <button
            className={`write-tab${activeTab === 'draw' ? ' active' : ''}`}
            onClick={() => setActiveTab('draw')}
          >
            🎨 그림일기
            {drawingData && <span className="tab-dot" />}
          </button>
        </div>

        {/* Write Tab */}
        {activeTab === 'write' && (
          <div className="write-editor">
            <input
              type="text"
              className="title-input"
              placeholder="오늘의 제목 (선택)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={60}
            />
            <textarea
              className="content-textarea"
              placeholder="오늘 하루는 어땠나요? 자유롭게 적어보세요..."
              value={content}
              onChange={e => setContent(e.target.value)}
              autoFocus
            />
            <div className="editor-footer">
              <div className="tags-list">
                {tags.map(tag => (
                  <span key={tag} className="tag-chip">
                    #{tag}
                    <button className="tag-remove" onClick={() => removeTag(tag)}>×</button>
                  </span>
                ))}
                <input
                  type="text"
                  className="tag-input"
                  placeholder="태그 추가 (Enter)"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                />
              </div>
              <span className="word-count">{wordCount}자</span>
            </div>
          </div>
        )}

        {/* Draw Tab */}
        {activeTab === 'draw' && (
          <div className="draw-tab-content">
            <DrawingCanvas
              initialImage={drawingData}
              onImageChange={setDrawingData}
            />
            <p className="draw-hint">손가락이나 마우스로 오늘의 기억을 그려보세요 🖌️</p>
          </div>
        )}
      </div>
    </div>
  );
}