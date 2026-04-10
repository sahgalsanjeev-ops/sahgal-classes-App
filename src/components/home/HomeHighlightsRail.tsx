import { useEffect, useState } from "react";
import { ActivityRow, getActivities, deleteActivity } from "@/lib/activities";
import { isSuperAdminEmail } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";
import { Pencil, Trash2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import AddActivityModal from "@/components/admin/AddActivityModal";
import { cn } from "@/lib/utils";

const HomeHighlightsRail = () => {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityRow | null>(null);

  const loadActivities = async () => {
    setLoading(true);
    const data = await getActivities();
    setActivities(data);
    setLoading(false);
  };

  useEffect(() => {
    void loadActivities();

    const checkAdmin = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      setIsAdmin(isSuperAdminEmail(data.user?.email));
    };
    void checkAdmin();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this activity?")) return;
    try {
      await deleteActivity(id);
      setActivities((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Deleted", description: "Activity removed successfully." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message,
      });
    }
  };

  const handleEdit = (activity: ActivityRow) => {
    setEditingActivity(activity);
    setShowAddModal(true);
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  if (!loading && activities.length === 0 && !isAdmin) return null;

  return (
    <div className="mt-8 px-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Coaching Highlights</h2>
            <p className="text-xs text-muted-foreground">Stories & recent activities</p>
          </div>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingActivity(null);
              setShowAddModal(true);
            }}
            className="gap-1.5"
          >
            <Plus size={16} />
            Add New
          </Button>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 snap-x">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="min-w-[280px] h-[360px] rounded-2xl bg-muted animate-pulse shrink-0"
            />
          ))
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="min-w-[280px] w-[280px] flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm snap-start group relative"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-black/5">
                {activity.media_type === "image" ? (
                  <img
                    src={activity.media_url}
                    alt={activity.caption || "Activity"}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
                  />
                ) : (
                  <iframe
                    src={getYouTubeEmbedUrl(activity.media_url)}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}

                {isAdmin && (
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(activity)}
                      className="p-2 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(activity.id)}
                      className="p-2 rounded-full bg-background/80 backdrop-blur-sm text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {activity.caption && (
                <div className="p-3">
                  <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                    {activity.caption}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <AddActivityModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          onSuccess={() => {
            setShowAddModal(false);
            void loadActivities();
          }}
          editingActivity={editingActivity}
        />
      )}
    </div>
  );
};

export default HomeHighlightsRail;
