
import React, { useState, useEffect, useRef } from 'react';
import { Story, Scene, User } from '../types';

interface PlayerProps {
  story: Story;
  onExit: () => void;
  initialMuted?: boolean;
  currentUser?: User | null; 
}

const SceneDisplay: React.FC<PlayerProps> = ({ story, onExit, initialMuted = false, currentUser }) => {
  // Helpers
  const getScene = (id: string) => story.scenes.find(s => s.id === id);

  // State
  const [currentSceneId, setCurrentSceneId] = useState(story.initialSceneId);
  const [currentScene, setCurrentScene] = useState<Scene | undefined>(getScene(story.initialSceneId));
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Interaction State
  const [showChoices, setShowChoices] = useState(false);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isEnded, setIsEnded] = useState(false);
  
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [hasStarted, setHasStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(initialMuted); 
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  
  // Watermark Position State
  const [watermarkPos, setWatermarkPos] = useState({ top: '10%', left: '10%' });
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgmRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Watermark Movement Effect
  useEffect(() => {
      if (!currentUser) return;
      const interval = setInterval(() => {
          const top = Math.floor(Math.random() * 80) + 10; // 10% - 90%
          const left = Math.floor(Math.random() * 80) + 10;
          setWatermarkPos({ top: `${top}%`, left: `${left}%` });
      }, 5000); // Move every 5 seconds
      return () => clearInterval(interval);
  }, [currentUser]);

  // Effect: Handle BGM (Global)
  useEffect(() => {
      if (bgmRef.current && story.bgmUrl) {
          bgmRef.current.volume = 0.3;
          bgmRef.current.muted = isMuted;
          if (hasStarted) {
            const playPromise = bgmRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => console.log("BGM Autoplay blocked", e));
            }
          }
      }
  }, [story.bgmUrl, hasStarted, isMuted]);

  // Effect: Sync Mute to Video
  useEffect(() => {
      if (videoRef.current) {
          videoRef.current.muted = isMuted;
      }
  }, [isMuted, currentSceneId]);

  // Effect: Scene Change
  useEffect(() => {
    const scene = getScene(currentSceneId);
    setCurrentScene(scene);
    
    // Reset states
    setShowChoices(false);
    setSelectedChoiceId(null);
    setCountdown(null);
    setIsEnded(false);
    setCurrentTime(0);
    setDuration(0);
    setCurrentSubtitle('');
    setIsVideoLoading(true);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
  }, [currentSceneId, story]);

  // Filter choices: Only show those NOT hidden
  const visibleChoices = currentScene?.choices.filter(c => !c.hidden) || [];

  // Effect: Subtitle Logic & Interaction Check
  useEffect(() => {
    if (!currentScene) return;

    // 1. Subtitles
    if (story.showSubtitles) {
        const activeSub = currentScene.subtitles.find(
          sub => currentTime >= sub.startTime && currentTime <= sub.endTime
        );
        setCurrentSubtitle(activeSub ? activeSub.text : '');
    }

    // 2. Check Interaction Trigger
    // Use visibleChoices length to determine if we should pause/show menu
    if (!showChoices && !selectedChoiceId && visibleChoices.length > 0) {
       let triggerTime = currentScene.interactionTime;
       
       if (triggerTime === -1 && duration > 0) {
           triggerTime = Math.max(0, duration - 3);
       }

       if (triggerTime >= 0 && currentTime >= triggerTime) {
          handleInteractionTrigger();
       }
    }
  }, [currentTime, duration, currentScene, showChoices, selectedChoiceId, story.showSubtitles, visibleChoices.length]);

  const handleStart = () => {
      setHasStarted(true);
      if (videoRef.current) videoRef.current.play();
      if (bgmRef.current && story.bgmUrl) bgmRef.current.play();
  };

  const handleInteractionTrigger = () => {
    setShowChoices(true);
    setCountdown(3);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
        setCountdown(prev => {
            if (prev === null || prev <= 1) {
                clearInterval(timerRef.current!);
                return 0;
            }
            return prev - 1;
        });
    }, 1000);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (!duration && videoRef.current.duration) {
          setDuration(videoRef.current.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
      if (videoRef.current) {
          setDuration(videoRef.current.duration);
      }
  };

  const handleChoice = (targetId: string) => {
      setSelectedChoiceId(targetId);
      setCountdown(null); 
      if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleVideoEnded = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (selectedChoiceId) {
        setCurrentSceneId(selectedChoiceId);
    }
    else if (currentScene && visibleChoices.length > 0) {
        // Auto-select first visible choice
        setCurrentSceneId(visibleChoices[0].targetSceneId);
    }
    else {
        setIsEnded(true);
    }
  };

  // Loading handlers
  const handleWaiting = () => setIsVideoLoading(true);
  const handleCanPlay = () => setIsVideoLoading(false);
  const handlePlaying = () => setIsVideoLoading(false);

  // Helper to convert hex to rgba for background tint
  const hexToRgba = (hex: string, alpha: number) => {
    let c: any;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length=== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
    }
    return `rgba(255,255,255,${alpha})`; // Fallback
  }

  if (!currentScene) return <div className="bg-black h-screen text-white flex items-center justify-center">场景丢失</div>;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans select-none flex items-center justify-center">
      
      {/* Global BGM Player */}
      {story.bgmUrl && (
          <audio ref={bgmRef} src={story.bgmUrl} loop muted={isMuted} />
      )}

      {/* Main Content Container constrained to Aspect Ratio */}
      <div 
        className="relative bg-black shadow-2xl overflow-hidden"
        style={{ 
            aspectRatio: '2560 / 1200',
            width: '100%',
            maxWidth: 'calc(100vh * (2560 / 1200))' // Constrain width to match max viewport height at ratio
        }}
      >
          {/* Video Element */}
          <video
            key={currentScene.id}
            ref={videoRef}
            className="w-full h-full object-contain pointer-events-none"
            src={currentScene.videoUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleVideoEnded}
            onWaiting={handleWaiting}
            onCanPlay={handleCanPlay}
            onPlaying={handlePlaying}
            onLoadStart={handleWaiting}
            autoPlay={hasStarted}
            muted={isMuted}
            playsInline
            disablePictureInPicture
            controls={false}
            controlsList="nodownload noremoteplayback nofullscreen"
            style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
          />
          
          {/* Loading Indicator */}
          {isVideoLoading && hasStarted && (
              <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/20 backdrop-blur-sm transition-opacity">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin shadow-lg"></div>
              </div>
          )}

          {/* Dynamic Watermark */}
          {currentUser && hasStarted && (
              <div 
                  className="absolute z-20 text-white/30 font-mono text-xs md:text-sm pointer-events-none select-none whitespace-nowrap transition-all duration-[5000ms] ease-in-out"
                  style={{ top: watermarkPos.top, left: watermarkPos.left }}
              >
                  {currentUser.displayName || currentUser.username} (ID: {currentUser.username})
              </div>
          )}

          {/* Shield */}
          <div className="absolute inset-0 z-10 bg-transparent" onContextMenu={(e) => e.preventDefault()}></div>

          {/* Subtitles */}
          <div className={`absolute bottom-16 md:bottom-24 w-full flex justify-center pointer-events-none z-20 px-4 transition-opacity duration-500 ${showChoices ? 'opacity-0' : 'opacity-100'}`}>
             {currentSubtitle && (
                 <div className="bg-black/60 backdrop-blur-sm px-4 py-2 md:px-6 md:py-3 rounded-xl text-white text-sm md:text-2xl font-medium shadow-lg text-center max-w-[90%] md:max-w-4xl leading-relaxed border border-white/5">
                     {currentSubtitle}
                 </div>
             )}
          </div>

          {/* Choices Overlay */}
          {(showChoices || selectedChoiceId) && visibleChoices.length > 0 && (
            <div className="absolute inset-0 z-30 flex flex-col justify-end pb-8 md:pb-16 animate-fadeIn bg-gradient-to-t from-black/80 via-transparent to-transparent" onContextMenu={(e) => e.preventDefault()}>
               <div className="w-full max-w-5xl mx-auto px-4 md:px-6 flex flex-col gap-3 md:gap-4 items-center">
                  
                  {!selectedChoiceId ? (
                      <div className="mb-2 md:mb-4 flex flex-col items-center gap-2 animate-pulse">
                           <div className="text-white/60 text-xs md:text-sm font-bold tracking-widest uppercase drop-shadow-md">做出选择</div>
                           {countdown !== null && countdown > 0 && (
                               <div className="text-2xl md:text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                                   {countdown}
                               </div>
                           )}
                      </div>
                  ) : (
                      <div className="mb-4 md:mb-6 bg-white/5 backdrop-blur px-4 py-1 md:px-6 md:py-2 rounded-full text-white text-xs md:text-base font-bold border border-white/10 animate-pulse">
                          已锁定
                      </div>
                  )}

                  {/* Buttons Container: Mobile Grid (2 cols), Desktop Flex */}
                  <div className={`w-full grid grid-cols-2 gap-3 md:flex md:flex-wrap md:justify-center md:gap-6 transition-all duration-500 ${selectedChoiceId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    {visibleChoices.map((choice, idx) => {
                        const isSelected = selectedChoiceId === choice.targetSceneId;
                        const customColor = choice.color || '#ffffff';
                        
                        return (
                            <button
                                key={choice.id}
                                onClick={() => handleChoice(choice.targetSceneId)}
                                style={{
                                    borderColor: isSelected ? customColor : (choice.color ? hexToRgba(customColor, 0.4) : 'rgba(255,255,255,0.1)'),
                                    backgroundColor: isSelected ? hexToRgba(customColor, 0.6) : (choice.color ? hexToRgba(customColor, 0.05) : 'rgba(255,255,255,0.01)'), // Lower alpha for transparency
                                    color: isSelected ? '#fff' : '#fff',
                                    boxShadow: isSelected ? `0 0 25px ${hexToRgba(customColor, 0.4)}` : 'none'
                                }}
                                className={`group relative overflow-hidden backdrop-blur-sm border 
                                    py-4 md:px-8 md:py-5 
                                    rounded-full 
                                    text-sm md:text-lg 
                                    font-bold transition-all transform 
                                    w-full md:w-auto md:min-w-[240px] 
                                    text-center
                                    active:scale-95
                                    shadow-lg
                                    ${!isSelected && 'hover:scale-105 hover:bg-white/5 hover:border-white/30'}
                                `}
                            >
                                <span className="relative z-10 drop-shadow-md">{choice.text}</span>
                            </button>
                        );
                    })}
                  </div>
               </div>
            </div>
          )}

          {/* End of Story Overlay */}
          {(isEnded || (showChoices && visibleChoices.length === 0)) && !selectedChoiceId && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 animate-fadeIn">
                  <div className="text-center">
                      <h1 className="text-4xl font-black text-white mb-8 tracking-widest uppercase">Fin.</h1>
                      <button 
                        onClick={onExit} 
                        className="bg-white text-black px-8 py-4 rounded-full font-bold hover:scale-105 transition-transform"
                      >
                        返回主页
                      </button>
                  </div>
              </div>
          )}

          {/* Start Overlay */}
          {!hasStarted && (
              <div 
                className="absolute inset-0 flex items-center justify-center z-40 bg-black/80 cursor-pointer backdrop-blur-sm transition-colors"
                onClick={handleStart}
                onContextMenu={(e) => e.preventDefault()}
              >
                  <div className="flex flex-col items-center gap-4 animate-fadeIn">
                    <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-110 transition-transform group hover:bg-white/20">
                        <svg className="w-10 h-10 text-white ml-1 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                    <span className="text-white/80 text-sm tracking-widest font-light uppercase">点击开始体验</span>
                  </div>
              </div>
          )}
      </div>

      {/* Top Left Back Button - Positioned relative to viewport for access */}
      <div className="absolute top-6 left-6 z-50 opacity-30 hover:opacity-100 transition-opacity">
          <button 
             onClick={onExit} 
             className="flex items-center gap-2 bg-black/20 hover:bg-black/60 backdrop-blur-md text-white px-3 py-2 md:px-4 md:py-2 rounded-full border border-white/10 transition-all"
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
             <span className="hidden md:inline text-sm font-bold">返回主页</span>
          </button>
      </div>

    </div>
  );
};

export default SceneDisplay;
