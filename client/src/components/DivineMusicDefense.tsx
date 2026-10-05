/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  🎵 DIVINE MUSIC DEFENSE PLAYER                                          ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Auto-playing looped playlist as divine protection                        ║
 * ║  Cannot be switched off - intensifies on suspicious activity             ║
 * ║  SEALED BY: HRH SAINT TARIRO MASAWI (MKEY-MNM-TAC-001-2024)             ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {useLocation} from "wouter";
import { Volume2, VolumeX, Play, Pause, SkipForward, SkipBack, Music, Shield, Lock } from "lucide-react";

interface Track {
  title: string;
  file: string;
  artist: string;
}

const DIVINE_PLAYLIST: Track[] = [
  { title: "Divine Light Credit", file: "/music/divine-light-credit_1766347579463.mp3", artist: "MASOWE FAITH GROUP" },
  { title: "Day Light Credit", file: "/music/day-light-credit_1766347579463.mp3", artist: "MASOWE FAITH GROUP" },
  { title: "Day Light Credit II", file: "/music/day-light-credit_2_1766347579463.mp3", artist: "MASOWE FAITH GROUP" },
  { title: "Divine Life Credit", file: "/music/divine-life-credit_1766347579463.mp3", artist: "MASOWE FAITH GROUP" },
  { title: "Divine Life Credit II", file: "/music/divine-life-credit_2_1766347579463.mp3", artist: "MASOWE FAITH GROUP" },
  { title: "Divine Money Drop", file: "/music/divine-money-drop_1766347579463.mp3", artist: "MASOWE FAITH GROUP" },
  { title: "DivineMoney.org", file: "/music/divinemoney.org_1766347579463.mp3", artist: "MASOWE FAITH GROUP" },
  { title: "Mari Yedenga", file: "/music/mari-yedenga_1766347579463.mp3", artist: "MASOWE FAITH GROUP" },
  { title: "Power Over Flow", file: "/music/power-over-flow_1766347579463.mp3", artist: "MASOWE FAITH GROUP" },
];

export default function DivineMusicDefense() {
  const [location]=useLocation();
  const monitoringPage=location==="/kitchen"||location==="/admin/operations"||location.startsWith("/purchases");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [defenseMode, setDefenseMode] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const playAudio = useCallback(async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.log("Autoplay blocked - waiting for user interaction");
      }
    }
  }, []);

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!hasUserInteracted) {
        setHasUserInteracted(true);
        playAudio();
      }
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [hasUserInteracted, playAudio]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const detectSuspiciousActivity = (e: KeyboardEvent) => {
      const suspiciousKeys = ['F12', 'F5'];
      const suspiciousCombos = [
        { ctrl: true, shift: true, key: 'I' },
        { ctrl: true, shift: true, key: 'J' },
        { ctrl: true, shift: true, key: 'C' },
        { ctrl: true, key: 'U' },
      ];

      if (suspiciousKeys.includes(e.key)) {
        triggerDefenseMode();
      }

      for (const combo of suspiciousCombos) {
        if (e.ctrlKey === combo.ctrl && 
            (!combo.shift || e.shiftKey === combo.shift) && 
            e.key.toUpperCase() === combo.key) {
          triggerDefenseMode();
          break;
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      triggerDefenseMode();
    };

    document.addEventListener('keydown', detectSuspiciousActivity);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('keydown', detectSuspiciousActivity);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const triggerDefenseMode = useCallback(() => {
    setDefenseMode(true);
    setAttemptCount(prev => prev + 1);
    setVolume(1.0);
    setIsMuted(false);
    playAudio();
    
    setTimeout(() => setDefenseMode(false), 5000);
  }, [playAudio]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleTrackEnd = () => {
    const nextTrack = (currentTrack + 1) % DIVINE_PLAYLIST.length;
    setCurrentTrack(nextTrack);
  };

  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % DIVINE_PLAYLIST.length);
  };

  const prevTrack = () => {
    setCurrentTrack((prev) => (prev - 1 + DIVINE_PLAYLIST.length) % DIVINE_PLAYLIST.length);
  };

  const togglePlay = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await playAudio();
      }
    }
  };

  const toggleMute = () => {
    if (defenseMode) return;
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const currentSong = DIVINE_PLAYLIST[currentTrack];

  return (
    <>
      <audio
        ref={audioRef}
        src={currentSong.file}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleTrackEnd}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onCanPlay={() => {
          if (hasUserInteracted) playAudio();
        }}
        data-testid="audio-player"
      />

      <div 
        className={`fixed bottom-4 right-4 z-50 transition-all duration-500 ${
          defenseMode 
            ? 'animate-pulse ring-4 ring-red-500 scale-110' 
            : ''
        }`}
        data-testid="divine-music-player"
      >
        {isExpanded ? (
          <div className={`bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl p-4 shadow-2xl border ${
            defenseMode ? 'border-red-500' : 'border-cyan-500/30'
          } min-w-[320px]`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className={`w-5 h-5 ${defenseMode ? 'text-red-500 animate-spin' : 'text-cyan-400'}`} />
                <span className="text-xs font-mono text-cyan-400">
                  {defenseMode ? '🔒 DEFENSE MODE ACTIVE' : 'DIVINE MUSIC DEFENSE'}
                </span>
              </div>
              <button 
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-white"
                data-testid="minimize-player"
              >
                ×
              </button>
            </div>

            <div className="text-center mb-4">
              <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center animate-pulse">
                <Music className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-white font-semibold truncate" data-testid="track-title">
                {currentSong.title}
              </h3>
              <p className="text-cyan-400 text-sm" data-testid="track-artist">
                {currentSong.artist}
              </p>
            </div>

            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={progress}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                data-testid="seek-slider"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mb-4">
              <button 
                onClick={prevTrack}
                className="text-white hover:text-cyan-400 transition"
                data-testid="prev-track"
              >
                <SkipBack className="w-6 h-6" />
              </button>
              <button 
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center hover:scale-105 transition"
                data-testid="play-pause"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 text-white" />
                ) : (
                  <Play className="w-7 h-7 text-white ml-1" />
                )}
              </button>
              <button 
                onClick={nextTrack}
                className="text-white hover:text-cyan-400 transition"
                data-testid="next-track"
              >
                <SkipForward className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={toggleMute}
                className={`text-white transition ${defenseMode ? 'opacity-50 cursor-not-allowed' : 'hover:text-cyan-400'}`}
                disabled={defenseMode}
                data-testid="mute-toggle"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => !defenseMode && setVolume(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                disabled={defenseMode}
                data-testid="volume-slider"
              />
            </div>

            {attemptCount > 0 && (
              <div className="mt-3 p-2 bg-red-900/50 rounded-lg text-center">
                <Lock className="w-4 h-4 inline mr-1 text-red-400" />
                <span className="text-xs text-red-300">
                  {attemptCount} intrusion attempt{attemptCount > 1 ? 's' : ''} detected
                </span>
              </div>
            )}

            <div className="mt-3 text-center">
              <span className="text-[10px] text-gray-500 font-mono">
                SEALED BY MKEY-MNM-TAC-001-2024
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
              defenseMode 
                ? 'bg-red-600 animate-bounce' 
                : isPlaying 
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 animate-pulse' 
                  : 'bg-slate-800 border border-cyan-500/30'
            }`}
            data-testid="expand-player"
          >
            <Music className={`w-6 h-6 ${defenseMode ? 'text-white' : 'text-cyan-400'}`} />
          </button>
        )}
      </div>

      {!hasUserInteracted && !monitoringPage && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center cursor-pointer"
          onClick={() => setHasUserInteracted(true)}
          data-testid="interaction-overlay"
        >
          <div className="text-center p-8 bg-slate-900/90 rounded-2xl border border-cyan-500/30 max-w-md">
            <Music className="w-16 h-16 mx-auto text-cyan-400 mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold text-white mb-2">Divine Music Defense</h2>
            <p className="text-cyan-300 mb-4">
              Click anywhere to activate the Divine Music Protection System
            </p>
            <div className="text-xs text-gray-500 font-mono">
              MASOWE FAITH GROUP LTD • MKEY-MNM-TAC-001-2024
            </div>
          </div>
        </div>
      )}
    </>
  );
}
