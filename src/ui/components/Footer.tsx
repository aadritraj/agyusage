import React from "react";
import { Box, Text } from "ink";

export const Footer = (): React.JSX.Element => {
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={2} marginTop={1}>
      <Text dimColor>
        <Text bold>Arrow keys</Text> / <Text bold>1-3</Text>: Navigate tabs |{" "}
        <Text bold>Up/Down</Text>: Scroll | <Text bold>Enter</Text>: Details | <Text bold>Esc</Text>
        : Back | <Text bold>q</Text>: Quit
      </Text>
    </Box>
  );
};
