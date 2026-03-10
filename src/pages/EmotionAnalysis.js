import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DiaryContext } from '../App';
import { format, parseISO, subDays, isAfter } from 'date-fns';
import { ko } from 'date-fns/locale';
import './EmotionAnalysis.css';

const HF_API_KEY = process.env.REACT_APP_HF_API_KEY || '';

const MOOD_MAP = {
  happy:   { emoji: '😊', label: '행복', color: '#F4C842', bg: '#FFFBE6' },
  calm:    { emoji: '😌', label: '평온', color: '#8FAF8A', bg: '#F0F7EF' },
  excited: { emoji: '🎉', label: '설렘', color: '#C9A87C', bg: '#FBF5EC' },
  sad:     { emoji: '😢', label: '슬픔', color: '#7A9BB5', bg: '#EEF4F9' },
  angry:   { emoji: '😤', label: '화남', color: '#D4857A', bg: '#FDF0EE' },
  tired:   { emoji: '😴', label: '피곤', color: '#B5A0C4', bg: '#F5F0FA' },
};

const RANGE_OPTIONS = [
  { label: '최근 7일', days: 7 },
  { label: '최근 30일', days: 30 },
  { label: '최근 90일', days: 90 },
  { label: '전체', days: null },
];

function MoodBar({ mood, count, total }) {
  const info = MOOD_MAP[mood];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="mood-bar-row">
      <div className="mood-bar-label">
        <span className="mood-bar-emoji">{info?.emoji}</span>
        <span className="mood-bar-name">{info?.label || mood}</span>
      </div>
      <div className="mood-bar-track">
        <div
          className="mood-bar-fill"
          style={{ width: `${pct}%`, background: info?.color || '#ccc' }}
        />
      </div>
      <span className="mood-bar-pct">{pct}%</span>
      <span className="mood-bar-count">({count})</span>
    </div>
  );
}

function MoodCalendarMini({ entries, days = 30 }) {
  const today = new Date();
  const slots = Array.from({ length: days }, (_, i) => {
    const d = subDays(today, days - 1 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const entry = entries.find(e => e.date === dateStr);
    return { dateStr, entry };
  });

  return (
    <div className="mood-calendar-mini">
      {slots.map(({ dateStr, entry }) => {
        const info = entry?.mood ? MOOD_MAP[entry.mood] : null;
        return (
          <div
            key={dateStr}
            className="mood-cell"
            title={entry ? `${dateStr} · ${info?.label || ''}` : dateStr}
            style={{ background: info?.color ? info.color + '99' : 'var(--tan)' }}
          />
        );
      })}
    </div>
  );
}

export default function EmotionAnalysis() {
  const { entries } = useContext(DiaryContext);
  const navigate = useNavigate();
  const [rangeIdx, setRangeIdx] = useState(1);
  const [aiReport, setAiReport] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const range = RANGE_OPTIONS[rangeIdx];

  const filteredEntries = entries.filter(e => {
    if (!range.days) return true;
    const cutoff = subDays(new Date(), range.days);
    try { return isAfter(parseISO(e.date), cutoff); }
    catch { return false; }
  });

  // 감정 통계
  const moodCounts = filteredEntries.reduce((acc, e) => {
    if (e.mood) acc[e.mood] = (acc[e.mood] || 0) + 1;
    return acc;
  }, {});
  const totalMoods = Object.values(moodCounts).reduce((a, b) => a + b, 0);
  const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
  const dominantMood = sortedMoods[0]?.[0];

  // 작성 빈도
  const writingRate = range.days
    ? Math.round((filteredEntries.length / range.days) * 100)
    : null;

  // 요일별 분포
  const weekdayCounts = Array(7).fill(0);
  filteredEntries.forEach(e => {
    try { weekdayCounts[parseISO(e.date).getDay()]++; }
    catch {}
  });
  const maxWeekday = Math.max(...weekdayCounts);
  const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

  // 평균 글자 수
  const avgLength = filteredEntries.length
    ? Math.round(filteredEntries.reduce((sum, e) => sum + (e.content?.length || 0), 0) / filteredEntries.length)
    : 0;

  // AI 감정 분석 리포트
  const handleAiReport = async () => {
    if (!filteredEntries.length) return;
    setAiLoading(true);
    setAiError('');
    setAiReport('');

    try {
      const diaryText = filteredEntries.slice(0, 15).map(e =>
        `[${e.date}] 기분:${e.mood || '없음'} / ${e.title || ''} / ${e.content?.slice(0, 100) || ''}`
      ).join('\n');

      const prompt = `다음은 사용자의 일기 기록입니다:\n\n${diaryText}\n\n위 일기들을 바탕으로 감정 패턴과 심리 상태를 따뜻하고 공감적으로 분석해주세요. 3~4문단으로, 한국어로 작성해주세요. 구체적인 날짜나 내용을 언급하며 개인화된 분석을 해주세요.`;

      const response = await fetch(
        'https://router.huggingface.co/novita/v3/openai/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${HF_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.1-8b-instruct',
            max_tokens: 800,
            messages: [{ role: 'user', content: prompt }],
          }),
        }
      );

      if (!response.ok) throw new Error(`API 오류 (${response.status})`);
      const data = await response.json();
      setAiReport(data.choices?.[0]?.message?.content || '분석 결과를 가져오지 못했어요.');
    } catch (err) {
      setAiError(err.message || '오류가 발생했어요.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="emotion-container">
      <header className="emotion-header">
        <button className="btn-back-emotion" onClick={() => navigate('/')}>← 일기장으로</button>
        <h1 className="emotion-title">감정 분석</h1>
        <div style={{ width: 100 }} />
      </header>

      <div className="emotion-body">
        {/* 기간 선택 */}
        <div className="range-tabs">
          {RANGE_OPTIONS.map((opt, i) => (
            <button
              key={i}
              className={`range-tab${rangeIdx === i ? ' active' : ''}`}
              onClick={() => { setRangeIdx(i); setAiReport(''); }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {filteredEntries.length === 0 ? (
          <div className="emotion-empty">
            <p>📊</p>
            <p>이 기간에 작성된 일기가 없어요</p>
            <button className="btn-write-now" onClick={() => navigate(`/write/${format(new Date(), 'yyyy-MM-dd')}`)}>
              일기 쓰러 가기 →
            </button>
          </div>
        ) : (
          <>
            {/* 요약 카드 */}
            <div className="summary-grid">
              <div className="summary-card">
                <span className="summary-icon">{MOOD_MAP[dominantMood]?.emoji || '📊'}</span>
                <span className="summary-value">{MOOD_MAP[dominantMood]?.label || '-'}</span>
                <span className="summary-label">주요 감정</span>
              </div>
              <div className="summary-card">
                <span className="summary-icon">📝</span>
                <span className="summary-value">{filteredEntries.length}</span>
                <span className="summary-label">작성한 일기</span>
              </div>
              {writingRate !== null && (
                <div className="summary-card">
                  <span className="summary-icon">🔥</span>
                  <span className="summary-value">{writingRate}%</span>
                  <span className="summary-label">작성률</span>
                </div>
              )}
              <div className="summary-card">
                <span className="summary-icon">✍️</span>
                <span className="summary-value">{avgLength}</span>
                <span className="summary-label">평균 글자 수</span>
              </div>
            </div>

            {/* 감정 분포 */}
            <section className="analysis-section">
              <h2 className="section-title">감정 분포</h2>
              {sortedMoods.length === 0 ? (
                <p className="no-data">감정 기록이 없어요</p>
              ) : (
                <div className="mood-bars">
                  {sortedMoods.map(([mood, count]) => (
                    <MoodBar key={mood} mood={mood} count={count} total={totalMoods} />
                  ))}
                </div>
              )}
            </section>

            {/* 감정 히트맵 */}
            <section className="analysis-section">
              <h2 className="section-title">감정 히트맵 <span className="section-sub">최근 30일</span></h2>
              <MoodCalendarMini entries={entries} days={30} />
              <div className="heatmap-legend">
                {Object.entries(MOOD_MAP).map(([key, val]) => (
                  <span key={key} className="legend-item">
                    <span className="legend-dot" style={{ background: val.color }} />
                    {val.label}
                  </span>
                ))}
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: 'var(--tan)' }} />
                  없음
                </span>
              </div>
            </section>

            {/* 요일별 분포 */}
            <section className="analysis-section">
              <h2 className="section-title">요일별 작성 패턴</h2>
              <div className="weekday-chart">
                {weekdayLabels.map((label, i) => (
                  <div key={i} className="weekday-col">
                    <div className="weekday-bar-wrap">
                      <div
                        className="weekday-bar"
                        style={{ height: maxWeekday > 0 ? `${(weekdayCounts[i] / maxWeekday) * 80}px` : '0px' }}
                      />
                    </div>
                    <span className="weekday-label">{label}</span>
                    <span className="weekday-count">{weekdayCounts[i]}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* AI 분석 리포트 */}
            <section className="analysis-section ai-section">
              <div className="ai-section-header">
                <h2 className="section-title">✦ AI 감정 리포트</h2>
                <button
                  className={`btn-ai-report${aiLoading ? ' loading' : ''}`}
                  onClick={handleAiReport}
                  disabled={aiLoading}
                >
                  {aiLoading ? '분석 중...' : aiReport ? '다시 분석' : '분석하기'}
                </button>
              </div>
              {aiLoading && (
                <div className="ai-loading">
                  <span className="dot" /><span className="dot" /><span className="dot" />
                </div>
              )}
              {aiError && <p className="ai-error">⚠️ {aiError}</p>}
              {aiReport && (
                <div className="ai-report">
                  {aiReport.split('\n').map((line, i) => (
                    <p key={i}>{line || <br />}</p>
                  ))}
                </div>
              )}
              {!aiReport && !aiLoading && (
                <p className="ai-placeholder">
                  버튼을 누르면 일기를 바탕으로 AI가 감정 패턴을 분석해드려요 😊
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}