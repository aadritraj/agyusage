import React from "react";
import { Box, Text, useInput, useApp } from "ink";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Dashboard } from "./views/Dashboard";
import { SessionsList } from "./views/SessionsList";
import { SessionDetail } from "./views/SessionDetail";
import { ProjectsSummary } from "./views/ProjectsSummary";
import { fetchPricingDynamically, loadPricingCache } from "../data/pricing";
import { getSessionsList, type SessionInfo } from "../data/sessions";

const TABS = ["dashboard", "sessions", "projects"] as const;
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

    if (key.leftArrow) {
      const idx = TABS.indexOf(activeTab as any);
      const nextIdx = (idx - 1 + TABS.length) % TABS.length;
      setActiveTab(TABS[nextIdx]);
    } else if (key.rightArrow) {
      const idx = TABS.indexOf(activeTab as any);
      const nextIdx = (idx + 1) % TABS.length;
      setActiveTab(TABS[nextIdx]);
    } else if (input === "1") {
      setActiveTab("dashboard");
    } else if (input === "2") {
      setActiveTab("sessions");
    } else if (input === "3") {
      setActiveTab("projects");
    }

    if (activeTab === "sessions" && sessions.length > 0) {
      if (key.downArrow) {
        setSelectedIndex((prev) => Math.min(sessions.length - 1, prev + 1));
      } else if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.return) {
        setSelectedSessionId(sessions[selectedIndex].id);
        setActiveTab("detail");
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
        <Header />

        {activeTab !== "detail" && (
          <Box gap={4} marginBottom={1} paddingX={2}>
            <Text bold={activeTab === "dashboard"} inverse={activeTab === "dashboard"}>
              [ 1. Dashboard]
            </Text>
            <Text bold={activeTab === "sessions"} inverse={activeTab === "sessions"}>
              [ 2. Sessions ]
            </Text>
            <Text bold={activeTab === "projects"} inverse={activeTab === "projects"}>
              [ 3. Projects ]
            </Text>
          </Box>
        )}

        <Box flexGrow={1} flexDirection="column" minHeight={0}>
          {activeTab === "dashboard" && <Dashboard sessions={sessions} />}
          {activeTab === "sessions" && (
            <SessionsList
              sessions={sessions}
              selectedIndex={selectedIndex}
              pageSize={sessionsPageSize}
            />
          )}
          {activeTab === "projects" && <ProjectsSummary sessions={sessions} />}
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
