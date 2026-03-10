import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DiaryContext } from '../App';
import {
  format, parseISO, startOfMonth, endOfMonth,
  eachDayOfInterval, isToday, addMonths, subMonths,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import './DiaryHome.css';

const MOOD_MAP = {
  happy:   { emoji: '😊', label: '행복' },
  sad:     { emoji: '😢', label: '슬픔' },
  angry:   { emoji: '😤', label: '화남' },
  calm:    { emoji: '😌', label: '평온' },
  excited: { emoji: '🎉', label: '설렘' },
  tired:   { emoji: '😴', label: '피곤' },
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function Calendar({ entries, selectedDate, onSelectDate, currentMonth, onMonthChange }) {
  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });
  const startPad = start.getDay();
  const entryDates = new Set(entries.map(e => e.date));

  return (
    <div className="calendar">
      <div className="cal-header">
        <button className="cal-nav" onClick={() => onMonthChange(subMonths(currentMonth, 1))}>‹</button>
        <span className="cal-title">{format(currentMonth, 'yyyy년 M월', { locale: ko })}</span>
        <button className="cal-nav" onClick={() => onMonthChange(addMonths(currentMonth, 1))}>›</button>
      </div>
      <div className="cal-weekdays">
        {WEEKDAYS.map(d => <span key={d} className="cal-weekday">{d}</span>)}
      </div>
      <div className="cal-grid">
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="cal-day empty" />
        ))}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const hasEntry = entryDates.has(dateStr);
          const isSelected = selectedDate === dateStr;
          const isTodayDate = isToday(day);
          const entry = entries.find(e => e.date === dateStr);
          return (
            <button
              key={dateStr}
              className={`cal-day${hasEntry ? ' has-entry' : ''}${isSelected ? ' selected' : ''}${isTodayDate ? ' today' : ''}`}
              onClick={() => onSelectDate(dateStr, entry)}
            >
              <span className="cal-day-num">{format(day, 'd')}</span>
              {hasEntry && <span className="cal-dot">{MOOD_MAP[entry?.mood]?.emoji || '·'}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DiaryHome() {
  const { entries, deleteEntry } = useContext(DiaryContext);
  const navigate = useNavigate();
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = format(new Date(), 'yyyy-MM-dd');

  const handleSelectDate = (dateStr, entry) => {
    setSelectedDate(dateStr);
    setSelectedEntry(entry || null);
  };

  const handleNewEntry = () => navigate(`/write/${today}`);

  const handleEdit = (entry) => {
    navigate(`/write/${entry.date}`);
    setSelectedEntry(null);
  };

  const handleDelete = (date) => {
    deleteEntry(date);
    setConfirmDelete(null);
    setSelectedEntry(null);
    setSelectedDate(null);
  };

  const formatDate = (dateStr) => {
    try { return format(parseISO(dateStr), 'yyyy년 M월 d일 EEEE', { locale: ko }); }
    catch { return dateStr; }
  };

  const monthEntries = entries.filter(e =>
    e.date.startsWith(format(currentMonth, 'yyyy-MM'))
  );

  return (
    <div className="home-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="diary-logo">
            <span className="logo-icon">✦</span>
            <h1 className="logo-text">나의 일기장</h1>
          </div>
        </div>

        <div className="sidebar-actions">
          <button className="btn-new-entry" onClick={handleNewEntry}>
            <span className="btn-icon">+</span>새 일기 쓰기
          </button>
          <button className="btn-chat" onClick={() => navigate('/chat')}>
            <span className="btn-icon">💬</span>AI와 대화하기
          </button>
          <button className="btn-emotion" onClick={() => navigate('/emotion')}>
            <span className="btn-icon">📊</span>감정 분석
          </button>
        </div>

        <Calendar
          entries={entries}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
        />

        <div className="entry-count">
          <span>이번 달 {monthEntries.length}개 · 전체 {entries.length}개</span>
        </div>

        <nav className="entry-list">
          {monthEntries.length === 0 ? (
            <div className="empty-list">
              <p>이번 달 일기가 없어요</p>
              <p className="empty-sub">첫 번째 일기를 써보세요 ✍️</p>
            </div>
          ) : (
            monthEntries.map((entry) => {
              const mood = MOOD_MAP[entry.mood];
              return (
                <div
                  key={entry.date}
                  className={`entry-item${selectedEntry?.date === entry.date ? ' active' : ''}`}
                  onClick={() => handleSelectDate(entry.date, entry)}
                >
                  <div className="entry-date-badge">
                    <span className="badge-month">{format(parseISO(entry.date), 'M월')}</span>
                    <span className="badge-day">{format(parseISO(entry.date), 'd')}</span>
                    <span className="badge-weekday">{format(parseISO(entry.date), 'EEE', { locale: ko })}</span>
                  </div>
                  <div className="entry-preview">
                    <div className="entry-title-row">
                      <span className="entry-title">{entry.title || '제목 없음'}</span>
                      {mood && <span className="entry-mood-emoji">{mood.emoji}</span>}
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
            {selectedEntry.title && <h2 className="detail-title">{selectedEntry.title}</h2>}
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
            {selectedEntry.drawing_url && (
              <div className="detail-drawing">
                <p className="detail-drawing-label">🎨 그림일기</p>
                <img
                  src={selectedEntry.drawing_url}
                  alt="그림일기"
                  className="detail-drawing-img"
                />
              </div>
            )}
            {selectedEntry.tags?.length > 0 && (
              <div className="detail-tags">
                {selectedEntry.tags.map(tag => (
                  <span key={tag} className="tag">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        ) : selectedDate ? (
          <div className="welcome-screen">
            <div style={{ fontSize: 52, marginBottom: 16 }}>📝</div>
            <h2 className="welcome-title">{formatDate(selectedDate)}</h2>
            <p className="welcome-sub">이 날의 일기가 없어요.<br />지금 써볼까요?</p>
            <button className="btn-welcome-start" onClick={() => navigate(`/write/${selectedDate}`)}>
              이 날 일기 쓰기 →
            </button>
          </div>
        ) : (
          <div className="welcome-screen">
            <div style={{ fontSize: 64, marginBottom: 20 }}>📖</div>
            <h2 className="welcome-title">오늘의 이야기를 기록해보세요</h2>
            <p className="welcome-sub">달력에서 날짜를 선택하거나,<br />새 일기를 써보세요.</p>
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
                  <span className="stat-num">{monthEntries.length}</span>
                  <span className="stat-label">이번 달</span>
                </div>
                <div className="stat-card">
                  <span className="stat-num">{[...new Set(entries.map(e => e.mood).filter(Boolean))].length}</span>
                  <span className="stat-label">감정 종류</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

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