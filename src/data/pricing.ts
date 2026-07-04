import os from "node:os";
import path from "node:path";

export interface ModelPricing {
  inputPricePerM: number;
  outputPricePerM: number;
  cachedPricePerM: number;
}

// Local cache of pricing data, used if OpenRouter API is unavailable
export const DEFAULT_PRICING: Record<string, ModelPricing> = {
  "Gemini 3.5 Flash (Medium)": { inputPricePerM: 1.5, outputPricePerM: 9.0, cachedPricePerM: 0.15 },
  "Gemini 3.5 Flash (High)": { inputPricePerM: 1.5, outputPricePerM: 9.0, cachedPricePerM: 0.15 },
  "Gemini 3.5 Flash (Low)": { inputPricePerM: 1.5, outputPricePerM: 9.0, cachedPricePerM: 0.15 },
  "gemini-3-flash-a": { inputPricePerM: 1.5, outputPricePerM: 9.0, cachedPricePerM: 0.15 },
  "Gemini 3.1 Pro (Low)": { inputPricePerM: 2.0, outputPricePerM: 12.0, cachedPricePerM: 0.2 },
  "Gemini 3.1 Pro (High)": { inputPricePerM: 2.0, outputPricePerM: 12.0, cachedPricePerM: 0.2 },
  "Claude Sonnet 4.6 (Thinking)": {
    inputPricePerM: 3.0,
    outputPricePerM: 15.0,
    cachedPricePerM: 0.3,
  },
  "Claude Opus 4.6 (Thinking)": {
    inputPricePerM: 15.0,
    outputPricePerM: 75.0,
    cachedPricePerM: 1.5,
  },
  "GPT-OSS 120B (Medium)": { inputPricePerM: 0.5, outputPricePerM: 1.5, cachedPricePerM: 0.05 },
};

const FALLBACK_PRICING: ModelPricing = {
  inputPricePerM: 1.5,
  outputPricePerM: 9.0,
  cachedPricePerM: 0.15,
};

let activePricing: Record<string, ModelPricing> = { ...DEFAULT_PRICING };

const baseDir = path.join(os.homedir(), ".gemini", "antigravity-cli");
const cacheFilePath = path.join(baseDir, "pricing_cache.json");

export const getPricingForModel = (modelName: string): ModelPricing => {
  if (activePricing[modelName]) return activePricing[modelName];

  const lowerName = modelName.toLowerCase();

  for (const key of Object.keys(activePricing)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return activePricing[key];
    }
  }

  if (lowerName.includes("flash")) {
    return activePricing["gemini-3-flash-a"];
  }
  if (lowerName.includes("pro")) {
    return activePricing["Gemini 3.1 Pro (High)"];
  }
  if (lowerName.includes("sonnet")) {
    return activePricing["Claude Sonnet 4.6 (Thinking)"];
  }
  if (lowerName.includes("opus")) {
    return activePricing["Claude Opus 4.6 (Thinking)"];
  }

  return FALLBACK_PRICING;
};

export const calculateCost = (
  model: string,
  input: number,
  output: number,
  cached: number,
): number => {
  const p = getPricingForModel(model);
  const inCost = (input / 1_000_000) * p.inputPricePerM;
  const outCost = (output / 1_000_000) * p.outputPricePerM;
  const cachedCost = (cached / 1_000_000) * p.cachedPricePerM;
  return inCost + outCost + cachedCost;
};

export const loadPricingCache = async (): Promise<void> => {
  try {
    const file = Bun.file(cacheFilePath);
    if (await file.exists()) {
      const content = await file.json();
      activePricing = { ...DEFAULT_PRICING, ...content };
    }
  } catch (e) {
    // Cache load fail ignored, using local defaults
  }
};

export const fetchPricingDynamically = async (): Promise<void> => {
  try {
    // Non-blocking query to a model directory API or remote pricing manifest
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 sec timeout

    const res = await fetch("https://openrouter.ai/api/v1/models", { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const newPricing: Record<string, ModelPricing> = {};

      if (data && Array.isArray(data.data)) {
        for (const item of data.data) {
          // OpenRouter calcs pricing in per token, conv to per million
          const prompt = Number(item.pricing?.prompt || 0) * 1_000_000;
          const completion = Number(item.pricing?.completion || 0) * 1_000_000;

          if (prompt > 0 || completion > 0) {
            newPricing[item.name] = {
              inputPricePerM: prompt,
              outputPricePerM: completion,
              cachedPricePerM: prompt * 0.1, // estimate cached at 10%
            };
          }
        }
      }

      if (Object.keys(newPricing).length > 0) {
        activePricing = { ...DEFAULT_PRICING, ...newPricing };

        await Bun.write(cacheFilePath, JSON.stringify(newPricing, null, 2));
      }
    }
  } catch (e) {
    // Ignore fetch errors (e.g. offline)
  }
};
