import { useState, useCallback, useEffect } from 'react';
import { Upload, Loader2, AlertCircle, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SimilarImagesGrid from '@/components/SimilarImagesGrid';
import { motion, AnimatePresence } from 'framer-motion';
import { useWheatClassifier } from '@/hooks/useWheatClassifier';

interface ClassificationResult {
  disease: string;
  confidence: number;
  description: string;
}

const DISEASE_INFO: Record<string, string> = {
  Crown_and_Root_Rot:
    'Crown and Root Rot is a serious fungal disease commonly caused by Fusarium species and other soil-borne pathogens. The infection attacks the crown and root tissues of wheat plants, reducing their ability to absorb water and nutrients from the soil. Early symptoms include yellowing leaves, poor vigor, and reduced plant growth. As the disease progresses, roots become discolored and weakened, often resulting in lodging, where plants fall over before harvest. Severe infections can significantly reduce grain yield and quality, especially under stressful environmental conditions such as drought or poor soil drainage.',

  Healthy:
    'No visible signs of disease have been detected on the wheat plant. The leaves, stems, and other visible plant structures appear normal, with healthy coloration and growth patterns. A healthy wheat plant typically exhibits strong vigor, proper leaf development, and no evidence of lesions, discoloration, fungal growth, or other abnormalities. Regular monitoring and proper crop management practices are still recommended to maintain plant health and prevent future disease outbreaks.',

  Powdery_Mildew:
    'Powdery Mildew is a fungal disease caused by Blumeria graminis f. sp. tritici. It is characterized by the appearance of white, powder-like fungal growth on the surface of leaves, stems, and sometimes spikes. Initially, small white spots develop, which gradually expand and merge into larger patches. In severe cases, infected leaves may turn yellow, dry out prematurely, and reduce the plant’s photosynthetic capacity. This disease thrives in cool and humid conditions and can lead to substantial yield losses if not properly managed through resistant varieties, crop monitoring, and fungicide applications.',

  Rust: 'Rust is a widespread fungal disease caused by various Puccinia species, including stem rust, leaf rust, and stripe rust pathogens. The disease is recognized by the presence of orange, reddish-brown, or yellow pustules that develop on leaves, stems, and leaf sheaths. These pustules contain fungal spores that spread rapidly through wind, enabling the disease to infect large areas in a short period. Severe rust infections reduce photosynthesis, weaken plant growth, and can cause significant yield and grain quality losses. Early detection and the use of resistant wheat cultivars are essential for effective disease management.',

  Wheat_Loose_Smut:
    'Wheat Loose Smut is a fungal disease caused by Ustilago tritici. The pathogen infects developing wheat seeds and remains dormant until the next growing season. Infected plants often appear normal during vegetative growth, making early detection difficult. However, when the wheat heads emerge, the grains are replaced by masses of dark brown or black powdery spores. These spores are easily dispersed by wind and can infect healthy flowering plants. Loose smut can significantly reduce grain production and is typically managed through the use of certified disease-free seeds and seed treatment fungicides.',

  Wheat_scab:
    'Wheat Scab, also known as Fusarium Head Blight (FHB), is primarily caused by Fusarium graminearum and related Fusarium species. The disease affects wheat heads during flowering and grain development stages. Common symptoms include bleached or prematurely whitened spikelets, pink or salmon-colored fungal growth, and shriveled grains. In addition to reducing yield, the disease can contaminate harvested grain with harmful mycotoxins, posing risks to both human and animal health. Warm and humid weather conditions favor disease development, making timely monitoring and integrated disease management practices crucial.',

  wheat_sharp_eyespot:
    'Sharp Eyespot is a fungal disease caused by Rhizoctonia cerealis. It primarily affects the lower stems and stem bases of wheat plants. The disease is characterized by distinctive eye-shaped lesions with sharply defined brown margins and pale centers. As infections progress, stem tissues become weakened, increasing the likelihood of lodging and reducing nutrient transport within the plant. Yield losses occur due to impaired plant development and reduced grain filling. The disease is commonly associated with cool, moist conditions and can be managed through crop rotation, residue management, and the cultivation of resistant wheat varieties.',
};

const Index = () => {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const {
    loadModel,
    classify,
    results,
    loadingModel,
    inferring,
    error,
    isReady,
  } = useWheatClassifier();

  // Auto-load model on mount
  useEffect(() => {
    loadModel();
  }, []);

  // Sync ONNX results → local result state
  useEffect(() => {
    if (!results || results.length === 0) return;
    const top = results[0];
    setResult({
      disease: top.label,
      confidence: parseFloat((top.prob * 100).toFixed(1)),
      description: DISEASE_INFO[top.label] ?? 'No description available.',
    });
  }, [results]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setResult(null);
    setFileName(file.name);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleClassify = () => {
    if (!imageFile) return;
    classify(imageFile);
  };

  const isHealthy = result?.disease === 'Healthy';
  const loading = inferring || loadingModel;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 space-y-12">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-16">
        {/* Left: Upload */}
        <div className="flex-1 space-y-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`group relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all ${
              dragOver
                ? 'border-primary bg-primary/5'
                : image
                  ? 'border-border bg-card'
                  : 'border-border/60 bg-card/50 hover:border-muted-foreground/40'
            }`}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            {image ? (
              <img
                src={image}
                alt="Preview"
                className="max-h-[300px] rounded-xl object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Upload className="h-10 w-10" />
                <p className="text-sm font-medium">Drag & drop an image here</p>
                <p className="text-xs">or click to browse</p>
              </div>
            )}
          </div>
          {fileName && (
            <p className="text-xs text-muted-foreground truncate">
              Selected: {fileName}
            </p>
          )}

          {/* Model status indicator */}
          <p className="text-xs text-muted-foreground">
            {loadingModel
              ? '⏳ Loading AI model…'
              : isReady
                ? '✓ Model ready'
                : ''}
          </p>
        </div>

        {/* Right: Info + Results */}
        <div className="flex-1 space-y-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-primary" />
              <h1
                className="text-3xl font-bold tracking-tight lg:text-4xl"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Wheat Disease Classifier
              </h1>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Upload a wheat leaf image to detect diseases using AI. Get instant
              results with confidence scores and disease details.
            </p>
          </div>

          <Button
            variant="classify"
            size="lg"
            onClick={handleClassify}
            disabled={!image || loading || !isReady}
            className="w-full sm:w-auto"
          >
            {inferring ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : loadingModel ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading model...
              </>
            ) : (
              'Classify Image'
            )}
          </Button>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 rounded-2xl border border-border bg-card p-6"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xl font-bold ${isHealthy ? 'text-primary' : 'text-destructive'}`}
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {result.disease}
                  </span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                    {result.confidence}% confidence
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.confidence}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${isHealthy ? 'bg-primary' : 'bg-destructive'}`}
                  />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {result.description}
                </p>

                {/* All class probabilities */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground">
                    All predictions
                  </p>
                  {results?.map((r) => (
                    <div key={r.label} className="flex items-center gap-2">
                      <span className="w-40 truncate text-xs text-muted-foreground">
                        {r.label}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/60"
                          style={{ width: `${(r.prob * 100).toFixed(1)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {(r.prob * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Similar Images Retrieval Grid */}
      <AnimatePresence>
        {result && <SimilarImagesGrid disease={result.disease} />}
      </AnimatePresence>
    </div>
  );
};

export default Index;
