import { useRef, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { type ScoredTag } from '@shared/schema';
import { cn } from '@/lib/utils';

interface TagCarouselProps {
  tags: ScoredTag[];
  className?: string;
}

export function TagCarousel({ tags, className }: TagCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    skipSnaps: false,
    containScroll: 'trimSnaps',
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = () => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  };

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  // Get tag color based on score
  const getTagColor = (score: number) => {
    if (score >= 9) return "bg-primary/90 text-primary-foreground";
    if (score >= 8) return "bg-primary/70 text-primary-foreground";
    if (score >= 7) return "bg-primary/50";
    return "bg-primary/30";
  };

  return (
    <div className={cn("relative px-4 py-8", className)}>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {tags.map((tag, index) => (
            <motion.div
              key={index}
              className="flex-[0_0_100%] min-w-0 relative px-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: currentIndex === index ? 1 : 0.5,
                scale: currentIndex === index ? 1 : 0.8,
              }}
              transition={{ duration: 0.3 }}
            >
              <div 
                className={cn(
                  "flex flex-col items-center justify-center p-8 rounded-lg text-center transition-all",
                  getTagColor(tag.score)
                )}
              >
                <span className="text-4xl mb-4">{tag.emoji}</span>
                <h3 className="text-2xl font-bold mb-2">#{tag.text}</h3>
                <div className="flex items-center gap-2 text-sm opacity-90">
                  <span>Relevance Score:</span>
                  <span className="font-semibold">{tag.score.toFixed(1)}/10</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <Button
        variant="outline"
        size="icon"
        className="absolute left-0 top-1/2 -translate-y-1/2"
        onClick={scrollPrev}
        disabled={!canScrollPrev}
      >
        <ArrowLeftIcon className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="absolute right-0 top-1/2 -translate-y-1/2"
        onClick={scrollNext}
        disabled={!canScrollNext}
      >
        <ArrowRightIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
