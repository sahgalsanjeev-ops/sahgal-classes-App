import { Radio, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const LiveBanner = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-4 rounded-xl bg-gradient-to-r from-live to-red-600 p-3.5 shadow-lg shadow-live/20"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
          <Radio size={20} className="text-live-foreground animate-pulse-live" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-live-foreground bg-primary-foreground/20 px-2 py-0.5 rounded-full uppercase">
              Live Now
            </span>
          </div>
          <p className="text-sm font-semibold text-live-foreground mt-0.5 truncate">
            JEE Physics - Electrostatics Ch. 3
          </p>
          <p className="text-[11px] text-live-foreground/70">By Sahgal Sir • 245 watching</p>
        </div>
        <ChevronRight size={20} className="text-live-foreground/70 flex-shrink-0" />
      </div>
    </motion.div>
  );
};

export default LiveBanner;
