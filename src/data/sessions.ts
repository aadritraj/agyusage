import { Database } from "bun:sqlite";
import { Glob } from "bun";
import os from "node:os";
import path from "node:path";
import { extractMetadata, parseProtoToDict, extractWorkspaceFromBlob } from "../utils/proto";
import { calculateCost } from "./pricing";

export interface SessionInfo {
  id: string;
  model: string;
  workspace: string;
  workspaceName: string;
  lastActive: Date;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cost: number;
  stepsCount: number;
}

const baseDir = path.join(os.homedir(), ".gemini", "antigravity-cli");

export const loadHistoryMap = async (): Promise<
  Record<string, { workspace: string; timestamp: number }>
> => {
  const map: Record<string, { workspace: string; timestamp: number }> = {};
  const historyPath = path.join(baseDir, "history.jsonl");
  try {
    const file = Bun.file(historyPath);
    if (await file.exists()) {
      const text = await file.text();
      const lines = text.trim().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          if (entry.conversationId) {
            map[entry.conversationId] = {
              workspace: entry.workspace || "",
              timestamp: entry.timestamp || Date.now(),
            };
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    // Catch this, an empty catch block!
  }
  return map;
};

export const getSessionsList = async (): Promise<SessionInfo[]> => {
  const conversationsDir = path.join(baseDir, "conversations");
  const historyMap = await loadHistoryMap();
  const sessions: SessionInfo[] = [];

  const glob = new Glob("*.db");
  const dbFiles: string[] = [];

  try {
    for await (const file of glob.scan(conversationsDir)) {
      dbFiles.push(file);
    }
  } catch (e) {
    // Did you even use the CLI? If you did, why did this happen?
    return [];
  }

  for (const dbName of dbFiles) {
    const convId = dbName.endsWith(".db") ? dbName.slice(0, -3) : dbName;
    const dbPath = path.join(conversationsDir, dbName);

    try {
      const stat = await Bun.file(dbPath).stat();
      const lastActive = stat.mtime ? new Date(stat.mtime) : new Date();

      const db = new Database(dbPath, { readonly: true });

      let workspace = "";
      try {
        const metadataRow = db
          .query("SELECT data FROM trajectory_metadata_blob WHERE id = 'main'")
          .get() as { data: Uint8Array } | null;
        if (metadataRow && metadataRow.data) {
          const wsUri = extractWorkspaceFromBlob(metadataRow.data);
          if (wsUri) {
            workspace = wsUri.replace(/^file:\/\//, "");
          }
        }
      } catch (e) {
        // Get ignored again, falls back to history.jsonl
      }

      if (!workspace && historyMap[convId]) {
        workspace = historyMap[convId].workspace;
      }

      let inputTokens = 0;
      let outputTokens = 0;
      let cachedTokens = 0;
      let stepsCount = 0;
      let model = "Unknown Model";

      try {
        const rows = db.query("SELECT data FROM gen_metadata").all() as Array<{ data: Uint8Array }>;
        stepsCount = rows.length;
        for (const row of rows) {
          if (row.data) {
            try {
              const proto = parseProtoToDict(row.data);
              const meta = extractMetadata(proto);
              if (meta.model && meta.model !== "Unknown Model") {
                model = meta.model;
              }
              inputTokens += meta.inputTokens;
              outputTokens += meta.outputTokens;
              cachedTokens += meta.cachedTokens;
            } catch (e) {
              // Ignored individual step proto error
            }
          }
        }
      } catch (e) {
        // Ignored gen_metadata query error
      } finally {
        db.close();
      }

      if (inputTokens > 0 || outputTokens > 0) {
        const cost = calculateCost(model, inputTokens, outputTokens, cachedTokens);
        const workspaceName = workspace ? path.basename(workspace) : "Global Context";

        sessions.push({
          id: convId,
          model,
          workspace,
          workspaceName,
          lastActive,
          inputTokens,
          outputTokens,
          cachedTokens,
          cost,
          stepsCount,
        });
      }
    } catch (e) {
      // Ignored individual DB error
    }
  }

  return sessions.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
};
