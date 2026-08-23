import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaBars, FaUserCircle, FaMoon, FaSun, FaRobot } from 'react-icons/fa';
import AIAssistantModal from './AIAssistantModal';

const Header = ({ toggleSidebar, isSidebarOpen }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [isAiModalOpen, setAiModalOpen] = useState(false);

  useEffect(() => {
    const savedSettings = JSON.parse(localStorage.getItem("userSettings"));
    if (savedSettings && savedSettings.darkMode) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    const existingSettings = JSON.parse(localStorage.getItem("userSettings")) || {};
    localStorage.setItem("userSettings", JSON.stringify({ ...existingSettings, darkMode: newDarkMode }));
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-3.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-sm border-b border-slate-200/80 dark:border-slate-700/80 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : ''}`}>
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleSidebar} 
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 text-xl text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <FaBars />
          </button>
          <Link to="/Home" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-teal-500 flex items-center justify-center text-white font-black text-lg shadow-sm">
              M
            </div>
            <div>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">MedStock</span>
              <span className="text-xs ml-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold tracking-wide uppercase">AI Active</span>
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-1.5">
          <Link to="/Home" className="text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-primary-600 dark:hover:text-primary-400 px-3.5 py-2 rounded-xl transition-all font-medium text-sm">Home</Link>
          <Link to="/Home#features" className="text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-primary-600 dark:hover:text-primary-400 px-3.5 py-2 rounded-xl transition-all font-medium text-sm">Features</Link>
          <Link to="/Reports" className="text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-primary-600 dark:hover:text-primary-400 px-3.5 py-2 rounded-xl transition-all font-medium text-sm">Analytics</Link>
          
          <Link to="/PrescriptionScanner" className="text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:text-primary-600 dark:hover:text-primary-400 px-3.5 py-2 rounded-xl transition-all font-semibold text-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
            Scan Rx
          </Link>

          {/* AI Copilot Launch Button */}
          <button
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 ml-1 bg-gradient-to-r from-primary-600 via-primary-700 to-teal-600 hover:from-primary-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105"
          >
            <FaRobot className="text-sm animate-pulse" />
            <span>AI Assistant</span>
          </button>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
          
          <button 
            onClick={toggleDarkMode} 
            className="text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
            title="Toggle Dark Mode"
          >
            {darkMode ? <FaSun className="text-lg text-amber-400" /> : <FaMoon className="text-lg" />}
          </button>
          
          <Link 
            to="/Profile" 
            className="text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors" 
            title="Profile"
          >
            <FaUserCircle className="text-2xl" />
          </Link>
        </nav>
      </header>

      <AIAssistantModal isOpen={isAiModalOpen} onClose={() => setAiModalOpen(false)} />
    </>
  );
};

export default Header;
