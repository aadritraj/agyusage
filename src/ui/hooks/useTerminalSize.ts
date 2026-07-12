import { useState, useEffect } from "react";

const getSize = () => ({
  columns: process.stdout.columns || 80,
  rows: process.stdout.rows || 24,
});

export const useTerminalSize = () => {
  const [size, setSize] = useState(getSize);

  useEffect(() => {
    const handleResize = () => setSize(getSize());
    process.stdout.on("resize", handleResize);
    return () => {
      process.stdout.off("resize", handleResize);
    };
  }, []);

  return size;
};
