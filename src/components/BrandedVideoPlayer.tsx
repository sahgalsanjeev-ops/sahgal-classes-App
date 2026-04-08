import { useEffect, useState } from "react";
import { Plyr } from "plyr-react";
import "plyr-react/plyr.css";
import "./BrandedVideoPlayer.css";

interface BrandedVideoPlayerProps {
  videoId: string;
  title?: string;
  studentName?: string;
  studentMobile?: string;
}

const BrandedVideoPlayer = ({
  videoId,
  studentName = "Student",
  studentMobile = "",
}: BrandedVideoPlayerProps) => {
  const [watermarkPos, setWatermarkPos] = useState({ top: 10, left: 10 });

  // Anti-piracy watermark position change every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkPos({
        top: Math.random() * 60 + 20,
        left: Math.random() * 50 + 20,
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const videoOptions: any = {
    autoplay: false,
    controls: [
      "play-large",
      "play",
      "progress",
      "current-time",
      "mute",
      "volume",
      "captions",
      "settings",
      "pip",
      "airplay",
      "fullscreen",
    ],
    settings: ["quality", "speed"],
    speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
    youtube: {
      noCookie: true,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      // These parameters help hide the YouTube logo and other elements
      controls: 0,
      autohide: 1,
      // This helps prevent "Watch on YouTube"
      origin: window.location.origin,
    },
  };

  const videoSource: any = {
    type: "video",
    sources: [
      {
        src: videoId,
        provider: "youtube",
      },
    ],
  };

  return (
    <div className="branded-video-container relative w-full overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10">
      <Plyr source={videoSource} options={videoOptions} />

      {/* Premium Overlay to block YouTube interactions */}
      <div className="absolute inset-0 z-10 pointer-events-none touch-none" />

      {/* Dynamic Watermark */}
      <div
        className="absolute z-20 pointer-events-none transition-all duration-1000 ease-in-out opacity-30 select-none"
        style={{ top: `${watermarkPos.top}%`, left: `${watermarkPos.left}%` }}
      >
        <p className="text-white text-[10px] font-bold tracking-widest uppercase drop-shadow-md">
          SAHGAL CLASSES • {studentName} {studentMobile && `• ${studentMobile}`}
        </p>
      </div>
    </div>
  );
};

export default BrandedVideoPlayer;
