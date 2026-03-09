import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DiaryContext } from '../App';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import './DiaryHome.css';

const MOOD_MAP = {
  happy: { emoji: '😊', label: '행복', color: '#F4C842' },
  sad: { emoji: '😢', label: '슬픔', color: '#7A9BB5' },
  angry: { emoji: '😤', label: '화남', color: '#D4857A' },
  calm: { emoji: '😌', label: '평온', color: '#8FAF8A' },
  excited: { emoji: '🎉', label: '설렘', color: '#C9A87C' },
  tired: { emoji: '😴', label: '피곤', color: '#B5A0C4' },
};

export default function DiaryHome() {
  const { entries, deleteEntry } = useContext(DiaryContext);
  const navigate = useNavigate();
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  const handleNewEntry = () => {
    navigate(`/write/${today}`);
  };

  const handleEntryClick = (entry) => {
    setSelectedEntry(entry);
  };

  const handleEdit = (entry) => {
    navigate(`/write/${entry.date}`);
    setSelectedEntry(null);
  };

  const handleDelete = (date) => {
    deleteEntry(date);
    setConfirmDelete(null);
    setSelectedEntry(null);
  };

  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'yyyy년 M월 d일 EEEE', { locale: ko });
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr) => {
    try {
      const d = parseISO(dateStr);
      return {
        month: format(d, 'M월'),
        day: format(d, 'd'),
        weekday: format(d, 'EEE', { locale: ko }),
      };
    } catch {
      return { month: '', day: dateStr, weekday: '' };
    }
  };

  return (
    <div className="home-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="diary-logo">
            <span className="logo-icon">✦</span>
            <h1 className="logo-text">나의 일기장</h1>
          </div>
          <p className="logo-sub">{format(new Date(), 'yyyy년 M월', { locale: ko })}</p>
        </div>

        <div className="sidebar-actions">
          <button className="btn-new-entry" onClick={handleNewEntry}>
            <span className="btn-icon">+</span>
            새 일기 쓰기
          </button>
          <button className="btn-chat" onClick={() => navigate('/chat')}>
            <span className="btn-icon">💬</span>
            AI와 대화하기
          </button>
        </div>

        <div className="entry-count">
          <span>{entries.length}개의 기록</span>
        </div>

        <nav className="entry-list">
          {entries.length === 0 ? (
            <div className="empty-list">
              <p>아직 일기가 없어요</p>
              <p className="empty-sub">첫 번째 일기를 써보세요 ✍️</p>
            </div>
          ) : (
            entries.map((entry) => {
              const { month, day, weekday } = formatShortDate(entry.date);
              const mood = MOOD_MAP[entry.mood];
              return (
                <div
                  key={entry.date}
                  className={`entry-item ${selectedEntry?.date === entry.date ? 'active' : ''}`}
                  onClick={() => handleEntryClick(entry)}
                >
                  <div className="entry-date-badge">
                    <span className="badge-month">{month}</span>
                    <span className="badge-day">{day}</span>
                    <span className="badge-weekday">{weekday}</span>
                  </div>
                  <div className="entry-preview">
                    <div className="entry-title-row">
                      <span className="entry-title">{entry.title || '제목 없음'}</span>
                      {mood && <span className="entry-mood-emoji" title={mood.label}>{mood.emoji}</span>}
                    </div>
                    <p className="entry-snippet">
                      {entry.content?.slice(0, 40)}{entry.content?.length > 40 ? '...' : ''}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {selectedEntry ? (
          <div className="entry-detail" key={selectedEntry.date} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="detail-header">
              <div>
                <p className="detail-date">{formatDate(selectedEntry.date)}</p>
                {selectedEntry.mood && (
                  <span className="detail-mood">
                    {MOOD_MAP[selectedEntry.mood]?.emoji} {MOOD_MAP[selectedEntry.mood]?.label}
                  </span>
                )}
              </div>
              <div className="detail-actions">
                <button className="btn-edit" onClick={() => handleEdit(selectedEntry)}>수정</button>
                <button className="btn-delete" onClick={() => setConfirmDelete(selectedEntry.date)}>삭제</button>
              </div>
            </div>

            {selectedEntry.title && (
              <h2 className="detail-title">{selectedEntry.title}</h2>
            )}

            {selectedEntry.weather && (
              <p className="detail-weather">
                {selectedEntry.weather === 'sunny' && '☀️ 맑음'}
                {selectedEntry.weather === 'cloudy' && '☁️ 흐림'}
                {selectedEntry.weather === 'rainy' && '🌧️ 비'}
                {selectedEntry.weather === 'snowy' && '❄️ 눈'}
                {selectedEntry.weather === 'windy' && '💨 바람'}
              </p>
            )}

            <div className="detail-content">
              {selectedEntry.content?.split('\n').map((line, i) => (
                <p key={i}>{line || <br />}</p>
              ))}
            </div>

            {selectedEntry.tags?.length > 0 && (
              <div className="detail-tags">
                {selectedEntry.tags.map(tag => (
                  <span key={tag} className="tag">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="welcome-screen">
            <div className="welcome-illustration">
              <div className="book-icon">📖</div>
            </div>
            <h2 className="welcome-title">오늘의 이야기를 기록해보세요</h2>
            <p className="welcome-sub">
              일기는 당신의 소중한 기억을 담는 공간이에요.<br />
              왼쪽 목록에서 일기를 선택하거나, 새 일기를 써보세요.
            </p>
            <button className="btn-welcome-start" onClick={handleNewEntry}>
              오늘 일기 쓰기 →
            </button>

            {entries.length > 0 && (
              <div className="stats-row">
                <div className="stat-card">
                  <span className="stat-num">{entries.length}</span>
                  <span className="stat-label">총 일기</span>
                </div>
                <div className="stat-card">
                  <span className="stat-num">
                    {entries.filter(e => e.date.startsWith(format(new Date(), 'yyyy-MM'))).length}
                  </span>
                  <span className="stat-label">이번 달</span>
                </div>
                <div className="stat-card">
                  <span className="stat-num">
                    {[...new Set(entries.map(e => e.mood).filter(Boolean))].length}
                  </span>
                  <span className="stat-label">감정 종류</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>일기를 삭제할까요?</h3>
            <p>이 작업은 되돌릴 수 없어요.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setConfirmDelete(null)}>취소</button>
              <button className="btn-confirm-delete" onClick={() => handleDelete(confirmDelete)}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}