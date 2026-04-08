import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import BrandedVideoPlayer from "@/components/BrandedVideoPlayer";
import { supabase } from "@/lib/supabase";
import { fetchProfile } from "@/lib/profiles";

const VideoPage = () => {
  const [searchParams] = useSearchParams();
  const { videoId } = useParams();
  const title = searchParams.get("title") || "Lecture Video";
  
  const [studentInfo, setStudentInfo] = useState({ name: "Student", mobile: "" });

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile = await fetchProfile(user.id);
        if (profile) {
          setStudentInfo({
            name: profile.full_name,
            mobile: profile.mobile,
          });
        }
      }
    };
    void loadProfile();
  }, []);

  if (!videoId) return <div className="p-8 text-center text-muted-foreground">Video not found</div>;

  return (
    <div className="min-h-screen bg-foreground">
      <BrandedVideoPlayer
        videoId={videoId}
        title={title}
        studentName={studentInfo.name}
        studentMobile={studentInfo.mobile}
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
