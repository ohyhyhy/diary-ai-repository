import React, { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DiaryContext } from '../App';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import './DiaryChat.css';

const SYSTEM_PROMPT = (diaryContext) => `당신은 사용자의 일기를 읽고 공감하며 대화하는 따뜻한 AI 친구입니다.
아래는 사용자의 일기 기록입니다. 이 내용을 바탕으로 사용자와 자연스럽고 따뜻하게 대화해주세요.

일기 기록:
${diaryContext}

대화 지침:
- 따뜻하고 공감적인 어투로 대화하세요
- 일기 내용을 기억하고 관련 내용을 자연스럽게 언급하세요
- 너무 길지 않게, 친근한 친구처럼 대화하세요
- 사용자의 감정과 경험에 공감하고 관심을 가져주세요
- 한국어로 대화하세요`;

const HF_API_KEY = process.env.REACT_APP_HF_API_KEY || '';

function formatDiaryContext(entries) {
  if (!entries || entries.length === 0) return '아직 작성된 일기가 없습니다.';
  return entries.slice(0, 20).map(entry => {
    const dateStr = (() => {
      try { return format(parseISO(entry.date), 'yyyy년 M월 d일', { locale: ko }); }
      catch { return entry.date; }
    })();
    return `[${dateStr}${entry.mood ? ` / 기분: ${entry.mood}` : ''}${entry.weather ? ` / 날씨: ${entry.weather}` : ''}]
제목: ${entry.title || '(제목 없음)'}
내용: ${entry.content || '(내용 없음)'}
${entry.tags?.length ? `태그: ${entry.tags.map(t => '#' + t).join(' ')}` : ''}`.trim();
  }).join('\n\n---\n\n');
}

const SUGGESTED_QUESTIONS = [
  '최근에 내가 어떤 감정을 많이 느꼈어?',
  '요즘 나의 일상은 어때 보여?',
  '내 일기에서 반복되는 주제가 있어?',
  '내가 가장 행복했던 날은 언제야?',
];

const STORAGE_KEY = 'diary-chat-sessions';

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export default function DiaryChat() {
  const { entries } = useContext(DiaryContext);
  const navigate = useNavigate();

  const initMessage = {
    role: 'assistant',
    content: entries.length > 0
      ? `안녕하세요! 😊 저는 당신의 일기를 읽었어요. ${entries.length}개의 일기를 통해 당신의 이야기를 알게 됐어요. 무엇이든 편하게 이야기해보세요.`
      : '안녕하세요! 😊 아직 일기가 없네요. 일기를 쓰고 나면 그 내용을 바탕으로 대화할 수 있어요. 먼저 일기를 써보세요!',
  };

  const [sessions, setSessions] = useState(loadSessions);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([initMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    const userMessage = (text || input).trim();
    if (!userMessage || loading) return;

    setInput('');
    setError('');
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const diaryContext = formatDiaryContext(entries);
      const systemPrompt = SYSTEM_PROMPT(diaryContext);

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...newMessages
          .filter((_, i) => !(i === 0 && newMessages[0].role === 'assistant'))
          .map(m => ({ role: m.role, content: m.content })),
      ];

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
            max_tokens: 1000,
            messages: apiMessages,
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `API 오류 (${response.status})`);
      }

      const data = await response.json();
      const assistantText = data.choices?.[0]?.message?.content || '응답을 받지 못했어요.';
      const finalMessages = [...newMessages, { role: 'assistant', content: assistantText }];
      setMessages(finalMessages);
    } catch (err) {
      setError(err.message || '오류가 발생했습니다. 다시 시도해주세요.');
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  };

  // 대화 저장
  const handleSave = () => {
    const realMessages = messages.filter(m => !(messages.indexOf(m) === 0 && m.role === 'assistant'));
    if (realMessages.length === 0) return;

    const now = new Date();
    const session = {
      id: currentSessionId || Date.now().toString(),
      title: messages.find(m => m.role === 'user')?.content?.slice(0, 30) || '대화',
      date: format(now, 'yyyy-MM-dd HH:mm'),
      messages,
    };

    const updated = currentSessionId
      ? sessions.map(s => s.id === currentSessionId ? session : s)
      : [session, ...sessions];

    setSessions(updated);
    saveSessions(updated);
    setCurrentSessionId(session.id);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  // 새 대화 시작
  const handleNewChat = () => {
    setMessages([initMessage]);
    setCurrentSessionId(null);
    setError('');
    setShowHistory(false);
  };

  // 과거 대화 불러오기
  const handleLoadSession = (session) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setShowHistory(false);
    setError('');
  };

  // 대화 삭제
  const handleDeleteSession = (id, e) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    saveSessions(updated);
    if (currentSessionId === id) {
      setMessages([initMessage]);
      setCurrentSessionId(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasRealMessages = messages.length > 1;

  return (
    <div className="chat-container">
      {/* Header */}
      <header className="chat-header">
        <button className="btn-back-chat" onClick={() => navigate('/')}>
          ← 일기장으로
        </button>
        <div className="chat-header-info">
          <div className="chat-avatar">💬</div>
          <div>
            <h2 className="chat-title">일기 AI 친구</h2>
            <p className="chat-sub">{entries.length}개의 일기를 기억하고 있어요</p>
          </div>
        </div>
        <div className="chat-header-right">
          <button className="btn-history" onClick={() => setShowHistory(true)} title="대화 기록">
            🗂️ <span>{sessions.length}</span>
          </button>
          <button className="btn-new-chat" onClick={handleNewChat} title="새 대화">
            ✏️
          </button>
          <button
            className={`btn-save-chat${!hasRealMessages ? ' disabled' : ''}`}
            onClick={handleSave}
            disabled={!hasRealMessages}
            title="대화 저장"
          >
            {savedToast ? '✓ 저장됨' : '저장'}
          </button>
        </div>
      </header>

      {/* History Panel */}
      {showHistory && (
        <div className="history-overlay" onClick={() => setShowHistory(false)}>
          <div className="history-panel" onClick={e => e.stopPropagation()}>
            <div className="history-header">
              <h3>저장된 대화</h3>
              <button className="history-close" onClick={() => setShowHistory(false)}>✕</button>
            </div>
            {sessions.length === 0 ? (
              <div className="history-empty">
                <p>저장된 대화가 없어요</p>
                <p className="history-empty-sub">대화 후 저장 버튼을 눌러보세요</p>
              </div>
            ) : (
              <div className="history-list">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className={`history-item${currentSessionId === session.id ? ' active' : ''}`}
                    onClick={() => handleLoadSession(session)}
                  >
                    <div className="history-item-info">
                      <p className="history-item-title">{session.title}</p>
                      <p className="history-item-date">{session.date} · {session.messages.length - 1}개 메시지</p>
                    </div>
                    <button
                      className="history-item-delete"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="messages-container">
        {messages.map((msg, i) => (
          <div key={i} className={`message-wrapper ${msg.role}`} style={{ animationDelay: `${i * 0.05}s` }}>
            {msg.role === 'assistant' && <div className="avatar-ai">✦</div>}
            <div className={`message-bubble ${msg.role}`}>
              {msg.content.split('\n').map((line, j) => (
                <React.Fragment key={j}>
                  {line}
                  {j < msg.content.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message-wrapper assistant">
            <div className="avatar-ai">✦</div>
            <div className="message-bubble assistant loading">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}

        {error && <div className="error-banner">⚠️ {error}</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && entries.length > 0 && (
        <div className="suggestions">
          <p className="suggestions-label">이런 걸 물어볼 수 있어요</p>
          <div className="suggestions-row">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button key={i} className="suggestion-chip" onClick={() => handleSend(q)}>{q}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="chat-input-area">
        <div className="input-wrapper">
          <textarea
            className="chat-textarea"
            placeholder={entries.length > 0 ? "일기에 대해 무엇이든 물어보세요..." : "먼저 일기를 작성해주세요"}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || entries.length === 0}
            rows={1}
          />
          <button
            className={`btn-send${!input.trim() || loading ? ' disabled' : ''}`}
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
          >↑</button>
        </div>
        <p className="input-hint">Enter로 전송 · Shift+Enter로 줄바꿈</p>
      </div>
    </div>
  );
}