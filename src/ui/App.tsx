import React from "react";
import { Box, Text, useInput, useApp } from "ink";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Dashboard } from "./views/Dashboard";
import { SessionsList } from "./views/SessionsList";
import { SessionDetail } from "./views/SessionDetail";
import { ProjectsSummary } from "./views/ProjectsSummary";
import { ChartsView } from "./views/ChartsView";
import { useTerminalSize } from "./hooks/useTerminalSize";
import { useScrollableList } from "./hooks/useScrollableList";
import { fetchPricingDynamically, loadPricingCache } from "../data/pricing";
import { getSessionsList, type SessionInfo } from "../data/sessions";

const TABS = ["dashboard", "sessions", "projects", "charts"] as const;
type Tab = (typeof TABS)[number] | "detail";

const TAB_KEYS: Record<string, (typeof TABS)[number]> = {
  "1": "dashboard",
  "2": "sessions",
  "3": "projects",
  "4": "charts",
};

const sortedProjectWorkspaces = (sessions: SessionInfo[]): string[] => {
  const costs: Record<string, number> = {};
  for (const s of sessions) {
    const ws = s.workspace || "Global Context";
    costs[ws] = (costs[ws] ?? 0) + s.cost;
  }
  return Object.keys(costs).sort((a, b) => costs[b] - costs[a]);
};

export const App = (): React.JSX.Element => {
  const { exit } = useApp();
  const { columns, rows } = useTerminalSize();

  const [activeTab, setActiveTab] = React.useState<Tab>("dashboard");
  const [sessions, setSessions] = React.useState<SessionInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sessionIndex, setSessionIndex] = React.useState(0);
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null);
  const [projectFilter, setProjectFilter] = React.useState<string | null>(null);
  const [projectIndex, setProjectIndex] = React.useState(0);

  React.useEffect(() => {
    process.stdout.write("\u001b[?1049h");
    return () => {
      process.stdout.write("\u001b[?1049l");
    };
  }, []);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadPricingCache();
        setSessions(await getSessionsList());
        fetchPricingDynamically();
      } catch {
        // Ignored
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const switchTab = React.useCallback((tab: (typeof TABS)[number]) => {
    if (tab !== "sessions") setProjectFilter(null);
    setActiveTab(tab);
  }, []);

  useInput((input, key) => {
    if (input === "q") return exit();

    if (activeTab === "detail") {
      if (key.escape || key.backspace) {
        setActiveTab("sessions");
        setSelectedSessionId(null);
      }
      return;
    }

    // Tab switching
    const i = TABS.indexOf(activeTab as (typeof TABS)[number]);
    if (key.leftArrow) switchTab(TABS[(i - 1 + TABS.length) % TABS.length]);
    else if (key.rightArrow) switchTab(TABS[(i + 1) % TABS.length]);
    else if (input in TAB_KEYS) switchTab(TAB_KEYS[input]);

    // Sessions tab escape
    if (activeTab === "sessions" && key.escape) setProjectFilter(null);
  });

  const filteredSessions = React.useMemo(
    () =>
      projectFilter
        ? sessions.filter((s) => (s.workspace || "Global Context") === projectFilter)
        : sessions,
    [sessions, projectFilter],
  );

  const projects = React.useMemo(() => sortedProjectWorkspaces(sessions), [sessions]);

  useScrollableList(sessionIndex, setSessionIndex, {
    length: filteredSessions.length,
    isActive: activeTab === "sessions",
    onSelect: (i) => {
      setSelectedSessionId(filteredSessions[i].id);
      setActiveTab("detail");
    },
  });

  useScrollableList(projectIndex, setProjectIndex, {
    length: projects.length,
    isActive: activeTab === "projects",
    onSelect: (i) => {
      setProjectFilter(projects[i]);
      setSessionIndex(0);
      setActiveTab("sessions");
    },
  });

  if (loading) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text bold>Loading metrics data...</Text>
      </Box>
    );
  }

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  const sessionsPageSize = Math.max(3, rows - 12);
  const detailPageSize = Math.max(3, rows - 14);

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
              selectedIndex={sessionIndex}
              pageSize={sessionsPageSize}
              filterWorkspace={projectFilter}
            />
          )}
          {activeTab === "projects" && (
            <ProjectsSummary sessions={sessions} selectedIndex={projectIndex} />
          )}
          {activeTab === "charts" && <ChartsView sessions={sessions} columns={columns} />}
          {activeTab === "detail" && selectedSession && (
            <SessionDetail
              session={selectedSession}
              timelinePageSize={detailPageSize}
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
