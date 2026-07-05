export const formatCost = (val: number): string => `$${val.toFixed(4)}`;

export const formatTokens = (val: number): string => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
  return val.toString();
};

export const pad = (text: string, width: number, align: "left" | "right" = "left"): string => {
  if (text.length > width) {
    return text.slice(0, width - 3) + "...";
  }
  const padding = width - text.length;
  if (align === "right") {
    return " ".repeat(padding) + text;
  }
  return text + " ".repeat(padding);
};
