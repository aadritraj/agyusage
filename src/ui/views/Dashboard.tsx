import React from "react";
import { Box, Text } from "ink";
import type { SessionInfo } from "../../data/sessions";
import { formatCost, formatTokens } from "../../utils/format";

interface DashboardProps {
  sessions: SessionInfo[];
}

export const Dashboard = ({ sessions }: DashboardProps): React.JSX.Element => {
  const totalCost = sessions.reduce((acc, s) => acc + s.cost, 0);
  const totalSessions = sessions.length;
  const totalInput = sessions.reduce((acc, s) => acc + s.inputTokens, 0);
  const totalOutput = sessions.reduce((acc, s) => acc + s.outputTokens, 0);

  const dailyData: Record<
    string,
    { cost: number; input: number; output: number; sessionsCount: number }
  > = {};
  for (const s of sessions) {
    const d = s.lastActive;
    const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    if (!dailyData[dateStr]) {
      dailyData[dateStr] = { cost: 0, input: 0, output: 0, sessionsCount: 0 };
    }
    dailyData[dateStr].cost += s.cost;
    dailyData[dateStr].input += s.inputTokens;
    dailyData[dateStr].output += s.outputTokens;
    dailyData[dateStr].sessionsCount += 1;
  }

  const sortedDates = Object.keys(dailyData)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 5);

  return (
    <Box flexDirection="column" gap={1}>
      <Box gap={3}>
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="gray"
          paddingX={2}
          minWidth={22}
        >
          <Text dimColor>Total Spend</Text>
          <Text bold>{formatCost(totalCost)}</Text>
        </Box>
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="gray"
          paddingX={2}
          minWidth={18}
        >
          <Text dimColor>Sessions</Text>
          <Text bold>{totalSessions}</Text>
        </Box>
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="gray"
          paddingX={2}
          minWidth={22}
        >
          <Text dimColor>Total Tokens</Text>
          <Text bold>{formatTokens(totalInput + totalOutput)}</Text>
          <Text dimColor>
            In: {formatTokens(totalInput)} | Out: {formatTokens(totalOutput)}
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
        <Text bold underline>
          Daily Spend Summary
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Box gap={2}>
            <Text bold>
              {"Date".padEnd(15)} {"Sessions".padStart(10)} {"Input".padStart(12)}{" "}
              {"Output".padStart(12)} {"Daily Cost".padStart(15)}
            </Text>
          </Box>
          <Text dimColor>────────────────────────────────────────────────────────────────</Text>
          {sortedDates.length === 0 ? (
            <Text>No sessions recorded yet.</Text>
          ) : (
            sortedDates.map((date) => {
              const data = dailyData[date];
              const dateText = date.padEnd(15);
              const sessionsText = data.sessionsCount.toString().padStart(10);
              const inputText = formatTokens(data.input).padStart(12);
              const outputText = formatTokens(data.output).padStart(12);
              const costText = formatCost(data.cost).padStart(15);
              return (
                <Box key={date} gap={2}>
                  <Text>
                    {dateText} {sessionsText} {inputText} {outputText} <Text bold>{costText}</Text>
                  </Text>
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </Box>
  );
};
