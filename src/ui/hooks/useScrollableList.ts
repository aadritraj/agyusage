import { useInput } from "ink";

interface UseScrollableListOptions {
  length: number;
  onSelect?: (index: number) => void;
  isActive: boolean;
}

export const useScrollableList = (
  index: number,
  setIndex: (updater: (prev: number) => number) => void,
  { length, onSelect, isActive }: UseScrollableListOptions,
) => {
  useInput(
    (_input, key) => {
      if (key.downArrow) setIndex((p) => Math.min(length - 1, p + 1));
      else if (key.upArrow) setIndex((p) => Math.max(0, p - 1));
      else if (key.return && onSelect) onSelect(index);
    },
    { isActive },
  );
};
