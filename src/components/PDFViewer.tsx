import { ArrowLeft, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface PDFViewerProps {
  title: string;
  pdfUrl: string;
}

const PDFViewer = ({ title, pdfUrl }: PDFViewerProps) => {
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(100);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-primary px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center">
            <ArrowLeft size={22} className="text-primary-foreground" />
          </button>
          <h3 className="text-sm font-semibold text-primary-foreground truncate flex-1">{title}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 25))}
              className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center"
            >
              <ZoomOut size={16} className="text-primary-foreground" />
            </button>
            <span className="text-xs text-primary-foreground/70 w-10 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(200, zoom + 25))}
              className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center"
            >
              <ZoomIn size={16} className="text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Content - View Only */}
      <div
        className="flex-1 overflow-auto p-4"
        style={{ userSelect: "none", WebkitUserSelect: "none" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="bg-card rounded-xl shadow-sm border border-border p-6 min-h-[80vh]"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
        >
          {/* Watermark overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.04] rotate-[-30deg]">
            <p className="text-6xl font-bold text-foreground whitespace-nowrap">SAHGAL CLASSES</p>
          </div>

          {pdfUrl ? (
            <iframe title={title} src={pdfUrl} className="w-full min-h-[70vh] rounded-lg border border-border" />
          ) : (
            <>
              <h2 className="text-lg font-bold text-foreground mb-4">{title}</h2>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This is a view-only document. Downloading and screenshots are restricted to protect content.
                </p>
                <div className="h-px bg-border" />
                <p className="text-sm text-foreground leading-relaxed">
                  Chapter notes and formulas will appear here. The document is rendered in a secure viewer that prevents copying and downloading.
                </p>
                <div className="bg-secondary rounded-lg p-4 mt-4">
                  <p className="text-xs font-semibold text-secondary-foreground">📝 Key Formula</p>
                  <p className="text-sm text-foreground mt-1 font-mono">F = kq₁q₂/r²</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
