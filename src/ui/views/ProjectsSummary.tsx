import React from "react";
import { Box, Text } from "ink";
import type { SessionInfo } from "../../data/sessions";
import { formatCost, formatTokens } from "../../utils/format";

interface ProjectsSummaryProps {
  sessions: SessionInfo[];
  selectedIndex: number;
}

export const ProjectsSummary = ({
  sessions,
  selectedIndex,
}: ProjectsSummaryProps): React.JSX.Element => {
  // Aggregate sessions by workspace path
  const projectMap: Record<
    string,
    { workspaceName: string; cost: number; input: number; output: number; sessionsCount: number }
  > = {};

  for (const s of sessions) {
    const ws = s.workspace || "Global Context";
    if (!projectMap[ws]) {
      projectMap[ws] = {
        workspaceName: s.workspaceName || "Global Context",
        cost: 0,
        input: 0,
        output: 0,
        sessionsCount: 0,
      };
    }
    projectMap[ws].cost += s.cost;
    projectMap[ws].input += s.inputTokens;
    projectMap[ws].output += s.outputTokens;
    projectMap[ws].sessionsCount += 1;
  }

  const sortedProjects = Object.entries(projectMap)
    .map(([path, data]) => ({ path, ...data }))
    .sort((a, b) => b.cost - a.cost);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold underline>
          PROJECT WORKSPACE SPEND SUMMARY
        </Text>
        <Text dimColor>↑/↓ navigate · Enter to filter sessions</Text>
      </Box>

      <Box flexDirection="column">
        <Box gap={2} marginBottom={1}>
          <Text bold>
            {"Project Workspace".padEnd(25)} {"Sessions".padStart(10)} {"Input".padStart(12)}{" "}
            {"Output".padStart(12)} {"Total Cost".padStart(12)}
          </Text>
        </Box>

        <Text dimColor>
          ────────────────────────────────────────────────────────────────────────────
        </Text>

        {sortedProjects.length === 0 ? (
          <Text>No projects recorded yet.</Text>
        ) : (
          sortedProjects.map((proj, i) => {
            const isSelected = i === selectedIndex;
            const displayWorkspace = proj.workspaceName.slice(0, 23).padEnd(25);
            const sessionsCountText = proj.sessionsCount.toString().padStart(10);
            const inputText = formatTokens(proj.input).padStart(12);
            const outputText = formatTokens(proj.output).padStart(12);
            const costText = formatCost(proj.cost).padStart(12);

            return (
              <Box key={proj.path} gap={2}>
                <Text bold={isSelected} inverse={isSelected}>
                  {isSelected ? "→" : " "} {displayWorkspace} {sessionsCountText} {inputText}{" "}
                  {outputText} {costText}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};
