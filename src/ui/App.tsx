import React from "react";
import { Box, Text, useInput, useApp } from "ink";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Dashboard } from "./views/Dashboard";
import { SessionsList } from "./views/SessionsList";
import { SessionDetail } from "./views/SessionDetail";
import { ProjectsSummary } from "./views/ProjectsSummary";
import { ChartsView } from "./views/ChartsView";
import { fetchPricingDynamically, loadPricingCache } from "../data/pricing";
import { getSessionsList, type SessionInfo } from "../data/sessions";

const TABS = ["dashboard", "sessions", "projects", "charts"] as const;
type TabType = (typeof TABS)[number] | "detail";

const useTerminalSize = () => {
  const [size, setSize] = React.useState({
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  });

  React.useEffect(() => {
    const handleResize = () => {
      setSize({
        columns: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
      });
    };

    process.stdout.on("resize", handleResize);
    return () => {
      process.stdout.off("resize", handleResize);
    };
  }, []);

  return size;
};

export const App = (): React.JSX.Element => {
  const { exit } = useApp();
  const { columns, rows } = useTerminalSize();
  const [activeTab, setActiveTab] = React.useState<TabType>("dashboard");
  const [sessions, setSessions] = React.useState<SessionInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null);
  const [projectFilter, setProjectFilter] = React.useState<string | null>(null);
  const [projectSelectedIndex, setProjectSelectedIndex] = React.useState(0);

  React.useEffect(() => {
    process.stdout.write("\u001b[?1049h");
    return () => {
      process.stdout.write("\u001b[?1049l");
    };
  }, []);

  React.useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        await loadPricingCache();
        const data = await getSessionsList();
        setSessions(data);
        fetchPricingDynamically();
      } catch (e) {
        // Ignored
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  useInput((input, key) => {
    if (input === "q") {
      exit();
      return;
    }

    if (activeTab === "detail") {
      if (key.escape || key.backspace) {
        setActiveTab("sessions");
        setSelectedSessionId(null);
      }
      return;
    }

    const switchTab = (tab: (typeof TABS)[number]) => {
      if (tab !== "sessions") setProjectFilter(null);
      setActiveTab(tab);
    };

    if (key.leftArrow) {
      const idx = TABS.indexOf(activeTab as any);
      switchTab(TABS[(idx - 1 + TABS.length) % TABS.length]);
    } else if (key.rightArrow) {
      const idx = TABS.indexOf(activeTab as any);
      switchTab(TABS[(idx + 1) % TABS.length]);
    } else if (input === "1") {
      switchTab("dashboard");
    } else if (input === "2") {
      switchTab("sessions");
    } else if (input === "3") {
      switchTab("projects");
    } else if (input === "4") {
      switchTab("charts");
    }

    if (activeTab === "sessions") {
      if (key.escape) {
        setProjectFilter(null);
        return;
      }
      const visibleSessions = projectFilter
        ? sessions.filter((s) => (s.workspace || "Global Context") === projectFilter)
        : sessions;
      if (visibleSessions.length > 0) {
        if (key.downArrow) {
          setSelectedIndex((prev) => Math.min(visibleSessions.length - 1, prev + 1));
        } else if (key.upArrow) {
          setSelectedIndex((prev) => Math.max(0, prev - 1));
        } else if (key.return) {
          setSelectedSessionId(visibleSessions[selectedIndex].id);
          setActiveTab("detail");
        }
      }
    }

    if (activeTab === "projects") {
      const costMap: Record<string, number> = {};
      for (const s of sessions) {
        const ws = s.workspace || "Global Context";
        costMap[ws] = (costMap[ws] ?? 0) + s.cost;
      }
      const orderedProjects = Object.keys(costMap).sort((a, b) => costMap[b] - costMap[a]);
      if (key.downArrow) {
        setProjectSelectedIndex((prev) => Math.min(orderedProjects.length - 1, prev + 1));
      } else if (key.upArrow) {
        setProjectSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.return && orderedProjects.length > 0) {
        setProjectFilter(orderedProjects[projectSelectedIndex]);
        setSelectedIndex(0);
        setActiveTab("sessions");
      }
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text bold>Loading metrics data...</Text>
      </Box>
    );
  }

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const filteredSessions = projectFilter
    ? sessions.filter((s) => (s.workspace || "Global Context") === projectFilter)
    : sessions;

  const sessionsPageSize = Math.max(3, rows - 12);
  const detailTimelinePageSize = Math.max(3, rows - 14);

  return (
    <Box
      flexDirection="column"
      width={columns}
      height={rows}
      padding={1}
      justifyContent="space-between"
    >
      <Box flexDirection="column" flexGrow={1}>
        <Header activeTab={activeTab} />

        <Box flexGrow={1} flexDirection="column" minHeight={0}>
          {activeTab === "dashboard" && <Dashboard sessions={sessions} />}
          {activeTab === "sessions" && (
            <SessionsList
              sessions={filteredSessions}
              selectedIndex={selectedIndex}
              pageSize={sessionsPageSize}
              filterWorkspace={projectFilter}
            />
          )}
          {activeTab === "projects" && (
            <ProjectsSummary sessions={sessions} selectedIndex={projectSelectedIndex} />
          )}
          {activeTab === "charts" && <ChartsView sessions={sessions} columns={columns} />}
          {activeTab === "detail" && selectedSession && (
            <SessionDetail
              session={selectedSession}
              timelinePageSize={detailTimelinePageSize}
              onBack={() => {
                setActiveTab("sessions");
                setSelectedSessionId(null);
              }}
            />
          )}
        </Box>
      </Box>

      <Footer />
    </Box>
  );
};
