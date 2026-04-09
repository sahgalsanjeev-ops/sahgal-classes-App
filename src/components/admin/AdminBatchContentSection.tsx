import { useState } from "react";
import { Plus, Trash2, Video, FileText, Book, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Batch } from "@/lib/batches";

interface AdminBatchContentSectionProps {
  batches: Batch[];
  selectedBatchId: string;
  setSelectedBatchId: (id: string) => void;
  addResource: (type: "videos" | "homework" | "studyMaterialPdfs" | "testPapers", title: string, link: string) => void;
  deleteResource: (id: string, type: "videos" | "homework" | "studyMaterialPdfs" | "testPapers") => void;
}

const AdminBatchContentSection = ({
  batches,
  selectedBatchId,
  setSelectedBatchId,
  addResource,
  deleteResource,
}: AdminBatchContentSectionProps) => {
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceLink, setResourceLink] = useState("");
  const [resourceType, setResourceType] = useState<"videos" | "homework" | "studyMaterialPdfs" | "testPapers">("videos");

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  const handleAdd = () => {
    if (!selectedBatchId) {
      toast({
        variant: "destructive",
        title: "No batch selected",
        description: "Please select a target batch first.",
      });
      return;
    }
    if (!resourceTitle.trim()) {
      toast({
        variant: "destructive",
        title: "Title required",
        description: "Please enter a title for the content.",
      });
      return;
    }
    addResource(resourceType, resourceTitle, resourceLink);
    setResourceTitle("");
    setResourceLink("");
    toast({
      title: "Content Added",
      description: `Successfully added to ${selectedBatch?.batchName}`,
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "videos": return <Video size={16} className="text-blue-500" />;
      case "homework": return <FileText size={16} className="text-orange-500" />;
      case "studyMaterialPdfs": return <Book size={16} className="text-green-500" />;
      case "testPapers": return <ClipboardList size={16} className="text-purple-500" />;
      default: return <Plus size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
          <Plus size={18} className="text-primary" /> Add Content to Batch
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">1. Select Target Batch</label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            >
              <option value="">Choose a batch...</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batchName} ({batch.batchCode})
                </option>
              ))}
            </select>
          </div>

          {selectedBatch && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 animate-in fade-in slide-in-from-top-1">
              <p className="text-xs font-semibold text-primary">Target: {selectedBatch.batchName}</p>
              <p className="text-[10px] text-muted-foreground">{selectedBatch.courseName} | {selectedBatch.timing}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">2. Content Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "videos", label: "Video", icon: <Video size={14} /> },
                  { id: "homework", label: "HW", icon: <FileText size={14} /> },
                  { id: "studyMaterialPdfs", label: "PDF", icon: <Book size={14} /> },
                  { id: "testPapers", label: "Test", icon: <ClipboardList size={14} /> },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setResourceType(type.id as any)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium border transition-all ${
                      resourceType === type.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {type.icon}
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">3. Title</label>
              <Input 
                value={resourceTitle} 
                onChange={(e) => setResourceTitle(e.target.value)} 
                placeholder="e.g. Chapter 1 Introduction" 
                className="h-10"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">4. Link / Note (Optional)</label>
              <Input 
                value={resourceLink} 
                onChange={(e) => setResourceLink(e.target.value)} 
                placeholder="YouTube link or note" 
                className="h-10"
              />
            </div>
          </div>

          <Button
            onClick={handleAdd}
            disabled={!selectedBatchId || !resourceTitle.trim()}
            className="w-full h-11 gap-2 shadow-sm"
          >
            <Plus size={18} />
            Add to {selectedBatch?.batchName || "Batch"}
          </Button>
        </div>
      </div>

      {selectedBatch && (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b pb-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Recently Added in {selectedBatch.batchName}</p>
          </div>
          
          <div className="space-y-4">
            {(["videos", "homework", "studyMaterialPdfs", "testPapers"] as const).map((type) => {
              const items = selectedBatch[type];
              if (items.length === 0) return null;
              
              return (
                <div key={type} className="space-y-2">
                  <p className="text-[10px] font-bold text-primary/70 uppercase flex items-center gap-1.5">
                    {getIcon(type)}
                    {type === "videos" ? "Course Videos" : type === "homework" ? "Homework" : type === "studyMaterialPdfs" ? "PDF Materials" : "Test Papers"}
                  </p>
                  <div className="grid gap-2">
                    {items.slice(-3).reverse().map((item) => (
                      <div key={item.id} className="group rounded-lg border border-border bg-muted/20 p-2.5 text-xs flex items-center justify-between hover:bg-muted/40 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{item.title}</p>
                          {item.link && <p className="text-[10px] text-muted-foreground truncate opacity-70">{item.link}</p>}
                        </div>
                        <Button
                          size="xs"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteResource(item.id, type)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBatchContentSection;
