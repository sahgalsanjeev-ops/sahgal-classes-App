import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipForward, SkipBack, ArrowLeft, Maximize, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BrandedVideoPlayerProps {
  videoId: string;
  title: string;
  studentName?: string;
  studentMobile?: string;
  /** When true, hides the back button (e.g. embedded on home dashboard). */
  embedded?: boolean;
}

const BrandedVideoPlayer = ({
  videoId,
  title,
  studentName = "Student",
  studentMobile = "9876543210",
  embedded = false,
}: BrandedVideoPlayerProps) => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [watermarkPos, setWatermarkPos] = useState({ top: 10, left: 10 });
  const playerRef = useRef<HTMLIFrameElement>(null);
  const controlsTimer = useRef<number>();

  // Watermark position change every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkPos({
        top: Math.random() * 60 + 10,
        left: Math.random() * 50 + 10,
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  const postMessage = (action: string) => {
    playerRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: action, args: [] }),
      "*"
    );
  };

  const togglePlay = () => {
    if (isPlaying) {
      postMessage("pauseVideo");
    } else {
      postMessage("playVideo");
    }
    setIsPlaying(!isPlaying);
    resetControlsTimer();
  };

  const skip = (seconds: number) => {
    playerRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func: "seekTo",
        args: [seconds, true],
      }),
      "*"
    );
    resetControlsTimer();
  };

  return (
    <div className="relative w-full bg-foreground" onClick={resetControlsTimer}>
      {/* YouTube iframe - hidden controls */}
      <div className="relative w-full aspect-video overflow-hidden">
        <iframe
          ref={playerRef}
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&controls=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&playsinline=1&fs=0`}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          style={{ border: 0 }}
        />

        {/* Overlay to block YouTube UI interactions & Prevent Right-click */}
        <div 
          className="absolute inset-0 z-10" 
          onClick={togglePlay} 
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Anti-Piracy Watermark */}
        <div
          className="absolute z-20 pointer-events-none transition-all duration-1000 ease-in-out"
          style={{ top: `${watermarkPos.top}%`, left: `${watermarkPos.left}%` }}
        >
          <p className="text-primary-foreground/25 text-xs font-bold whitespace-nowrap select-none">
            SAHGAL CLASSES - {studentName} / {studentMobile}
          </p>
        </div>

        {/* Custom Controls Overlay */}
        {showControls && (
          <div className="absolute inset-0 z-30 pointer-events-none">
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-foreground/60 to-transparent p-3 pointer-events-auto">
              <div className="flex items-center gap-3">
                {!embedded ? (
                  <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center">
                    <ArrowLeft size={22} className="text-primary-foreground" />
                  </button>
                ) : (
                  <div className="w-9 shrink-0" aria-hidden />
                )}
                <h3 className="text-sm font-semibold text-primary-foreground truncate flex-1">{title}</h3>
              </div>
            </div>

            {/* Center controls */}
            <div className="absolute inset-0 flex items-center justify-center gap-8 pointer-events-auto">
              <button onClick={() => skip(-10)} className="w-12 h-12 rounded-full bg-foreground/40 flex items-center justify-center">
                <SkipBack size={22} className="text-primary-foreground" />
              </button>
              <button onClick={togglePlay} className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
                {isPlaying ? (
                  <Pause size={28} className="text-primary-foreground" fill="currentColor" />
                ) : (
                  <Play size={28} className="text-primary-foreground ml-1" fill="currentColor" />
                )}
              </button>
              <button onClick={() => skip(10)} className="w-12 h-12 rounded-full bg-foreground/40 flex items-center justify-center">
                <SkipForward size={22} className="text-primary-foreground" />
              </button>
            </div>

            {/* Bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent p-3 pointer-events-auto">
              <div className="flex items-center justify-between">
                <Volume2 size={18} className="text-primary-foreground/70" />
                <span className="text-[10px] text-primary-foreground/50 font-semibold">SAHGAL CLASSES</span>
                <Maximize size={18} className="text-primary-foreground/70" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandedVideoPlayer;
