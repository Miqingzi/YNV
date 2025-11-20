import React, { useState } from 'react';
import { User, AppSettings } from '../types';
import { validateUser, registerUser } from '../services/storyService';

interface LoginProps {
  onLogin: (user: User) => void;
  settings: AppSettings;
}

const Login: React.FC<LoginProps> = ({ onLogin, settings }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
        if (mode === 'LOGIN') {
            try {
                const user = validateUser(username, password);
                if (user) {
                  onLogin(user);
                } else {
                  setError('账号或密码错误');
                  setIsLoading(false);
                }
            } catch (err: any) {
                if (err.message === "ACCOUNT_EXPIRED") {
                    setError('您的账号已过期，请联系管理员续费');
                } else {
                    setError('登录系统错误');
                }
                setIsLoading(false);
            }
        } else {
            // Registration Logic
            if (!username || !password) {
                setError('请输入完整的注册信息');
                setIsLoading(false);
                return;
            }
            if (password !== confirmPassword) {
                setError('两次输入的密码不一致');
                setIsLoading(false);
                return;
            }

            try {
                const newUser = registerUser(username, password);
                onLogin(newUser);
            } catch (err: any) {
                if (err.message === "USERNAME_TAKEN") {
                    setError('该账号已被注册，请更换');
                } else if (err.message === "REGISTRATION_CLOSED") {
                    setError('管理员暂时关闭了注册功能');
                } else {
                    setError('注册失败，请重试');
                }
                setIsLoading(false);
            }
        }
    }, 800);
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-black text-white font-sans">
      
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
          {settings?.loginBackgroundVideoUrl ? (
              <video 
                src={settings.loginBackgroundVideoUrl} 
                autoPlay 
                muted={isMuted}
                loop 
                playsInline 
                className="w-full h-full object-cover opacity-50"
              />
          ) : (
             <div className="w-full h-full bg-gradient-to-br from-gray-900 via-black to-gray-900">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-900/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse"></div>
             </div>
          )}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
      </div>

      {/* Mute Toggle */}
      {settings?.loginBackgroundVideoUrl && (
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="absolute top-6 right-6 z-20 p-3 rounded-full bg-white/10 backdrop-blur hover:bg-white/20 text-white transition-all border border-white/10"
            title={isMuted ? "开启声音" : "静音"}
          >
            {isMuted ? (
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
            ) : (
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
            )}
          </button>
      )}

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md p-8 animate-fadeIn">
        
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-14 mx-auto mb-6 bg-red-600 rounded-xl shadow-2xl shadow-red-900/50 flex items-center justify-center transform hover:scale-105 transition-transform duration-500">
             <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
          </div>
          <h1 className="text-3xl font-black tracking-tighter mb-1">视觉小说</h1>
          <p className="text-gray-400 text-xs font-bold tracking-widest uppercase opacity-80">可选性视觉高潮</p>
        </div>

        {/* Toggle Mode */}
        {settings.allowPublicRegistration && (
            <div className="flex justify-center mb-8">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-1 flex w-full border border-white/10">
                    <button 
                        onClick={() => { setMode('LOGIN'); setError(''); }}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'LOGIN' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        登录
                    </button>
                    <button 
                        onClick={() => { setMode('REGISTER'); setError(''); }}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'REGISTER' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        注册
                    </button>
                </div>
            </div>
        )}

        {/* Standard Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all text-sm backdrop-blur-sm"
              placeholder={mode === 'REGISTER' ? "设置账号" : "账号"}
            />
          </div>
          
          <div className="space-y-1">
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all text-sm backdrop-blur-sm"
              placeholder={mode === 'REGISTER' ? "设置密码" : "密码"}
            />
          </div>

          {mode === 'REGISTER' && (
              <div className="space-y-1 animate-fadeIn">
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all text-sm backdrop-blur-sm"
                  placeholder="确认密码"
                />
              </div>
          )}

          {error && (
            <div className="text-red-500 text-xs font-bold text-center py-2 animate-shake bg-red-500/10 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/20 transform transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '请稍候...' : (mode === 'LOGIN' ? '进入系统' : '立即注册 (Lv.1)')}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-12 flex flex-col items-center gap-4">
          <div className="flex gap-6">
              <a href="https://t.me/chiyupmvs" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#0088cc] transition-colors transform hover:scale-110">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm5.225 8.853c-.4 4.251-2.016 13.505-2.271 15.035-.12.715-.396.893-.65.915-.548.048-1.003-.375-1.556-.741-.868-.574-1.362-.931-2.206-1.49-.975-.645-.344-1.003.213-1.584l.012-.014c.826-1.1 3.051-4.075 3.11-4.348.008-.035.015-.15-.055-.212-.071-.063-.176-.042-.252-.024-.108.025-1.83.686-5.162 1.804-.489.165-.933.246-1.33.24-.588-.009-1.72-.332-2.56-.608-.85-.28-1.01-.43-1.04-.696.032-.287.435-.58.94-.782 3.695-1.61 6.16-2.672 7.394-3.187 3.515-1.465 4.246-1.72 4.724-1.729.104-.002.336.025.486.147.128.103.163.242.179.34.016.099.024.285.012.45z"/></svg>
              </a>
              <a href="https://x.com/chiyupmvs" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors transform hover:scale-110">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
          </div>
      </div>

    </div>
  );
};

export default Login;