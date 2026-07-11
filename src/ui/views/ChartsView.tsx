import React from "react";
import { Box, Text, useInput } from "ink";
import { BarChart } from "@pppp606/ink-chart";
import type { SessionInfo } from "../../data/sessions";
import { formatTokens } from "../../utils/format";

interface ChartsViewProps {
  sessions: SessionInfo[];
  columns: number;
}

const colors = ["cyan", "magenta", "blue", "green", "yellow", "red"] as const;

const getModelColor = (index: number): string => {
  return colors[index % colors.length];
};

export const ChartsView = ({ sessions, columns }: ChartsViewProps): React.JSX.Element => {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const chartsList = ["Tokens Used", "Cache Hits", "Tool Calls", "Model Usage", "Cost per Task"];
  const chartWidth = Math.max(20, Math.floor((columns - 4) * 0.6) - 8);

  useInput((_input, key) => {
    if (key.upArrow) {
      setActiveIndex((prev) => (prev - 1 + chartsList.length) % chartsList.length);
    } else if (key.downArrow) {
      setActiveIndex((prev) => (prev + 1) % chartsList.length);
    }
  });

  const uniqueModels = Array.from(new Set(sessions.map((s) => s.model)));

  const modelColors: Record<string, string> = {};
  uniqueModels.forEach((m, i) => {
    modelColors[m] = getModelColor(i);
  });

  const tokensData = uniqueModels
    .map((model) => {
      const total = sessions
        .filter((s) => s.model === model)
        .reduce((acc, s) => acc + s.inputTokens + s.outputTokens, 0);
      return {
        label: model,
        value: total,
        color: modelColors[model],
      };
    })
    .filter((d) => d.value > 0);

  const cacheHitsData = uniqueModels
    .map((model) => {
      const total = sessions
        .filter((s) => s.model === model)
        .reduce((acc, s) => acc + s.cachedTokens, 0);
      return {
        label: model,
        value: total,
        color: modelColors[model],
      };
    })
    .filter((d) => d.value > 0);

  const toolCallsData = uniqueModels
    .map((model) => {
      const total = sessions
        .filter((s) => s.model === model)
        .reduce((acc, s) => acc + s.toolCalls, 0);
      return {
        label: model,
        value: total,
        color: modelColors[model],
      };
    })
    .filter((d) => d.value > 0);

  const modelUsageData = uniqueModels
    .map((model) => {
      const count = sessions.filter((s) => s.model === model).length;
      return {
        label: model,
        value: count,
        color: modelColors[model],
      };
    })
    .filter((d) => d.value > 0);

  const costPerTaskData = uniqueModels
    .map((model) => {
      const modelSessions = sessions.filter((s) => s.model === model);
      const totalCost = modelSessions.reduce((acc, s) => acc + s.cost, 0);
      const avgCost = modelSessions.length > 0 ? totalCost / modelSessions.length : 0;
      return {
        label: model,
        value: Number(avgCost.toFixed(3)),
        color: modelColors[model],
      };
    })
    .filter((d) => d.value > 0);

  const renderChart = (): React.JSX.Element => {
    let chartData: any[] = [];
    let formatFn: (val: number) => string = (v) => v.toString();

    if (activeIndex === 0) {
      chartData = tokensData;
      formatFn = (v) => formatTokens(v);
    } else if (activeIndex === 1) {
      chartData = cacheHitsData;
      formatFn = (v) => formatTokens(v);
    } else if (activeIndex === 2) {
      chartData = toolCallsData;
      formatFn = (v) => `${v} calls`;
    } else if (activeIndex === 3) {
      chartData = modelUsageData;
      formatFn = (v) => `${v} sessions`;
    } else if (activeIndex === 4) {
      chartData = costPerTaskData;
      formatFn = (v) => `$${v.toFixed(3)}`;
    }

    if (chartData.length === 0) {
      return (
        <Box borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
          <Text dimColor>No data available to display chart.</Text>
        </Box>
      );
    }

    return <BarChart data={chartData} showValue="right" format={formatFn} width={chartWidth} />;
  };

  const renderLegend = (): React.JSX.Element => {
    let legendItems: React.JSX.Element[] = [];

    switch (activeIndex) {
      case 0:
        legendItems = tokensData.map((d) => (
          <Box key={d.label} gap={2}>
            <Text color={modelColors[d.label]}>■ {d.label}:</Text>
            <Text bold>{formatTokens(d.value)}</Text>
          </Box>
        ));
        break;
      case 1:
        legendItems = cacheHitsData.map((d) => (
          <Box key={d.label} gap={2}>
            <Text color={modelColors[d.label]}>■ {d.label}:</Text>
            <Text bold>{formatTokens(d.value)}</Text>
          </Box>
        ));
        break;
      case 2:
        legendItems = toolCallsData.map((d) => (
          <Box key={d.label} gap={2}>
            <Text color={modelColors[d.label]}>■ {d.label}:</Text>
            <Text bold>{d.value} calls</Text>
          </Box>
        ));
        break;
      case 3:
        legendItems = modelUsageData.map((d) => (
          <Box key={d.label} gap={2}>
            <Text color={modelColors[d.label]}>■ {d.label}:</Text>
            <Text bold>{d.value} sessions</Text>
          </Box>
        ));
        break;
      case 4:
        legendItems = costPerTaskData.map((d) => (
          <Box key={d.label} gap={2}>
            <Text color={modelColors[d.label]}>■ {d.label}:</Text>
            <Text bold>${d.value.toFixed(3)} / task</Text>
          </Box>
        ));
        break;
    }

    return (
      <Box flexDirection="column" gap={0}>
        <Text bold underline>
          Legend / Details
        </Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {legendItems.length === 0 ? (
            <Text dimColor>No data available for this chart.</Text>
          ) : (
            legendItems
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box flexDirection="column" gap={1} flexGrow={1}>
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={2}>
        <Text bold underline>
          CHARTS VIEW
        </Text>
        <Box gap={2} marginTop={1} marginBottom={1} flexDirection="column">
          <Text dimColor>
            Use Up/Down Arrow keys to switch between charts. Press Left/Right Arrow keys to switch
            tabs.
          </Text>
          <Box gap={1} flexWrap="wrap">
            {chartsList.map((name, i) => {
              const isSelected = i === activeIndex;
              return (
                <Box key={name} gap={1} marginRight={2}>
                  <Text bold={isSelected} inverse={isSelected}>
                    {isSelected ? "→" : " "} [{i + 1}. {name}]
                  </Text>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      <Box gap={2} flexGrow={1}>
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="gray"
          paddingX={2}
          paddingY={1}
          width="60%"
          minHeight={12}
          justifyContent="center"
        >
          <Box marginBottom={1}>
            <Text bold underline>
              {activeIndex + 1}. {chartsList[activeIndex].toUpperCase()}
            </Text>
          </Box>
          <Box flexGrow={1}>{renderChart()}</Box>
        </Box>

        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="gray"
          paddingX={2}
          paddingY={1}
          width="40%"
        >
          {renderLegend()}
        </Box>
      </Box>
    </Box>
  );
};
