import { ArrowLeft, ZoomIn, ZoomOut, AlertCircle, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

interface PDFViewerProps {
  title: string;
  pdfUrl: string;
}

const PDFViewer = ({ title, pdfUrl }: PDFViewerProps) => {
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(100);
  const [viewerError, setViewerError] = useState(false);

  // Link Transformation Logic
  const embedUrl = useMemo(() => {
    if (!pdfUrl) return "";
    let url = pdfUrl.trim();

    // Convert Google Drive view/edit links to preview links
    if (url.includes("drive.google.com")) {
      url = url.replace(/\/view(\?.*)?$/, "/preview").replace(/\/edit(\?.*)?$/, "/preview");
      if (!url.includes("embedded=true")) {
        url += (url.includes("?") ? "&" : "?") + "embedded=true";
      }
      return url;
    }

    // Default to Google Docs Viewer for other direct links
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  }, [pdfUrl]);

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
          className="bg-card rounded-xl shadow-sm border border-border p-6 min-h-[80vh] relative"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
        >
          {/* Watermark overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.04] rotate-[-30deg]">
            <p className="text-6xl font-bold text-foreground whitespace-nowrap">SAHGAL CLASSES</p>
          </div>

          {pdfUrl ? (
            <div className="relative w-full h-[75vh] rounded-lg border border-border overflow-hidden bg-muted/20">
              {/* Overlay to prevent interactions with the viewer UI */}
              <div 
                className="absolute inset-0 z-10 bg-transparent pointer-events-none" 
                onContextMenu={(e) => e.preventDefault()}
              />
              
              {/* Primary Viewer: Google Docs / Drive Preview */}
              {!viewerError ? (
                <>
                  <iframe 
                    title={title} 
                    src={embedUrl}
                    className="w-full h-full"
                    style={{ border: "none" }}
                    onError={() => setViewerError(true)}
                  />
                  {/* Manual fallback button if iframe stays blank */}
                  <button 
                    onClick={() => setViewerError(true)}
                    className="absolute bottom-4 right-4 z-20 bg-background/80 backdrop-blur-sm text-[10px] font-bold py-1 px-2 rounded border border-border opacity-50 hover:opacity-100 transition-opacity"
                  >
                    Not loading? Switch viewer
                  </button>
                </>
              ) : (
                /* Fallback: Browser Native Viewer */
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <AlertCircle size={48} className="text-muted-foreground opacity-50" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Preview Failed</p>
                    <p className="text-xs text-muted-foreground mt-1">We couldn't load the preview. You can try opening it directly.</p>
                  </div>
                  
                  {/* Native Object Fallback with hidden toolbar */}
                  <object
                    data={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    type="application/pdf"
                    className="w-full h-full rounded-lg"
                    style={{ 
                      // @ts-ignore - object-view-toolbar is a non-standard property
                      objectViewToolbar: "0",
                    }}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <a 
                        href={pdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-lg"
                      >
                        <ExternalLink size={16} />
                        Open in New Tab
                      </a>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                        Secure View Protected by SAHGAL CLASSES
                      </p>
                    </div>
                  </object>
                </div>
              )}
            </div>
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
