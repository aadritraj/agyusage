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
    inputPricePerM: 5.0,
    outputPricePerM: 25.0,
    cachedPricePerM: 0.5,
  },
  "GPT-OSS 120B (Medium)": { inputPricePerM: 0.036, outputPricePerM: 0.18, cachedPricePerM: 0.0036 },
};

const FALLBACK_PRICING: ModelPricing = {
  inputPricePerM: 1.5,
  outputPricePerM: 9.0,
  cachedPricePerM: 0.15,
};

let activePricing: Record<string, ModelPricing> = { ...DEFAULT_PRICING };

const baseDir = path.join(os.homedir(), ".gemini", "antigravity-cli");
const cacheFilePath = path.join(baseDir, "pricing_cache.json");

// Normalize a human-readable model name to a slug for fuzzy matching against
// OpenRouter model IDs (e.g. "Claude Sonnet 4.6 (Thinking)" → "claude-sonnet-4-6")
const toSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const getPricingForModel = (modelName: string): ModelPricing => {
  if (activePricing[modelName]) return activePricing[modelName];

  const slug = toSlug(modelName);
  const slugParts = slug.split("-").filter(Boolean);

  // Match against cache keys — works for both id-slugs ("anthropic/claude-sonnet-4-5")
  // and legacy name keys ("Anthropic: Claude Sonnet 5")
  let bestKey: string | null = null;
  let bestScore = 0;
  for (const key of Object.keys(activePricing)) {
    const keySlug = toSlug(key);
    const matches = slugParts.filter((p) => p.length > 2 && keySlug.includes(p)).length;
    if (matches > bestScore) {
      bestScore = matches;
      bestKey = key;
    }
  }
  if (bestKey && bestScore >= 2) return activePricing[bestKey];

  // Keyword fallbacks using DEFAULT_PRICING anchors
  if (slug.includes("flash")) return activePricing["gemini-3-flash-a"] ?? FALLBACK_PRICING;
  if (slug.includes("pro")) return activePricing["Gemini 3.1 Pro (High)"] ?? FALLBACK_PRICING;
  if (slug.includes("sonnet"))
    return activePricing["Claude Sonnet 4.6 (Thinking)"] ?? FALLBACK_PRICING;
  if (slug.includes("opus")) return activePricing["Claude Opus 4.6 (Thinking)"] ?? FALLBACK_PRICING;

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
  } catch {
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
            // Key by id (e.g. "anthropic/claude-sonnet-4-5") for reliable slug matching
            const key = item.id ?? item.name;
            newPricing[key] = {
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
  } catch {
    // Ignore fetch errors (e.g. offline)
  }
};
