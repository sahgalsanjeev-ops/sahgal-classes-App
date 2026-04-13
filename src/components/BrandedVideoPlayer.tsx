import { useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BrandedVideoPlayerProps {
  videoId: string;
  title: string;
  studentMobile?: string;
  embedded?: boolean;
}

const BrandedVideoPlayer = ({
  videoId,
  title,
  studentMobile = "9876543210",
  embedded = false,
}: BrandedVideoPlayerProps) => {
  const navigate = useNavigate();
  const playerRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="w-full bg-background">
      {/* 1. TITLE (Moved out and stacked) */}
      <div className="p-4 bg-background">
        <div className="flex items-center gap-3">
          {!embedded && (
            <button 
              onClick={() => navigate(-1)} 
              className="w-10 h-10 flex items-center justify-center bg-muted rounded-full pointer-events-auto"
            >
              <ArrowLeft size={24} className="text-foreground" />
            </button>
          )}
          <h3 className="text-lg font-bold text-foreground truncate">{title}</h3>
        </div>
      </div>

      {/* 2. CROP CONTAINER (Strictly 16:9) */}
      <div 
        className="w-full bg-black overflow-hidden relative" 
        style={{ 
          aspectRatio: '16 / 9',
          position: 'relative',
        }}
      >
        {/* 3. IFRAME (Aggressive cropping with negative top) */}
        <iframe
          ref={playerRef}
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&controls=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=0&playsinline=1&fs=1`}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen={true}
          style={{ 
            position: 'absolute',
            top: '-65px', // Strictly hide YouTube top bar
            left: 0,
            width: '100%',
            height: 'calc(100% + 100px)', // Compensate for the crop
            border: 0,
            pointerEvents: 'auto', // MUST BE AUTO
          }}
        />
      </div>

      {/* 4. FOOTER */}
      <div className="p-4 flex justify-between opacity-30">
        <span className="text-[10px] font-black">SAHGAL CLASSES</span>
        <span className="text-[10px]">ID: {studentMobile}</span>
      </div>
    </div>
  );
};

export default BrandedVideoPlayer;
