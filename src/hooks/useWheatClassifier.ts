import { useState, useCallback } from 'react';
import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
ort.env.wasm.numThreads = 1; // ← nonaktifkan multi-thread, tidak butuh COEP

const CLASSES = [
  'Crown_and_Root_Rot',
  'Healthy',
  'Powdery_Mildew',
  'Rust',
  'Wheat_Loose_Smut',
  'Wheat_scab',
  'wheat_sharp_eyespot',
];

const IMG_SIZE = 224;

function softmax(arr: number[]): number[] {
  const max = Math.max(...arr);
  const exps = arr.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((x) => x / sum);
}

export interface ClassResult {
  label: string;
  prob: number;
}

export function useWheatClassifier() {
  const [session, setSession] = useState<ort.InferenceSession | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [inferring, setInferring] = useState(false);
  const [results, setResults] = useState<ClassResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadModel = useCallback(async () => {
    if (session) return;
    setLoadingModel(true);
    setError(null);
    try {
      console.log('Loading ONNX model...');
      const sess = await ort.InferenceSession.create('/model_final.onnx', {
        executionProviders: ['wasm'],
      });
      console.log('Input names:', sess.inputNames);
      console.log('Output names:', sess.outputNames);
      setSession(sess);
    } catch (e: any) {
      setError('Gagal load model: ' + e.message);
    } finally {
      setLoadingModel(false);
    }
  }, [session]);

  const classify = useCallback(
    async (imageFile: File) => {
      if (!session) {
        setError('Model belum di-load');
        return;
      }
      setInferring(true);
      setError(null);
      try {
        // 1. Load image
        const url = URL.createObjectURL(imageFile);
        const img = new Image();
        img.src = url;
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej();
        });

        // 2. Draw ke canvas 224x224
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = IMG_SIZE;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, IMG_SIZE, IMG_SIZE);
        ctx.drawImage(img, 0, 0, IMG_SIZE, IMG_SIZE);
        URL.revokeObjectURL(url);

        // 3. Ambil pixel data
        const { data } = ctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE);

        // Debug pixel
        console.log('Pixel [0,0] RGB:', data[0], data[1], data[2]);
        console.log('Total pixels:', data.length / 4);

        // 4. Preprocessing CHW + ImageNet normalization
        const float32 = new Float32Array(3 * IMG_SIZE * IMG_SIZE);
        for (let i = 0; i < IMG_SIZE * IMG_SIZE; i++) {
          const r = data[i * 4] / 255;
          const g = data[i * 4 + 1] / 255;
          const b = data[i * 4 + 2] / 255;

          float32[i] = (r - 0.485) / 0.229;
          float32[i + IMG_SIZE * IMG_SIZE] = (g - 0.456) / 0.224;
          float32[i + 2 * IMG_SIZE * IMG_SIZE] = (b - 0.406) / 0.225;
        }

        // 5. Buat tensor & jalankan inference
        const inputName = session.inputNames[0];
        const tensor = new ort.Tensor('float32', float32, [
          1,
          3,
          IMG_SIZE,
          IMG_SIZE,
        ]);
        const ortOutput = await session.run({ [inputName]: tensor });

        // Debug logits
        const rawData = Array.from(
          ortOutput[session.outputNames[0]].data as Float32Array,
        );
        console.log('Raw logits:', rawData);

        // 6. Softmax & ranking
        const probs = softmax(rawData);
        console.log('Probs:', probs);

        const ranked: ClassResult[] = probs
          .map((prob, i) => ({ label: CLASSES[i], prob }))
          .sort((a, b) => b.prob - a.prob);

        console.log('Top result:', ranked[0]);
        setResults(ranked);
      } catch (e: any) {
        setError('Inference error: ' + e.message);
      } finally {
        setInferring(false);
      }
    },
    [session],
  );

  return {
    loadModel,
    classify,
    results,
    loadingModel,
    inferring,
    error,
    isReady: !!session,
  };
}
