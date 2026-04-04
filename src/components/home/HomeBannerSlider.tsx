import { useEffect, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { fetchActiveBanners, type HomeBannerRow } from "@/lib/homeContent";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
const HomeBannerSlider = () => {
  const [banners, setBanners] = useState<HomeBannerRow[]>([]);

  useEffect(() => {
    void fetchActiveBanners().then(setBanners);
  }, []);

  if (!isSupabaseConfigured || !supabase) return null;
  if (banners.length === 0) return null;

  return (
    <div className="px-4 mt-4">
      <Carousel opts={{ align: "start", loop: banners.length > 1 }} className="w-full">
        <CarouselContent className="-ml-2">
          {banners.map((b) => (
            <CarouselItem key={b.id} className="pl-2 basis-full">
              {b.link_url ? (
                <button
                  type="button"
                  className="relative w-full overflow-hidden rounded-2xl border border-primary/20 shadow-md aspect-[2.4/1] bg-muted cursor-pointer"
                  onClick={() => window.open(b.link_url!, "_blank", "noopener,noreferrer")}
                >
                  <img src={b.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ) : (
                <div className="relative w-full overflow-hidden rounded-2xl border border-primary/20 shadow-md aspect-[2.4/1] bg-muted">
                  <img src={b.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
              )}
            </CarouselItem>
          ))}
        </CarouselContent>
        {banners.length > 1 && (
          <>
            <CarouselPrevious className="left-2 h-8 w-8 border-primary/30 bg-background/90" />
            <CarouselNext className="right-2 h-8 w-8 border-primary/30 bg-background/90" />
          </>
        )}
      </Carousel>
    </div>
  );
};

export default HomeBannerSlider;
