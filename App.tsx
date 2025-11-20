
import React, { useState, useEffect } from 'react';
import { AppView, Story, User, AppSettings } from './types';
import { getStories, getAppSettings } from './services/storyService';
import SceneDisplay from './components/SceneDisplay';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';

function App() {
  const [view, setView] = useState<AppView>('LOGIN');
  const [user, setUser] = useState<User | null>(null);
  
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(getAppSettings());

  // Global Mute State for Main Page -> Player
  const [globalMuted, setGlobalMuted] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setStories(getStories());
    setAppSettings(getAppSettings());
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.role === 'ADMIN') {
      setView('ADMIN_DASHBOARD');
    } else {
      setView('HOME');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('LOGIN');
  };

  const handlePlay = (story: Story) => {
    // Permission Check
    if (user && user.role !== 'ADMIN' && (user.accessLevel || 1) < (story.requiredAccessLevel || 1)) {
        alert(`权限不足: 需要等级 ${story.requiredAccessLevel || 1}，您当前等级为 ${user.accessLevel || 1}`);
        return;
    }
    setSelectedStory(story);
    setView('PLAYER');
  };

  const visibleStories = user?.role === 'ADMIN' 
    ? stories 
    : stories.filter(s => s.isPublished);

  if (view === 'LOGIN') {
    return <Login onLogin={handleLogin} settings={appSettings} />;
  }

  if (view === 'PLAYER' && selectedStory) {
    return (
      <SceneDisplay 
        story={selectedStory} 
        onExit={() => setView('HOME')} 
        initialMuted={globalMuted}
        currentUser={user} // Pass for watermark
      />
    );
  }

  if (view === 'ADMIN_DASHBOARD' && user?.role === 'ADMIN') {
    return (
      <AdminDashboard 
        stories={stories} 
        currentUser={user}
        onBack={handleLogout} 
        onUpdate={loadData}
        onPreview={() => setView('HOME')}
      />
    );
  }

  // User Home
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col text-gray-100">
        {/* Admin Return Button */}
        {user?.role === 'ADMIN' && (
            <div className="fixed top-24 right-4 z-50">
                <button 
                    onClick={() => setView('ADMIN_DASHBOARD')}
                    className="bg-red-600/90 backdrop-blur text-white px-4 py-2 md:px-6 md:py-3 rounded-full font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-2 text-sm"
                >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                    <span className="hidden md:inline">返回后台</span>
                    <span className="md:hidden">后台</span>
                </button>
            </div>
        )}

        {/* Header */}
        <header className="px-4 md:px-8 py-4 md:py-6 flex justify-between items-center sticky top-0 z-30 bg-black/80 backdrop-blur-md transition-all border-b border-white/10">
            <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-6 md:w-10 md:h-7 bg-red-600 rounded-lg flex items-center justify-center shadow-lg">
                   <div className="w-0 h-0 border-t-[4px] md:border-t-[5px] border-t-transparent border-l-[6px] md:border-l-[8px] border-l-white border-b-[4px] md:border-b-[5px] border-b-transparent ml-0.5"></div>
                </div>
                <span className="font-bold text-lg md:text-xl tracking-tight text-white">视觉小说</span>
            </div>
            <div className="flex items-center gap-4 md:gap-6">
                
                {/* Global Mute Toggle */}
                <button 
                    onClick={() => setGlobalMuted(!globalMuted)}
                    className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full transition-all ${globalMuted ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'}`}
                    title={globalMuted ? "已静音" : "声音开启"}
                >
                    {globalMuted ? (
                         <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                    ) : (
                         <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    )}
                </button>

                <div className="h-6 w-px bg-white/10 hidden md:block"></div>

                <div className="text-sm font-medium text-gray-400 hidden md:block">Welcome, {user?.displayName}</div>
                <button onClick={handleLogout} className="text-xs md:text-sm font-bold hover:text-red-500 transition-colors">退出</button>
            </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-8 md:py-12 animate-fadeIn">
            <div className="mb-10 md:mb-16 max-w-2xl">
               <h1 className="text-4xl md:text-6xl font-black mb-4 md:mb-6 leading-tight tracking-tight text-white">
                  {appSettings.homeTitle} <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-purple-600">{appSettings.homeSubtitle}</span>
               </h1>
               <p className="text-base md:text-xl text-gray-400 font-medium">
                  {appSettings.homeDescription}
               </p>
            </div>

            {visibleStories.length === 0 ? (
                <div className="text-center py-20 text-gray-600 border border-dashed border-white/10 rounded-3xl bg-white/5 text-sm md:text-base">
                    暂无发布的视觉小说。
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {visibleStories.map(story => {
                    const isLocked = user?.role !== 'ADMIN' && (user?.accessLevel || 1) < (story.requiredAccessLevel || 1);
                    return (
                        <div 
                            key={story.id}
                            onClick={() => handlePlay(story)}
                            className={`group cursor-pointer relative flex flex-col transform transition-all duration-300 hover:-translate-y-2 ${isLocked ? 'opacity-70' : ''}`}
                        >
                            {/* Card Image */}
                            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-4 shadow-lg bg-gray-800 border border-white/10">
                                <img src={story.coverUrl} className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isLocked ? 'grayscale-[0.8]' : 'opacity-80 group-hover:opacity-100'}`} alt="Cover"/>
                                
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    {isLocked ? (
                                        <div className="bg-black/80 text-white/80 rounded-full px-6 py-3 font-bold shadow-lg flex items-center gap-2 border border-white/10">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                                            权限不足 (Lv.{story.requiredAccessLevel})
                                        </div>
                                    ) : (
                                        <div className="bg-red-600 text-white rounded-full px-6 py-3 font-bold shadow-lg transform scale-90 group-hover:scale-100 transition-transform flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                            开始体验
                                        </div>
                                    )}
                                </div>

                                {isLocked && (
                                    <div className="absolute top-3 right-3 bg-black/80 text-white p-2 rounded-full shadow-lg border border-white/10">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                                    </div>
                                )}
                            </div>

                            <div className="px-1">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`text-lg md:text-xl font-bold transition-colors line-clamp-1 ${isLocked ? 'text-gray-500' : 'text-white group-hover:text-red-500'}`}>{story.title}</h3>
                                    {(story.requiredAccessLevel || 1) > 1 && (
                                        <span className="text-[10px] font-bold bg-purple-900 text-purple-200 px-2 py-1 rounded border border-purple-500/30">Lv.{story.requiredAccessLevel}</span>
                                    )}
                                </div>
                                <p className="text-gray-400 text-xs md:text-sm font-medium leading-relaxed line-clamp-2 h-10">{story.description}</p>
                                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    <span className="bg-white/10 px-2 py-1 rounded flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                                        {story.projectSize || '未知大小'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                </div>
            )}
        </main>
        
        <footer className="py-8 md:py-12 text-center text-gray-600 text-[10px] md:text-xs font-medium border-t border-white/10 mt-12 bg-black px-4">
            {appSettings.footerText}
        </footer>
    </div>
  );
}

export default App;
