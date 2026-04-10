import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/use-toast";
import { ActivityRow, createActivity, updateActivity, uploadActivityMedia } from "@/lib/activities";
import { ImageIcon, VideoIcon, Loader2 } from "lucide-react";

interface AddActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingActivity: ActivityRow | null;
}

const AddActivityModal = ({ open, onOpenChange, onSuccess, editingActivity }: AddActivityModalProps) => {
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingActivity) {
      setMediaType(editingActivity.media_type);
      setMediaUrl(editingActivity.media_url);
      setCaption(editingActivity.caption || "");
    } else {
      setMediaType("image");
      setMediaUrl("");
      setCaption("");
      setFile(null);
    }
  }, [editingActivity, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalMediaUrl = mediaUrl;

      if (mediaType === "image" && file) {
        finalMediaUrl = await uploadActivityMedia(file);
      } else if (mediaType === "video" && !mediaUrl) {
        throw new Error("Please provide a YouTube URL");
      } else if (mediaType === "image" && !file && !editingActivity) {
        throw new Error("Please select an image file");
      }

      if (editingActivity) {
        await updateActivity(editingActivity.id, {
          media_url: finalMediaUrl,
          media_type: mediaType,
          caption,
        });
        toast({ title: "Updated", description: "Activity updated successfully." });
      } else {
        await createActivity({
          media_url: finalMediaUrl,
          media_type: mediaType,
          caption,
        });
        toast({ title: "Created", description: "New activity added." });
      }
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save activity.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editingActivity ? "Edit Activity" : "Add New Activity"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-3">
              <Label>Media Type</Label>
              <RadioGroup
                value={mediaType}
                onValueChange={(v) => setMediaType(v as "image" | "video")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="image" id="image" />
                  <Label htmlFor="image" className="flex items-center gap-1.5 cursor-pointer">
                    <ImageIcon size={16} className="text-muted-foreground" />
                    Photo
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="video" id="video" />
                  <Label htmlFor="video" className="flex items-center gap-1.5 cursor-pointer">
                    <VideoIcon size={16} className="text-muted-foreground" />
                    Video
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {mediaType === "image" ? (
              <div className="space-y-2">
                <Label htmlFor="photo">Choose Photo</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                  required={!editingActivity}
                />
                {editingActivity && !file && (
                  <p className="text-[10px] text-muted-foreground italic">
                    Leave empty to keep existing photo.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="video_url">YouTube URL</Label>
                <Input
                  id="video_url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Textarea
                id="caption"
                placeholder="Write something about this activity..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="resize-none h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingActivity ? "Update Activity" : "Add Activity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddActivityModal;
