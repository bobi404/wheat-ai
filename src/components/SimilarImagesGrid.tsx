import { motion } from 'framer-motion';
import { Images } from 'lucide-react';

const CLASSES = [
  'Crown_and_Root_Rot',
  'Healthy',
  'Powdery_Mildew',
  'Rust',
  'Wheat_Loose_Smut',
  'Wheat_scab',
  'wheat_sharp_eyespot',
];

// Generate paths untuk setiap kelas
const DISEASE_IMAGES: Record<string, string[]> = Object.fromEntries(
  CLASSES.map((cls) => [
    cls,
    Array.from({ length: 5 }, (_, i) => `/images/${cls}/${i + 1}.jpg`),
  ]),
);

interface SimilarImagesGridProps {
  disease: string;
}

const SimilarImagesGrid = ({ disease }: SimilarImagesGridProps) => {
  const images = DISEASE_IMAGES[disease] ?? DISEASE_IMAGES['Healthy'];

  const formatLabel = (label: string) =>
    label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <Images className="h-5 w-5 text-primary" />
        <h2
          className="text-lg font-semibold"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Similar Images Retrieved
        </h2>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {images.length} results
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        Reference images matching{' '}
        <span className="font-medium text-foreground">
          {formatLabel(disease)}
        </span>
      </p>

      <div className="grid grid-cols-5 gap-2">
        {images.map((src, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * i }}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-card"
          >
            <img
              src={src}
              alt={`${formatLabel(disease)} sample ${i + 1}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={(e) => {
                (e.target as HTMLImageElement).parentElement!.style.display =
                  'none';
              }}
            />
            <div className="absolute inset-0 bg-background/60 opacity-0 transition-opacity group-hover:opacity-100 flex items-end p-2">
              <span className="text-[10px] font-medium text-foreground">
                #{i + 1}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default SimilarImagesGrid;
