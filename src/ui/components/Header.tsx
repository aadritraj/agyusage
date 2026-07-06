import React from "react";
import { Box, Text } from "ink";
import { TabItem } from "./TabItem";

interface HeaderProps {
  activeTab: string;
}

export const Header = ({ activeTab }: HeaderProps): React.JSX.Element => {
  return (
    <>
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

      {activeTab !== "detail" && (
        <Box gap={4} marginBottom={1} paddingX={2}>
          <TabItem isActive={activeTab === "dashboard"} label="[ 1. Dashboard]" />
          <TabItem isActive={activeTab === "sessions"} label="[ 2. Sessions ]" />
          <TabItem isActive={activeTab === "projects"} label="[ 3. Projects ]" />
        </Box>
      )}
    </>
  );
};
