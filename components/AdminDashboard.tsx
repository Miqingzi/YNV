import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Story, Scene, Subtitle, VideoChoice, User, AppSettings } from '../types';
import { saveStory, createEmptyStory, deleteStory, getUsers, saveUser, deleteUser, getAppSettings, saveAppSettings } from '../services/storyService';

interface AdminDashboardProps {
  stories: Story[];
  currentUser: User;
  onBack: () => void;
  onUpdate: () => void;
  onPreview: () => void;
}

type Tab = 'PROJECTS' | 'USERS';

const SettingsModal: React.FC<{
    settings: AppSettings;
    onUpdate: (s: AppSettings) => void;
    onSave: () => void;
    onClose: () => void;
}> = ({ settings, onUpdate, onSave, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white/90 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-8 w-full max-w-lg animate-fadeIn max-h-[90vh] overflow-y-auto">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">系统设置</h3>
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">首页标题</label>
                        <input className="w-full bg-gray-50 border rounded-xl p-3 font-bold" value={settings.homeTitle} onChange={e => onUpdate({...settings, homeTitle: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">副标题</label>
                        <input className="w-full bg-gray-50 border rounded-xl p-3 font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-purple-600" value={settings.homeSubtitle} onChange={e => onUpdate({...settings, homeSubtitle: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">简介</label>
                        <textarea className="w-full bg-gray-50 border rounded-xl p-3 h-24 resize-none" value={settings.homeDescription} onChange={e => onUpdate({...settings, homeDescription: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">页脚文本</label>
                        <input className="w-full bg-gray-50 border rounded-xl p-3 text-xs" value={settings.footerText} onChange={e => onUpdate({...settings, footerText: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">登录页视频 URL</label>
                        <input className="w-full bg-gray-50 border rounded-xl p-3 text-xs font-mono" value={settings.loginBackgroundVideoUrl || ''} onChange={e => onUpdate({...settings, loginBackgroundVideoUrl: e.target.value})} placeholder="留空则使用默认动态背景" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">新用户默认有效期 (天)</label>
                        <input 
                            type="number" 
                            className="w-full bg-gray-50 border rounded-xl p-3 font-mono text-sm" 
                            value={settings.defaultRegistrationDays ?? 0} 
                            onChange={e => onUpdate({...settings, defaultRegistrationDays: parseInt(e.target.value) || 0})} 
                            placeholder="0" 
                        />
                        <p className="text-[10px] text-gray-400 mt-1">0 表示永久有效</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <label className="text-sm font-bold text-gray-700">允许公开注册</label>
                        <input type="checkbox" className="w-5 h-5 accent-black" checked={settings.allowPublicRegistration ?? true} onChange={e => onUpdate({...settings, allowPublicRegistration: e.target.checked})} />
                    </div>
                </div>
                <div className="mt-8 flex gap-4">
                    <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200">取消</button>
                    <button onClick={onSave} className="flex-1 bg-black text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform">保存设置</button>
                </div>
            </div>
        </div>
    );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ stories, currentUser, onBack, onUpdate, onPreview }) => {
  const [currentTab, setCurrentTab] = useState<Tab>('PROJECTS');
  const [showSettings, setShowSettings] = useState(false);
  const [showProjectInfo, setShowProjectInfo] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(getAppSettings());

  // Editor State
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [hoveredDockIndex, setHoveredDockIndex] = useState<number | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const videoInputRef = useRef<HTMLInputElement>(null);
  const bgmInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const loginVideoInputRef = useRef<HTMLInputElement>(null);

  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', displayName: '', accessLevel: 1 as 1|2|3 });
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    if (currentTab === 'USERS') {
      setUsers(getUsers());
    }
  }, [currentTab]);

  // --- Scene Numbering Logic (BFS) ---
  const sceneLabels = useMemo(() => {
      if (!editingStory) return {};
      const labels: Record<string, string> = {};
      const visited = new Set<string>();
      const queue: { id: string, label: string }[] = [];

      const startId = editingStory.initialSceneId;
      if (startId) {
          queue.push({ id: startId, label: "1" });
          visited.add(startId);
      }

      while (queue.length > 0) {
          const { id, label } = queue.shift()!;
          labels[id] = label;
          
          const scene = editingStory.scenes.find(s => s.id === id);
          if (scene) {
              scene.choices.forEach((choice, idx) => {
                  const targetId = choice.targetSceneId;
                  if (targetId && !visited.has(targetId)) {
                      visited.add(targetId);
                      const currentDepth = parseInt(label.split('-')[0]) || 0;
                      const nextLabel = `${currentDepth + 1}-${idx + 1}`;
                      queue.push({ id: targetId, label: nextLabel });
                  }
              });
          }
      }
      return labels;
  }, [editingStory]);
  
  // --- Auto-Scale ---
  const activeScene = editingStory?.scenes.find(s => s.id === activeSceneId);
  useEffect(() => {
      if (activeScene) {
          const branchCount = activeScene.choices.length;
          let targetScale = 1;
          if (branchCount > 6) targetScale = 0.75;
          else if (branchCount > 4) targetScale = 0.85;
          else if (branchCount > 2) targetScale = 0.95;
          else targetScale = 1.05; 
          setTransform(t => ({ ...t, scale: targetScale }));
      }
  }, [activeScene?.id]);

  // --- Canvas Interaction ---
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
        if (!editingStory) return;
        e.preventDefault();
        if (e.altKey) {
            const zoomSensitivity = 0.001;
            const delta = -e.deltaY * zoomSensitivity;
            const newScale = Math.min(Math.max(transform.scale + delta, 0.2), 3);
            setTransform(t => ({ ...t, scale: newScale }));
        } else {
            const panSpeed = 1.5;
            const dx = -(e.deltaY + e.deltaX) * panSpeed;
            setTransform(t => ({ ...t, x: t.x + dx }));
        }
    };
    const canvas = canvasRef.current;
    if (canvas) canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => { if (canvas) canvas.removeEventListener('wheel', handleWheel); };
  }, [editingStory, transform.scale]);

  const handleMouseDown = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'OPTION'].includes(target.tagName) || target.closest('button') || target.closest('input');
      if (!isInteractive && (e.button === 0 || e.button === 1)) { 
        e.preventDefault();
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
  };
  const handleMouseMove = (e: React.MouseEvent) => { if (isDragging.current) { const dx = e.clientX - lastMouse.current.x; const dy = e.clientY - lastMouse.current.y; setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy })); lastMouse.current = { x: e.clientX, y: e.clientY }; } };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => { const file = e.target.files?.[0]; if (file) { const objectUrl = URL.createObjectURL(file); callback(objectUrl); } };
  const handleSaveSettings = () => { saveAppSettings(appSettings); onUpdate(); setShowSettings(false); };
  const handleCreate = () => { const newStory = createEmptyStory(); saveStory(newStory); onUpdate(); setEditingStory(newStory); setActiveSceneId(newStory.initialSceneId); };
  const handleSaveStory = () => { if (editingStory) { saveStory(editingStory); onUpdate(); const btn = document.getElementById('save-btn'); if(btn) { const original = btn.innerText; btn.innerText = "已保存!"; setTimeout(() => btn.innerText = original, 1500); } } };
  const handleDeleteStory = (id: string) => { if (confirm('确定要删除这个项目吗？')) { deleteStory(id); onUpdate(); if (editingStory?.id === id) setEditingStory(null); } };
  const togglePublish = (story: Story) => { const updated = { ...story, isPublished: !story.isPublished }; saveStory(updated); onUpdate(); };
  
  // User Management Handlers
  const handleAddUser = () => {
    if (!newUser.username || !newUser.password) return alert('用户名和密码不能为空');
    const user: User = { 
        id: crypto.randomUUID(), 
        username: newUser.username, 
        password: newUser.password, 
        displayName: newUser.displayName || newUser.username, 
        role: 'USER',
        accessLevel: newUser.accessLevel,
        expiresAt: null // Default permanent
    };
    saveUser(user); setUsers(getUsers()); setNewUser({ username: '', password: '', displayName: '', accessLevel: 1 });
  };

  const handleDeleteUser = (id: string) => { if (id === currentUser.id) return alert('无法删除当前登录账号'); if (confirm('确定删除该用户？')) { deleteUser(id); setUsers(getUsers()); } };
  
  const handleUpdateUser = () => {
      if (editingUser) {
          saveUser(editingUser);
          setUsers(getUsers());
          setEditingUser(null);
      }
  };

  const setExpiration = (days: number | null) => {
      if (!editingUser) return;
      if (days === null) {
          setEditingUser({ ...editingUser, expiresAt: null });
      } else {
          const target = Date.now() + (days * 24 * 60 * 60 * 1000);
          setEditingUser({ ...editingUser, expiresAt: target });
      }
  };

  const updateScene = (updatedScene: Scene) => { if (!editingStory) return; setEditingStory({ ...editingStory, scenes: editingStory.scenes.map(s => s.id === updatedScene.id ? updatedScene : s) }); };
  const createNewLinkedScene = () => { if (!editingStory || !activeScene) return; const newSceneId = crypto.randomUUID(); const newScene: Scene = { id: newSceneId, name: `场景 ${editingStory.scenes.length + 1}`, videoUrl: '', subtitles: [], interactionTime: -1, choices: [] }; const updatedScenes = [...editingStory.scenes, newScene]; const updatedCurrentScene = { ...activeScene, choices: [...activeScene.choices, { id: crypto.randomUUID(), text: '新选项', targetSceneId: newSceneId, color: '#ffffff', hidden: false }] }; setEditingStory({ ...editingStory, scenes: updatedScenes.map(s => s.id === activeScene.id ? updatedCurrentScene : s) }); };
  const parentScenes = editingStory?.scenes.filter(s => s.choices.some(c => c.targetSceneId === activeSceneId)) || [];

  const formatDate = (ts?: number | null) => {
      if (!ts) return <span className="text-green-600 font-bold">永久有效</span>;
      const diff = ts - Date.now();
      const d = new Date(ts);
      const dateStr = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
      
      if (diff < 0) return <span className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded">已过期</span>;
      
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (days <= 3) return <span className="text-orange-500 font-bold">剩 {days} 天 ({dateStr})</span>;
      return <span className="text-gray-600">{dateStr} (剩 {days} 天)</span>;
  };

  if (editingStory) {
      return (
      <div className="h-screen flex flex-col bg-[#f5f5f7] text-[#1d1d1f] font-sans overflow-hidden select-none relative">
        <div className="absolute top-0 left-1/3 w-[800px] h-[800px] bg-blue-400/10 rounded-full mix-blend-multiply filter blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-400/10 rounded-full mix-blend-multiply filter blur-[100px] pointer-events-none"></div>
        
        {showProjectInfo && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white/90 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-8 w-full max-w-lg animate-fadeIn">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">项目详细信息</h3>
                    <div className="space-y-5">
                        <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">项目标题</label><input className="w-full bg-gray-50 border rounded-xl p-3 font-bold outline-none focus:ring-2 ring-blue-500/20" value={editingStory.title} onChange={e => setEditingStory({...editingStory, title: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">剧情简介</label><textarea className="w-full bg-gray-50 border rounded-xl p-3 h-32 resize-none outline-none focus:ring-2 ring-blue-500/20" value={editingStory.description} onChange={e => setEditingStory({...editingStory, description: e.target.value})} /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">项目总大小</label><input className="w-full bg-gray-50 border rounded-xl p-3 font-mono text-blue-600 outline-none focus:ring-2 ring-blue-500/20" value={editingStory.projectSize || ''} placeholder="e.g. 450 MB" onChange={e => setEditingStory({...editingStory, projectSize: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">所需权限等级</label><select className="w-full bg-gray-50 border rounded-xl p-3 outline-none focus:ring-2 ring-blue-500/20" value={editingStory.requiredAccessLevel || 1} onChange={e => setEditingStory({...editingStory, requiredAccessLevel: Number(e.target.value) as 1|2|3})}><option value={1}>等级 1 (普通)</option><option value={2}>等级 2 (高级)</option><option value={3}>等级 3 (VIP)</option></select></div>
                        </div>
                        <div className="border-t pt-4 mt-4">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">封面图</label>
                             <div className="flex items-center gap-4">
                                <img src={editingStory.coverUrl} className="w-20 h-12 object-cover rounded-lg bg-gray-200" />
                                <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (url) => setEditingStory({...editingStory, coverUrl: url}))} />
                                <button onClick={() => coverInputRef.current?.click()} className="text-xs bg-gray-100 px-3 py-2 rounded font-bold hover:bg-gray-200">更改封面</button>
                             </div>
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end"><button onClick={() => setShowProjectInfo(false)} className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform">完成</button></div>
                </div>
            </div>
        )}
        <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-white/20 flex items-center justify-between px-6 shrink-0 z-50 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setEditingStory(null)} className="p-2 hover:bg-black/5 rounded-full text-gray-500 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
            <div className="flex items-center gap-2"><span className="text-lg font-bold text-gray-800 truncate max-w-[200px]">{editingStory.title}</span><button onClick={() => setShowProjectInfo(true)} className="p-1.5 bg-gray-100 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-lg transition-colors" title="编辑项目信息"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button></div>
          </div>
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-white/50 px-4 py-1.5 rounded-full border border-black/5 shadow-sm"><div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">全局 BGM</div><input type="file" ref={bgmInputRef} className="hidden" accept="audio/*" onChange={(e) => handleFileUpload(e, (url) => setEditingStory({...editingStory, bgmUrl: url}))} /><div className="flex items-center gap-2 max-w-[150px] overflow-hidden">{editingStory.bgmUrl ? (<><svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg><span className="text-xs text-green-600 font-bold truncate">已加载音频</span><button onClick={() => setEditingStory({...editingStory, bgmUrl: ''})} className="text-gray-400 hover:text-red-500">×</button></>) : (<button onClick={() => bgmInputRef.current?.click()} className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"><span>+ 上传</span></button>)}</div></div>
              <div className="flex items-center gap-2 border-l pl-4 border-gray-300"><span className="text-[10px] font-bold text-gray-400 uppercase">静音</span><button onClick={() => setPreviewMuted(!previewMuted)} className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${previewMuted ? 'bg-red-500' : 'bg-gray-300'}`} title="预览视频静音"><div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${previewMuted ? 'translate-x-4' : 'translate-x-0'}`} /></button></div>
          </div>
          <div className="flex gap-3"><div className="text-[10px] text-gray-400 flex flex-col justify-center items-end mr-2 hidden md:flex"><span>左键拖拽</span><span>Alt + 滚轮缩放</span></div><button id="save-btn" onClick={handleSaveStory} className="bg-black text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg hover:bg-gray-800 transition-all active:scale-95">保存工程</button></div>
        </header>
        <div className="flex-1 relative bg-transparent overflow-hidden cursor-grab active:cursor-grabbing" ref={canvasRef} id="canvas-bg" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px', transform: `translate(${transform.x % 20}px, ${transform.y % 20}px)`}}></div>
            <div className="absolute top-0 left-0 origin-top-left transition-transform duration-500 ease-out will-change-transform" style={{transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`}}>
                <div className="flex items-center gap-24 min-w-max p-40">
                    <div className="flex flex-col gap-6 justify-center min-w-[200px] transition-all duration-500">
                        {parentScenes.length > 0 ? parentScenes.map(p => (<div key={p.id} onClick={() => setActiveSceneId(p.id)} className="bg-white/80 backdrop-blur border border-white/50 shadow-sm rounded-2xl p-5 w-56 cursor-pointer transform scale-75 opacity-40 blur-[1px] grayscale hover:scale-100 hover:opacity-100 hover:shadow-xl hover:blur-0 hover:grayscale-0 transition-all duration-300 relative group"><div className="text-[10px] text-blue-500 font-bold mb-1 uppercase">来源: {sceneLabels[p.id] || '?'}</div><div className="font-bold text-gray-800 truncate text-sm">{p.name}</div></div>)) : (<div className="text-gray-300 text-xs text-center italic border-2 border-dashed border-gray-200 p-6 rounded-2xl select-none opacity-30 scale-75">起点</div>)}
                    </div>
                    {activeScene ? (
                        <div className="relative z-50 w-[900px] bg-white rounded-[2rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.25)] flex flex-col md:flex-row overflow-hidden ring-4 ring-black/5 transform scale-110 transition-all duration-500">
                             <div className="absolute top-4 left-4 z-20 bg-black/80 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">编号: {sceneLabels[activeScene.id] || 'Start'}</div>
                             <div className="w-full md:w-2/3 aspect-[2.13/1] bg-black relative group border-r border-gray-100">
                                {activeScene.videoUrl ? (<video src={activeScene.videoUrl} className="w-full h-full object-contain" controls muted={previewMuted} />) : (<div className="absolute inset-0 flex items-center justify-center text-gray-500 flex-col gap-3"><div className="w-16 h-16 bg-white/10 rounded-full shadow-sm flex items-center justify-center border border-white/20"><svg className="w-8 h-8 opacity-50 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg></div><span className="text-sm font-medium text-white/50">拖拽或点击上传视频 (2560x1200)</span></div>)}
                                <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-start"><div className="flex-1 mr-4"><input className="w-full bg-white/90 backdrop-blur text-xs text-gray-600 rounded-lg px-3 py-2 border-none focus:ring-2 ring-blue-500 outline-none transition-colors font-mono" value={activeScene.videoUrl} onChange={(e) => updateScene({...activeScene, videoUrl: e.target.value})} placeholder="输入视频链接或上传..." /></div><div className="flex gap-2"><input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={(e) => handleFileUpload(e, (url) => updateScene({...activeScene, videoUrl: url}))} /><button onClick={() => videoInputRef.current?.click()} className="bg-white shadow-md hover:shadow-lg text-gray-700 text-xs px-4 py-2 rounded-lg font-bold transition-all">上传</button>{activeScene.videoUrl && (<button onClick={() => updateScene({...activeScene, videoUrl: ''})} className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-2 rounded-lg font-bold transition-colors">移除</button>)}</div></div>
                            </div>
                            <div className="w-full md:w-1/3 p-8 flex flex-col gap-6 bg-white/50 backdrop-blur-sm"><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">场景名称</label><input className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium" value={activeScene.name} onChange={(e) => updateScene({...activeScene, name: e.target.value})} /></div><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">交互触发点 (秒)</label><div className="flex items-center gap-3"><input type="number" className="w-24 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-blue-600 font-bold font-mono focus:ring-2 focus:ring-blue-500/20 outline-none" value={activeScene.interactionTime} onChange={(e) => updateScene({...activeScene, interactionTime: parseFloat(e.target.value)})} /><span className="text-xs text-gray-400 font-medium">{activeScene.interactionTime === -1 ? '默认: 结尾前3秒' : '指定秒数'}</span></div><div className="mt-2 flex gap-2"><button onClick={() => updateScene({...activeScene, interactionTime: -1})} className={`text-[10px] px-2 py-1 rounded border ${activeScene.interactionTime === -1 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-400'}`}>自动 (结尾-3s)</button></div></div><div className="flex-1 flex items-center justify-center opacity-50"><div className="text-center"><div className="text-4xl mb-2">⚡</div><div className="text-xs text-gray-400 font-bold uppercase">视觉小说 Studio</div></div></div></div>
                        </div>
                    ) : (<div className="w-[600px] h-[300px] flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl bg-white/40 backdrop-blur">请选择或创建一个节点</div>)}
                    <div className="flex flex-col gap-8 justify-center min-w-[250px] pl-16 relative">
                         <div className="absolute left-0 top-4 bottom-4 w-[2px] bg-gradient-to-b from-transparent via-gray-200 to-transparent opacity-50"></div>
                         {activeScene?.choices.map((choice, idx) => { 
                             const targetScene = editingStory.scenes.find(s => s.id === choice.targetSceneId); 
                             return (
                                <div key={choice.id} className={`relative flex items-center group transform scale-90 hover:scale-110 hover:z-10 transition-all duration-300 origin-left ${choice.hidden ? 'opacity-60 grayscale' : ''}`}>
                                    <div className="absolute -left-16 w-16 h-[2px] bg-gray-200 group-hover:bg-blue-300 transition-colors"></div>
                                    <div className="absolute -left-1.5 w-3 h-3 bg-white border-2 border-gray-200 rounded-full group-hover:border-blue-400 transition-colors"></div>
                                    <div className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl p-4 w-72 shadow-lg hover:shadow-2xl hover:border-blue-300 transition-all relative">
                                        <div className="flex justify-between mb-3">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">分支 {idx+1} ({sceneLabels[choice.targetSceneId] || '?'})</span>
                                            <div className="flex gap-1">
                                                <button onClick={() => {
                                                    const newChoices = [...activeScene.choices];
                                                    newChoices[idx] = {...choice, hidden: !choice.hidden};
                                                    updateScene({...activeScene, choices: newChoices});
                                                }} className={`p-1 rounded transition-colors ${choice.hidden ? 'text-gray-400 hover:text-gray-600' : 'text-blue-400 hover:text-blue-600'}`} title={choice.hidden ? "显示按钮" : "隐藏按钮"}>
                                                    {choice.hidden ? (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    )}
                                                </button>
                                                <button onClick={() => updateScene({...activeScene, choices: activeScene.choices.filter(c => c.id !== choice.id)})} className="text-gray-300 hover:text-red-400 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <input className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 transition-colors font-medium" value={choice.text} placeholder="按钮显示的文字" onChange={(e) => { const newChoices = [...activeScene.choices]; newChoices[idx] = {...choice, text: e.target.value}; updateScene({...activeScene, choices: newChoices}); }} />
                                            <div className="relative w-8 h-8 shrink-0">
                                                <input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" value={choice.color || '#ffffff'} onChange={(e) => { const newChoices = [...activeScene.choices]; newChoices[idx] = {...choice, color: e.target.value}; updateScene({...activeScene, choices: newChoices}); }} title="按钮颜色" />
                                                <div className="w-full h-full rounded-lg border border-gray-200 shadow-sm" style={{ backgroundColor: choice.color || '#ffffff' }}></div>
                                            </div>
                                        </div>
                                        <div onClick={() => setActiveSceneId(choice.targetSceneId)} className="w-full h-28 bg-black rounded-xl border border-gray-200 relative cursor-pointer overflow-hidden group-hover:ring-2 ring-blue-500/20 transition-all">
                                            {targetScene?.videoUrl ? (<video src={targetScene.videoUrl} className="w-full h-full object-contain opacity-80" />) : (<div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500 text-xs font-medium">无预览</div>)}
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="bg-white/90 backdrop-blur shadow-sm px-3 py-1 rounded-full text-[10px] text-gray-800 font-bold truncate max-w-[90%]">点击进入编辑</span>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <select className="flex-1 bg-transparent text-xs text-gray-500 font-medium outline-none cursor-pointer hover:text-blue-600 transition-colors" value={choice.targetSceneId} onChange={(e) => { const newChoices = [...activeScene.choices]; newChoices[idx] = {...choice, targetSceneId: e.target.value}; updateScene({...activeScene, choices: newChoices}); }}>
                                                {editingStory.scenes.map(s => (<option key={s.id} value={s.id}>{sceneLabels[s.id]} - {s.name}</option>))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                             ); 
                        })}
                         {activeScene && (<div className="relative flex items-center pl-8 mt-4 opacity-60 hover:opacity-100 transition-opacity"><div className="absolute -left-0 w-8 h-[2px] bg-gray-200 border-t border-dashed border-gray-300"></div><button onClick={createNewLinkedScene} className="flex items-center gap-3 px-6 py-4 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all group transform hover:scale-105"><div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-blue-100 text-gray-400 group-hover:text-blue-500 flex items-center justify-center text-lg transition-colors">+</div><span className="text-xs font-bold text-gray-500 group-hover:text-blue-500">创建新剧情分支</span></button></div>)}
                    </div>
                </div>
            </div>
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl px-4 py-2 flex items-end gap-2 overflow-visible z-20 transition-all duration-200 ease-out">
               {editingStory.scenes.map((s, index) => {
                   let scale = 1;
                   if (hoveredDockIndex !== null) {
                       const distance = Math.abs(hoveredDockIndex - index);
                       if (distance === 0) scale = 1.5;
                       else if (distance === 1) scale = 1.25;
                       else if (distance === 2) scale = 1.1;
                   }
                   const isActive = activeSceneId === s.id;
                   return (
                       <div key={s.id} onMouseEnter={() => setHoveredDockIndex(index)} onMouseLeave={() => setHoveredDockIndex(null)} onClick={() => setActiveSceneId(s.id)} style={{ transform: `scale(${scale})`, transformOrigin: 'bottom center' }} className={`shrink-0 px-4 py-3 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200 ease-out flex flex-col items-center gap-1 min-w-[80px] ${isActive ? 'bg-black text-white shadow-lg z-10' : 'bg-white/50 text-gray-500 hover:bg-white hover:shadow-md'}`}>
                          <span className="text-[8px] opacity-70 uppercase tracking-wider">{sceneLabels[s.id] || '?'}</span>
                          <span className="truncate max-w-[60px]">{s.name}</span>
                       </div>
                   )
               })}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans text-gray-900">
       <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-black mb-2">控制台</h1>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-400">
                  <span>Welcome back, {currentUser.username}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <button onClick={onBack} className="text-red-500 hover:underline">退出登录</button>
              </div>
           </div>
           <div className="flex items-center gap-3">
               <button onClick={() => setShowSettings(true)} className="bg-white border border-gray-200 text-gray-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-sm">系统设置</button>
               <button onClick={onPreview} className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  <span>进入前台</span>
               </button>
           </div>
       </header>

       <main className="max-w-7xl mx-auto">
           {/* Tabs */}
           <div className="flex gap-8 border-b border-gray-200 mb-8">
              <button 
                onClick={() => setCurrentTab('PROJECTS')}
                className={`pb-4 text-sm font-bold tracking-wide uppercase transition-all relative ${currentTab === 'PROJECTS' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
              >
                  项目管理
                  {currentTab === 'PROJECTS' && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-black rounded-t-full"></div>}
              </button>
              <button 
                onClick={() => setCurrentTab('USERS')}
                className={`pb-4 text-sm font-bold tracking-wide uppercase transition-all relative ${currentTab === 'USERS' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
              >
                  用户管理
                  {currentTab === 'USERS' && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-black rounded-t-full"></div>}
              </button>
           </div>

           {currentTab === 'PROJECTS' ? (
               <div className="animate-fadeIn">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <button 
                           onClick={handleCreate}
                           className="aspect-[16/10] border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-black hover:text-black hover:bg-white transition-all group"
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-black group-hover:text-white flex items-center justify-center text-xl mb-3 transition-colors">+</div>
                            <span className="font-bold text-sm">新建视觉小说</span>
                        </button>

                        {stories.map(story => (
                            <div key={story.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative">
                                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                    <img src={story.coverUrl} className="w-full h-full object-cover" alt="" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button onClick={() => { setEditingStory(story); setActiveSceneId(story.initialSceneId); }} className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold hover:scale-105 transition-transform">编辑</button>
                                        <button onClick={() => togglePublish(story)} className={`px-4 py-2 rounded-full text-xs font-bold hover:scale-105 transition-transform ${story.isPublished ? 'bg-yellow-400 text-yellow-900' : 'bg-green-500 text-white'}`}>
                                            {story.isPublished ? '下架' : '发布'}
                                        </button>
                                        <button onClick={() => handleDeleteStory(story.id)} className="bg-red-600 text-white px-4 py-2 rounded-full text-xs font-bold hover:scale-105 transition-transform">删除</button>
                                    </div>
                                    {story.isPublished && <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">已发布</div>}
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-lg mb-1 truncate">{story.title}</h3>
                                    <p className="text-gray-400 text-xs line-clamp-2 mb-4 min-h-[2.5em]">{story.description}</p>
                                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        <span>{new Date(story.createdAt).toLocaleDateString()}</span>
                                        <span>{story.scenes.length} 场景</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                   </div>
               </div>
           ) : (
               <div className="animate-fadeIn max-w-4xl">
                   <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                       <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                           <h3 className="font-bold text-gray-900">注册新用户</h3>
                       </div>
                       <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                           <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">用户名</label><input className="w-full bg-gray-50 border rounded-lg p-2 text-sm" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} /></div>
                           <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">密码</label><input className="w-full bg-gray-50 border rounded-lg p-2 text-sm" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} /></div>
                           <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">权限</label><select className="w-full bg-gray-50 border rounded-lg p-2 text-sm" value={newUser.accessLevel} onChange={e => setNewUser({...newUser, accessLevel: Number(e.target.value) as 1|2|3})}><option value={1}>等级 1</option><option value={2}>等级 2</option><option value={3}>等级 3</option></select></div>
                           <button onClick={handleAddUser} className="bg-black text-white font-bold py-2 rounded-lg text-sm hover:bg-gray-800">添加用户</button>
                       </div>
                   </div>

                   <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">用户</th>
                                    <th className="px-6 py-4">角色</th>
                                    <th className="px-6 py-4">权限等级</th>
                                    <th className="px-6 py-4">有效期</th>
                                    <th className="px-6 py-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{u.displayName || u.username}</div>
                                            <div className="text-xs text-gray-400">@{u.username}</div>
                                        </td>
                                        <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                                        <td className="px-6 py-4"><span className="font-mono font-bold text-blue-600">Lv.{u.accessLevel}</span></td>
                                        <td className="px-6 py-4 text-xs">{formatDate(u.expiresAt)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => setEditingUser(u)} className="text-gray-400 hover:text-blue-600 font-bold text-xs">编辑</button>
                                                {u.role !== 'ADMIN' && <button onClick={() => handleDeleteUser(u.id)} className="text-gray-400 hover:text-red-600 font-bold text-xs">删除</button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                   </div>
               </div>
           )}
       </main>

       {showSettings && (
            <SettingsModal 
                settings={appSettings} 
                onUpdate={setAppSettings} 
                onSave={handleSaveSettings} 
                onClose={() => setShowSettings(false)} 
            />
        )}

        {/* User Editing Modal */}
        {editingUser && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white/90 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-8 w-full max-w-lg animate-fadeIn">
                     <h3 className="text-2xl font-bold text-gray-900 mb-6">编辑用户: {editingUser.username}</h3>
                     <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-xs font-bold text-gray-400 uppercase mb-2">显示名称</label>
                                 <input className="w-full bg-gray-50 border rounded-xl p-3 text-sm font-bold" value={editingUser.displayName || ''} onChange={e => setEditingUser({...editingUser, displayName: e.target.value})} />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-gray-400 uppercase mb-2">重置密码</label>
                                 <input className="w-full bg-gray-50 border rounded-xl p-3 text-sm font-mono" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} placeholder="输入新密码" />
                             </div>
                        </div>
                        
                        <div className="border-t border-gray-100 pt-4">
                             <label className="block text-xs font-bold text-gray-400 uppercase mb-3">权限设置</label>
                             <div className="flex gap-2 mb-4">
                                 {[1, 2, 3].map(level => (
                                     <button key={level} onClick={() => setEditingUser({...editingUser, accessLevel: level as 1|2|3})} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${editingUser.accessLevel === level ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>等级 {level}</button>
                                 ))}
                             </div>
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                             <label className="block text-xs font-bold text-gray-400 uppercase mb-3">账户有效期: {formatDate(editingUser.expiresAt)}</label>
                             <div className="grid grid-cols-4 gap-2 mb-3">
                                 <button onClick={() => setExpiration(1)} className="py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100">+1 天</button>
                                 <button onClick={() => setExpiration(7)} className="py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100">+1 周</button>
                                 <button onClick={() => setExpiration(30)} className="py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100">+1 月</button>
                                 <button onClick={() => setExpiration(null)} className="py-2 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100">永久</button>
                             </div>
                             <div className="flex items-center gap-2">
                                 <span className="text-xs text-gray-400">指定日期:</span>
                                 <input type="date" className="bg-gray-50 border rounded px-2 py-1 text-xs" onChange={(e) => { if(e.target.valueAsNumber) setEditingUser({...editingUser, expiresAt: e.target.valueAsNumber}) }} />
                             </div>
                        </div>
                     </div>
                     <div className="mt-8 flex gap-4">
                         <button onClick={() => setEditingUser(null)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200">取消</button>
                         <button onClick={handleUpdateUser} className="flex-1 bg-black text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform">保存修改</button>
                     </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AdminDashboard;