import React from "react";
import { Box, Text } from "ink";

export const Header = (): React.JSX.Element => {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={2}
      marginBottom={1}
    >
      <Text bold>agyusage</Text>
      <Text dimColor>Antigravity CLI usage breakdown</Text>
    </Box>
  );
};
