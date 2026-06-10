import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Images, Loader2, Clock } from 'lucide-react';
import * as ort from 'onnxruntime-web';

// ── Konfigurasi ───────────────────────────────────────────────────────────────
const IMG_SIZE = 224;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

const CLASSES = [
  'Crown_and_Root_Rot',
  'Healthy',
  'Powdery_Mildew',
  'Rust',
  'Wheat_Loose_Smut',
  'Wheat_scab',
  'wheat_sharp_eyespot',
];

const DISEASE_IMAGES: Record<string, string[]> = Object.fromEntries(
  CLASSES.map((cls) => [
    cls,
    Array.from({ length: 5 }, (_, i) => `/images/${cls}/${i + 1}.jpg`),
  ]),
);

type Metric = 'euclidean' | 'manhattan' | 'minkowski' | 'cosine';

// ── Fungsi jarak ──────────────────────────────────────────────────────────────
function euclidean(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

function manhattan(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum;
}

function minkowski(a: Float32Array, b: Float32Array, p = 3): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]) ** p;
  return sum ** (1 / p);
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

function getDistance(metric: Metric, a: Float32Array, b: Float32Array): number {
  switch (metric) {
    case 'euclidean':
      return euclidean(a, b);
    case 'manhattan':
      return manhattan(a, b);
    case 'minkowski':
      return minkowski(a, b);
    case 'cosine':
      return cosine(a, b);
  }
}

// ── Ekstrak fitur ─────────────────────────────────────────────────────────────
async function extractFeatures(
  session: ort.InferenceSession,
  src: string,
): Promise<Float32Array | null> {
  try {
    const img = new Image();
    img.src = src;
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej();
    });

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = IMG_SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, IMG_SIZE, IMG_SIZE);
    ctx.drawImage(img, 0, 0, IMG_SIZE, IMG_SIZE);

    const { data } = ctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE);
    const float32 = new Float32Array(3 * IMG_SIZE * IMG_SIZE);
    for (let i = 0; i < IMG_SIZE * IMG_SIZE; i++) {
      float32[i] = (data[i * 4] / 255 - MEAN[0]) / STD[0];
      float32[i + IMG_SIZE * IMG_SIZE] =
        (data[i * 4 + 1] / 255 - MEAN[1]) / STD[1];
      float32[i + 2 * IMG_SIZE * IMG_SIZE] =
        (data[i * 4 + 2] / 255 - MEAN[2]) / STD[2];
    }

    const tensor = new ort.Tensor('float32', float32, [
      1,
      3,
      IMG_SIZE,
      IMG_SIZE,
    ]);
    const output = await session.run({ [session.inputNames[0]]: tensor });
    return output[session.outputNames[0]].data as Float32Array;
  } catch {
    return null;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface SimilarImagesGridProps {
  disease: string;
  queryImageFile: File | null;
}

interface MetricTiming {
  metric: Metric;
  timeMs: number;
}

const METRICS: { key: Metric; label: string }[] = [
  { key: 'euclidean', label: 'Euclidean' },
  { key: 'manhattan', label: 'Manhattan' },
  { key: 'minkowski', label: 'Minkowski' },
  { key: 'cosine', label: 'Cosine' },
];

// ── Komponen ──────────────────────────────────────────────────────────────────
const SimilarImagesGrid = ({
  disease,
  queryImageFile,
}: SimilarImagesGridProps) => {
  const [metric, setMetric] = useState<Metric>('cosine');
  const [session, setSession] = useState<ort.InferenceSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [ranked, setRanked] = useState<{ src: string; distance: number }[]>([]);
  const [timings, setTimings] = useState<MetricTiming[]>([]);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cache fitur query & referensi supaya tidak re-ekstrak tiap ganti metric
  const [queryFeat, setQueryFeat] = useState<Float32Array | null>(null);
  const [refFeats, setRefFeats] = useState<
    { src: string; feat: Float32Array }[]
  >([]);

  const formatLabel = (label: string) =>
    label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Load backbone sekali
  useEffect(() => {
    ort.InferenceSession.create('/backbone_final.onnx', {
      executionProviders: ['wasm'],
    })
      .then(setSession)
      .catch((e) => setError('Gagal load backbone: ' + e.message));
  }, []);

  // Ekstrak fitur query & referensi saat gambar/disease berubah
  useEffect(() => {
    if (!session || !queryImageFile || !disease) return;

    const extractAll = async () => {
      setLoading(true);
      setRanked([]);
      setTimings([]);
      setCurrentTime(null);
      setError(null);

      try {
        // Fitur query
        const url = URL.createObjectURL(queryImageFile);
        const qFeat = await extractFeatures(session, url);
        URL.revokeObjectURL(url);
        if (!qFeat) throw new Error('Gagal ekstrak fitur query');
        setQueryFeat(qFeat);

        // Fitur referensi
        const refs = DISEASE_IMAGES[disease] ?? DISEASE_IMAGES['Healthy'];
        const extracted: { src: string; feat: Float32Array }[] = [];
        for (const src of refs) {
          const feat = await extractFeatures(session, src);
          if (feat) extracted.push({ src, feat });
        }
        setRefFeats(extracted);

        // Hitung semua metrik & catat waktu
        const allTimings: MetricTiming[] = [];
        for (const m of METRICS) {
          const start = performance.now();
          for (const { feat } of extracted) {
            getDistance(m.key, qFeat, feat);
          }
          const end = performance.now();
          allTimings.push({
            metric: m.key,
            timeMs: parseFloat((end - start).toFixed(3)),
          });
        }
        setTimings(allTimings);

        // Log tabel ke console untuk paper
        console.table(
          allTimings.map((t) => ({
            Metric: t.metric,
            'Time (ms)': t.timeMs,
          })),
        );

        // Tampilkan hasil dengan metric default
        rankResults(qFeat, extracted, metric);
      } catch (e: any) {
        setError('Error: ' + e.message);
      } finally {
        setLoading(false);
      }
    };

    extractAll();
  }, [session, queryImageFile, disease]);

  // Re-rank saat metric berubah (tanpa re-ekstrak)
  const rankResults = useCallback(
    (
      qFeat: Float32Array,
      refs: { src: string; feat: Float32Array }[],
      m: Metric,
    ) => {
      const start = performance.now();
      const results = refs
        .map(({ src, feat }) => ({
          src,
          distance: getDistance(m, qFeat, feat),
        }))
        .sort((a, b) => a.distance - b.distance);
      const end = performance.now();
      setCurrentTime(parseFloat((end - start).toFixed(3)));
      setRanked(results);
    },
    [],
  );

  useEffect(() => {
    if (!queryFeat || refFeats.length === 0) return;
    rankResults(queryFeat, refFeats, metric);
  }, [metric, queryFeat, refFeats, rankResults]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Images className="h-5 w-5 text-primary" />
        <h2
          className="text-lg font-semibold"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Similar Images Retrieved
        </h2>
        {!loading && ranked.length > 0 && (
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {ranked.length} results
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Reference images for{' '}
        <span className="font-medium text-foreground">
          {formatLabel(disease)}
        </span>{' '}
        ranked by similarity
      </p>

      {/* Metric toggle */}
      <div className="flex gap-2 flex-wrap">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              metric === m.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Timing tabel */}
      {timings.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">
              Response Time Comparison
            </p>
          </div>
          <div className="grid grid-cols-4 divide-x divide-border">
            {timings.map((t) => (
              <div
                key={t.metric}
                onClick={() => setMetric(t.metric)}
                className={`flex flex-col items-center py-3 px-2 cursor-pointer transition-colors ${
                  metric === t.metric ? 'bg-primary/5' : 'hover:bg-secondary/50'
                }`}
              >
                <span
                  className={`text-xs font-semibold capitalize ${metric === t.metric ? 'text-primary' : 'text-foreground'}`}
                >
                  {t.metric}
                </span>
                <span className="text-lg font-bold text-foreground mt-1">
                  {t.timeMs}
                </span>
                <span className="text-[10px] text-muted-foreground">ms</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Extracting features & computing similarity...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Grid */}
      {!loading && ranked.length > 0 && (
        <>
          {currentTime !== null && (
            <p className="text-xs text-muted-foreground">
              Current metric ({metric}):{' '}
              <span className="font-medium text-foreground">
                {currentTime} ms
              </span>
            </p>
          )}
          <div className="grid grid-cols-5 gap-2">
            {ranked.map(({ src, distance }, i) => (
              <motion.div
                key={src}
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
                    (
                      e.target as HTMLImageElement
                    ).parentElement!.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-background/70 opacity-0 transition-opacity group-hover:opacity-100 flex flex-col items-center justify-center gap-1 p-2">
                  <span className="text-xs font-bold text-foreground">
                    #{i + 1}
                  </span>
                  <span className="text-[10px] text-muted-foreground text-center">
                    {distance.toFixed(4)}
                  </span>
                </div>
                <div className="absolute top-1.5 left-1.5 rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                  #{i + 1}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default SimilarImagesGrid;
