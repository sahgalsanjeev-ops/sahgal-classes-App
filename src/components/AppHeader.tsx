import { Bell } from "lucide-react";

const AppHeader = () => {
  return (
    <header className="sticky top-0 z-40 bg-primary px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary-foreground tracking-tight">
            SAHGAL CLASSES
          </h1>
          <p className="text-[11px] text-primary-foreground/70 font-medium -mt-0.5">
            Learn • Grow • Succeed
          </p>
        </div>
        <button className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center">
          <Bell size={20} className="text-primary-foreground" />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
