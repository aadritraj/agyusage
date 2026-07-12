import os from "node:os";
import path from "node:path";

export interface TranscriptStep {
  stepIndex: number;
  source: string;
  type: string;
  status: string;
  createdAt: string;
  content: string;
  toolCalls?: Array<{ name: string; args: any }>;
  thinking?: string;
}

const baseDir = path.join(os.homedir(), ".gemini", "antigravity-cli");

export const getSessionTranscript = async (convId: string): Promise<TranscriptStep[]> => {
  const transcriptPath = path.join(
    baseDir,
    "brain",
    convId,
    ".system_generated",
    "logs",
    "transcript.jsonl",
  );
  const steps: TranscriptStep[] = [];

  try {
    const file = Bun.file(transcriptPath);
    if (await file.exists()) {
      const text = await file.text();
      const lines = text.trim().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          // Only show steps that have content or tool calls to keep it clean
          if (
            entry.type === "USER_INPUT" ||
            entry.type === "PLANNER_RESPONSE" ||
            entry.type === "RUN_COMMAND" ||
            entry.type === "WRITE_FILE"
          ) {
            steps.push({
              stepIndex: entry.step_index ?? 0,
              source: entry.source ?? "",
              type: entry.type ?? "",
              status: entry.status ?? "",
              createdAt: entry.created_at ?? "",
              content: entry.content ?? "",
              toolCalls: entry.tool_calls ?? undefined,
              thinking: entry.thinking ?? undefined,
            });
          }
        } catch {
          // Ignored line errors
        }
      }
    }
  } catch {
    // Ignored log reading errors
  }

  return steps.sort((a, b) => a.stepIndex - b.stepIndex);
};
