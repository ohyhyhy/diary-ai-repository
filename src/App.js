import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import DiaryHome from './pages/DiaryHome';
import DiaryWrite from './pages/DiaryWrite';
import DiaryChat from './pages/DiaryChat';
import './App.css';

export const DiaryContext = React.createContext();

function AppContent() {
  const [entries, setEntries] = useState(() => {
    try {
      const saved = localStorage.getItem('diary-entries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('diary-entries', JSON.stringify(entries));
  }, [entries]);

  const saveEntry = (entry) => {
    setEntries(prev => {
      const existing = prev.findIndex(e => e.date === entry.date);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = entry;
        return updated;
      }
      return [entry, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
  };

  const deleteEntry = (date) => {
    setEntries(prev => prev.filter(e => e.date !== date));
  };

  return (
    <DiaryContext.Provider value={{ entries, saveEntry, deleteEntry }}>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<DiaryHome />} />
          <Route path="/write/:date?" element={<DiaryWrite />} />
          <Route path="/chat" element={<DiaryChat />} />
        </Routes>
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