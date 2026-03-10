import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DiaryHome from './pages/DiaryHome';
import DiaryWrite from './pages/DiaryWrite';
import DiaryChat from './pages/DiaryChat';
import EmotionAnalysis from './pages/EmotionAnalysis';
import { supabase } from './SupabaseClient';
import './App.css';

export const DiaryContext = React.createContext();

function AppContent() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Supabase에서 일기 불러오기
  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error('일기 불러오기 실패:', err.message);
      // Supabase 실패 시 localStorage 폴백
      try {
        const saved = localStorage.getItem('diary-entries');
        setEntries(saved ? JSON.parse(saved) : []);
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = async (entry) => {
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .upsert({
          date: entry.date,
          title: entry.title || null,
          content: entry.content || null,
          mood: entry.mood || null,
          weather: entry.weather || null,
          tags: entry.tags || [],
          updated_at: new Date().toISOString(),
        }, { onConflict: 'date' })
        .select()
        .single();

      if (error) throw error;

      setEntries(prev => {
        const existing = prev.findIndex(e => e.date === entry.date);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        }
        return [data, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date));
      });
    } catch (err) {
      console.error('일기 저장 실패:', err.message);
      // 폴백: localStorage에 저장
      const updated = entries.filter(e => e.date !== entry.date);
      const newEntries = [entry, ...updated].sort((a, b) => new Date(b.date) - new Date(a.date));
      setEntries(newEntries);
      localStorage.setItem('diary-entries', JSON.stringify(newEntries));
    }
  };

  const deleteEntry = async (date) => {
    try {
      const { error } = await supabase
        .from('diary_entries')
        .delete()
        .eq('date', date);

      if (error) throw error;
      setEntries(prev => prev.filter(e => e.date !== date));
    } catch (err) {
      console.error('일기 삭제 실패:', err.message);
      setEntries(prev => prev.filter(e => e.date !== date));
    }
  };

  return (
    <DiaryContext.Provider value={{ entries, saveEntry, deleteEntry, loading }}>
      <div className="app-shell">
        {loading ? (
          <div className="app-loading">
            <div className="app-loading-inner">
              <span className="app-loading-icon">✦</span>
              <p>일기를 불러오는 중...</p>
            </div>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<DiaryHome />} />
            <Route path="/write/:date?" element={<DiaryWrite />} />
            <Route path="/chat" element={<DiaryChat />} />
            <Route path="/emotion" element={<EmotionAnalysis />} />
          </Routes>
        )}
      </div>
    </DiaryContext.Provider>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}