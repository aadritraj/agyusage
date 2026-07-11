import React from "react";
import { Box, Text } from "ink";
import type { SessionInfo } from "../../data/sessions";
import { formatCost } from "../../utils/format";

interface SessionsListProps {
  sessions: SessionInfo[];
  selectedIndex: number;
  pageSize: number;
  filterWorkspace?: string | null;
}

const formatDate = (d: Date): string => {
  const padNum = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${padNum(d.getMonth() + 1)}-${padNum(d.getDate())} ${padNum(d.getHours())}:${padNum(d.getMinutes())}`;
};

export const SessionsList = ({
  sessions,
  selectedIndex,
  pageSize,
  filterWorkspace,
}: SessionsListProps): React.JSX.Element => {
  if (sessions.length === 0) {
    return (
      <Box borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
        <Text>No sessions recorded.</Text>
      </Box>
    );
  }

  const currentPage = Math.floor(selectedIndex / pageSize);
  const totalPages = Math.ceil(sessions.length / pageSize);
  const startIndex = currentPage * pageSize;
  const pageSessions = sessions.slice(startIndex, startIndex + pageSize);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={2}
      paddingY={1}
      flexGrow={1}
    >
      <Box justifyContent="space-between" marginBottom={1}>
        <Box gap={2}>
          <Text bold underline>
            CONVERSATION SESSIONS
          </Text>
          {filterWorkspace && <Text color="yellow">&lt;filtered&gt; · Esc to clear</Text>}
        </Box>
        <Text dimColor>
          Page {currentPage + 1} of {totalPages} ({sessions.length} total)
        </Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        <Box gap={2} marginBottom={1}>
          <Text bold>
            {"  Date/Time".padEnd(20)} {"Workspace".padEnd(20)} {"Model Name".padEnd(25)}{" "}
            {"Steps".padStart(8)} {"Cost".padStart(12)}
          </Text>
        </Box>

        {pageSessions.map((session, index) => {
          const globalIndex = startIndex + index;
          const isSelected = globalIndex === selectedIndex;

          const dateText = formatDate(session.lastActive);
          const workspaceText = (session.workspaceName || "Global Context").slice(0, 18).padEnd(20);
          const modelText = session.model.slice(0, 23).padEnd(25);
          const stepsText = session.stepsCount.toString().padStart(8);
          const costText = formatCost(session.cost).padStart(12);

          return (
            <Box key={session.id} gap={2}>
              <Text bold={isSelected} inverse={isSelected}>
                {isSelected ? "→" : " "} {dateText} {workspaceText} {modelText} {stepsText}{" "}
                {costText}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
