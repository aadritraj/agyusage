import React from "react";
import { Box, Text, useInput } from "ink";
import { type SessionInfo } from "../../data/sessions";
import { getSessionTranscript, type TranscriptStep } from "../../data/transcript";
import { formatCost, formatTokens } from "../../utils/format";

interface SessionDetailProps {
  session: SessionInfo;
  timelinePageSize: number;
  onBack: () => void;
}

export const SessionDetail = ({
  session,
  timelinePageSize,
  onBack,
}: SessionDetailProps): React.JSX.Element => {
  const [steps, setSteps] = React.useState<TranscriptStep[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedStepIndex, setSelectedStepIndex] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    const fetchTranscript = async () => {
      setLoading(true);
      try {
        const transcriptSteps = await getSessionTranscript(session.id);
        if (active) {
          setSteps(transcriptSteps);
          setSelectedStepIndex(0);
        }
      } catch {
        // Ignored
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchTranscript();
    return () => {
      active = false;
    };
  }, [session.id]);

  useInput((_input, key) => {
    if (loading || steps.length === 0) return;

    if (key.upArrow) {
      setSelectedStepIndex((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
    } else if (key.escape || key.backspace) {
      onBack();
    }
  });

  if (loading) {
    return (
      <Box borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
        <Text>Loading session transcript...</Text>
      </Box>
    );
  }

  const selectedStep = steps[selectedStepIndex];
  const currentPage = Math.floor(selectedStepIndex / timelinePageSize);
  const totalPages = Math.ceil(steps.length / timelinePageSize);
  const startIndex = currentPage * timelinePageSize;
  const pageSteps = steps.slice(startIndex, startIndex + timelinePageSize);

  return (
    <Box flexDirection="column" gap={1} flexGrow={1}>
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={2}>
        <Text bold underline>
          Session Details
        </Text>
        <Box gap={4} marginTop={1}>
          <Box flexDirection="column">
            <Text dimColor>Workspace:</Text>
            <Text bold>{session.workspace || "Global Context"}</Text>
          </Box>
          <Box flexDirection="column">
            <Text dimColor>Model:</Text>
            <Text bold>{session.model}</Text>
          </Box>
          <Box flexDirection="column">
            <Text dimColor>Total Cost:</Text>
            <Text bold>{formatCost(session.cost)}</Text>
          </Box>
          <Box flexDirection="column">
            <Text dimColor>Tokens (In/Out/Cached):</Text>
            <Text bold>
              {formatTokens(session.inputTokens)} / {formatTokens(session.outputTokens)} /{" "}
              {formatTokens(session.cachedTokens)}
            </Text>
          </Box>
        </Box>
      </Box>

      {steps.length === 0 ? (
        <Box borderStyle="single" borderColor="gray" paddingX={2} paddingY={1} flexGrow={1}>
          <Text dimColor>No transcript steps available for this session.</Text>
        </Box>
      ) : (
        <Box gap={2} flexGrow={1}>
          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor="gray"
            paddingX={2}
            width="45%"
            flexGrow={1}
          >
            <Box justifyContent="space-between" marginBottom={1}>
              <Text bold>Timeline</Text>
              <Text dimColor>
                Step {selectedStepIndex + 1}/{steps.length}
              </Text>
            </Box>

            <Box flexDirection="column" flexGrow={1}>
              {pageSteps.map((step, index) => {
                const globalIdx = startIndex + index;
                const isSelected = globalIdx === selectedStepIndex;
                const statusSymbol =
                  step.status === "DONE" ? "✓" : step.status === "ERROR" ? "✗" : "•";
                const displayType = step.type.slice(0, 15).padEnd(16);

                return (
                  <Text key={step.stepIndex} bold={isSelected} inverse={isSelected}>
                    {isSelected ? "→" : " "} [{step.stepIndex}] {statusSymbol} {displayType}
                  </Text>
                );
              })}
            </Box>
            <Box marginTop={1}>
              <Text dimColor>
                Page {currentPage + 1} of {totalPages}
              </Text>
            </Box>
          </Box>

          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor="gray"
            paddingX={2}
            width="55%"
            flexGrow={1}
          >
            <Text bold>STEP INSPECTOR</Text>
            <Text dimColor>────────────────────────────────────────────</Text>
            {selectedStep && (
              <Box flexDirection="column" gap={1}>
                <Box gap={1}>
                  <Text dimColor>Source:</Text>
                  <Text bold>{selectedStep.source}</Text>
                  <Text dimColor>Type:</Text>
                  <Text bold>{selectedStep.type}</Text>
                </Box>

                {selectedStep.thinking && (
                  <Box flexDirection="column">
                    <Text dimColor bold>
                      Thinking:
                    </Text>
                    <Text wrap="truncate-end" color="gray">
                      {selectedStep.thinking.slice(0, 150)}
                      {selectedStep.thinking.length > 150 ? "..." : ""}
                    </Text>
                  </Box>
                )}

                {selectedStep.toolCalls && selectedStep.toolCalls.length > 0 && (
                  <Box flexDirection="column">
                    <Text dimColor bold>
                      Tool Calls:
                    </Text>
                    {selectedStep.toolCalls.map((tc, idx) => (
                      <Text key={idx} bold>
                        {" "}
                        • {tc.name}({JSON.stringify(tc.args).slice(0, 30)}...)
                      </Text>
                    ))}
                  </Box>
                )}

                {selectedStep.content && (
                  <Box flexDirection="column">
                    <Text dimColor bold>
                      Content:
                    </Text>
                    <Text wrap="truncate-end">
                      {selectedStep.content.slice(0, 150)}
                      {selectedStep.content.length > 150 ? "..." : ""}
                    </Text>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};
