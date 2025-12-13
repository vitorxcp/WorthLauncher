import React, { useState } from 'react';
import { LauncherProvider } from './context/LauncherContext';
import Sidebar from './components/Sidebar';
import TitleBar from './components/TitleBar';
import Home from './views/Home';
import Social from './views/Social';
import Console from './views/Console';
import Settings from './views/Settings';
import Store from './views/Store';

function AppContent() {
  const [activeTab, setActiveTab] = useState('home');

  const renderView = () => {
    switch(activeTab) {
      case 'home': return <Home />;
      case 'social': return <Social />;
      case 'console': return <Console />;
      case 'settings': return <Settings />;
      case 'store': return <div className="flex items-center justify-center h-full text-gray-500 font-mono">Loja em desenvolvimento...</div>;
      default: return <Home />;
    }
  };

  return (
    <div className="bg-transparent h-screen w-screen overflow-hidden flex flex-col rounded-xl border border-white/10 shadow-2xl text-white font-sans select-none">
       <TitleBar />
       <div className="flex flex-1 overflow-hidden bg-[#0a0a0a] relative">
          {/* Background FX */}
          <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-[url('/assets/background_blur.png')] bg-cover bg-center transform scale-105 filter blur-[2px] opacity-40"></div>
             <div className="absolute inset-0 bg-gradient-to-r from-black via-[#050505]/50 to-[#050505]/40"></div>
          </div>

          <Sidebar activeTab={activeTab} onSwitch={setActiveTab} />
          
          <main className="flex-1 z-10 relative overflow-hidden flex flex-col p-8 no-drag">
             {renderView()}
          </main>
       </div>
       
       {/* Toasts/Modals Globais iriam aqui */}
    </div>
  );
}

export default function App() {
  return (
    <LauncherProvider>
      <AppContent />
    </LauncherProvider>
  );
}