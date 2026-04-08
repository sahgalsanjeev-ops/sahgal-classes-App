import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchProfile } from "@/lib/profiles";

const GlobalWatermark = () => {
  const [profile, setProfile] = useState<{ name: string; mobile: string } | null>(null);
  const [position, setPosition] = useState({ top: 20, left: 20 });

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const data = await fetchProfile(user.id);
        if (data) {
          setProfile({ name: data.full_name, mobile: data.mobile });
        }
      }
    };
    void loadProfile();
  }, []);

  // Change position every 15 seconds to deter focused recording
  useEffect(() => {
    const interval = setInterval(() => {
      setPosition({
        top: Math.random() * 80 + 10,
        left: Math.random() * 70 + 10,
      });
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!profile) return null;

  return (
    <div
      className="fixed z-[9999] pointer-events-none touch-none select-none transition-all duration-1000 ease-in-out opacity-40"
      style={{ top: `${position.top}%`, left: `${position.left}%` }}
    >
      <p className="text-slate-600 dark:text-slate-300 text-[11px] font-black tracking-widest uppercase drop-shadow-md">
        {profile.name} • {profile.mobile}
      </p>
    </div>
  );
};

export default GlobalWatermark;
