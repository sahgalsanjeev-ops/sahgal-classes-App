import { useSearchParams } from "react-router-dom";
import BrandedVideoPlayer from "@/components/BrandedVideoPlayer";

const VideoPage = () => {
  const [searchParams] = useSearchParams();
  const title = searchParams.get("title") || "Lecture Video";

  // Extract video ID from URL path
  const videoId = window.location.pathname.split("/video/")[1]?.split("?")[0] || "dQw4w9WgXcQ";

  return (
    <div className="min-h-screen bg-foreground">
      <BrandedVideoPlayer
        videoId={videoId}
        title={title}
        studentName="Rahul Sharma"
        studentMobile="9876543210"
      />
      
      {/* Video Info */}
      <div className="p-4">
        <h2 className="text-base font-bold text-primary-foreground">{title}</h2>
        <p className="text-xs text-primary-foreground/50 mt-1">By Sahgal Sir • SAHGAL CLASSES</p>
        
        <div className="mt-4 bg-primary-foreground/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-primary-foreground/80">About this lecture</h3>
          <p className="text-xs text-primary-foreground/50 mt-1 leading-relaxed">
            Complete explanation with solved examples and practice problems. Make sure to complete the homework assignment after watching.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoPage;
