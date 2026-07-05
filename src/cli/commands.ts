import { loadPricingCache } from "../data/pricing";
import { getSessionsList } from "../data/sessions";
import { formatCost, formatTokens, pad } from "../utils/format";

interface Subcommand {
  name: string;
  description: string;
  action: () => Promise<void> | void;
  aliases?: string[];
}

const printDailyUsage = async (): Promise<void> => {
  await loadPricingCache();
  const sessions = await getSessionsList();

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

  const sortedDates = Object.keys(dailyData).sort((a, b) => b.localeCompare(a));

  console.log("\nDaily Antigravity Spend");
  console.log("─".repeat(70));
  console.log(
    `${pad("Date", 15)} | ${pad("Sessions", 10, "right")} | ${pad("Input", 12, "right")} | ${pad("Output", 12, "right")} | ${pad("Total Spend", 14, "right")}`,
  );
  console.log("─".repeat(70));

  let grandCost = 0;
  let grandInput = 0;
  let grandOutput = 0;
  let grandSessions = 0;

  for (const date of sortedDates) {
    const data = dailyData[date];
    console.log(
      `${pad(date, 15)} | ${pad(data.sessionsCount.toString(), 10, "right")} | ${pad(formatTokens(data.input), 12, "right")} | ${pad(formatTokens(data.output), 12, "right")} | ${pad(formatCost(data.cost), 14, "right")}`,
    );
    grandCost += data.cost;
    grandInput += data.input;
    grandOutput += data.output;
    grandSessions += data.sessionsCount;
  }

  console.log("─".repeat(70));
  console.log(
    `${pad("TOTALS", 15)} | ${pad(grandSessions.toString(), 10, "right")} | ${pad(formatTokens(grandInput), 12, "right")} | ${pad(formatTokens(grandOutput), 12, "right")} | ${pad(formatCost(grandCost), 14, "right")}\n`,
  );
};

const printProjectsUsage = async (): Promise<void> => {
  await loadPricingCache();
  const sessions = await getSessionsList();

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

  const sortedProjects = Object.values(projectMap).sort((a, b) => b.cost - a.cost);

  console.log("\nProject Workspace Spend Summary");
  console.log("─".repeat(75));
  console.log(
    `${pad("Project Workspace", 25)} | ${pad("Sessions", 10, "right")} | ${pad("Input", 12, "right")} | ${pad("Output", 12, "right")} | ${pad("Total Spend", 12, "right")}`,
  );
  console.log("─".repeat(75));

  for (const p of sortedProjects) {
    console.log(
      `${pad(p.workspaceName, 25)} | ${pad(p.sessionsCount.toString(), 10, "right")} | ${pad(formatTokens(p.input), 12, "right")} | ${pad(formatTokens(p.output), 12, "right")} | ${pad(formatCost(p.cost), 12, "right")}`,
    );
  }
  console.log("─".repeat(75) + "\n");
};

const printSessionsList = async (): Promise<void> => {
  await loadPricingCache();
  const sessions = await getSessionsList();

  console.log("\nConversation Sessions Spend");
  console.log("─".repeat(90));
  console.log(
    `${pad("Date/Time", 19)} | ${pad("Workspace", 20)} | ${pad("Model Name", 25)} | ${pad("Steps", 6, "right")} | ${pad("Cost", 12, "right")}`,
  );
  console.log("─".repeat(90));

  for (const s of sessions) {
    const d = s.lastActive;
    const padNum = (n: number) => n.toString().padStart(2, "0");
    const dateStr = `${d.getFullYear()}-${padNum(d.getMonth() + 1)}-${padNum(d.getDate())} ${padNum(d.getHours())}:${padNum(d.getMinutes())}:${padNum(d.getSeconds())}`;

    console.log(
      `${pad(dateStr, 19)} | ${pad(s.workspaceName, 20)} | ${pad(s.model, 25)} | ${pad(s.stepsCount.toString(), 6, "right")} | ${pad(formatCost(s.cost), 12, "right")}`,
    );
  }
  console.log("─".repeat(90) + "\n");
};

export const printHelp = (): void => {
  console.log("\nUsage: agyusage [subcommand]\n");
  console.log("If run without arguments, boots into the interactive dashboard.\n");
  console.log("Available Subcommands:");
  for (const cmd of COMMANDS) {
    console.log(`  ${pad(cmd.name, 10)}  ${cmd.description}`);
  }
  console.log();
};

export const COMMANDS: Subcommand[] = [
  {
    name: "daily",
    description: "Print daily token usage and cost metrics",
    action: printDailyUsage,
  },
  {
    name: "projects",
    description: "Print aggregated spend per project/workspace",
    action: printProjectsUsage,
  },
  {
    name: "sessions",
    description: "Print individual conversation log metrics",
    action: printSessionsList,
  },
  {
    name: "help",
    description: "Print this help menu",
    action: printHelp,
    aliases: ["--help", "-h"],
  },
];
