import { useEffect, useMemo, useState } from "react";
import DataTable from "../components/common/DataTable";
import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import SectionCard from "../components/common/SectionCard";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  saveLeaderboardSnapshot,
  subscribeToLeaderboardSnapshots,
  subscribeToPublicLeaderboard,
} from "../services/scoreService";
import { exportRowsToCsv } from "../utils/csv";
import { formatDate, formatDateTime, formatPoints } from "../utils/formatters";

function formatSnapshotLabel(snapshot) {
  const dateLabel = snapshot.snapshotDateKey
    ? formatDate(new Date(`${snapshot.snapshotDateKey}T00:00:00`))
    : formatDate(snapshot.createdAt);

  return snapshot.batchName
    ? `${dateLabel} - ${snapshot.batchName}`
    : dateLabel;
}

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function LeaderboardPage({ publicView = false }) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [viewFilter, setViewFilter] = useState("present");
  const [batchFilter, setBatchFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingSnapshot, setSavingSnapshot] = useState(false);

  useEffect(() => {
    let loadedStreams = 0;
    const markLoaded = () => {
      loadedStreams += 1;
      if (loadedStreams >= 2) {
        setLoading(false);
      }
    };
    const handleError = (nextError) => {
      setError(nextError.message || "Failed to load leaderboard data.");
      setLoading(false);
    };

    const unsubscribeLeaderboard = subscribeToPublicLeaderboard(
      (nextRows) => {
        setRows(nextRows);
        markLoaded();
      },
      handleError
    );
    const unsubscribeSnapshots = subscribeToLeaderboardSnapshots(
      (nextSnapshots) => {
        setSnapshots(nextSnapshots);
        markLoaded();
      },
      handleError
    );

    return () => {
      unsubscribeLeaderboard();
      unsubscribeSnapshots();
    };
  }, []);

  const selectedSnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.id === viewFilter) || null,
    [snapshots, viewFilter]
  );

  const sourceRows = useMemo(() => {
    if (viewFilter === "present") {
      return rows;
    }

    return (selectedSnapshot?.rows || []).map((row, index) => ({
      ...row,
      id: `${selectedSnapshot.id}-${row.studentRef || row.studentId || index}`,
    }));
  }, [rows, selectedSnapshot, viewFilter]);

  const batchOptions = useMemo(() => {
    const unique = new Set(sourceRows.map((row) => row.batch || "").filter(Boolean));
    return ["all", ...Array.from(unique)];
  }, [sourceRows]);

  useEffect(() => {
    if (!batchOptions.includes(batchFilter)) {
      setBatchFilter("all");
    }
  }, [batchFilter, batchOptions]);

  useEffect(() => {
    if (viewFilter !== "present" && !selectedSnapshot) {
      setViewFilter("present");
    }
  }, [selectedSnapshot, viewFilter]);

  const leaderboardRows = useMemo(() => {
    return sourceRows
      .filter((row) => batchFilter === "all" || row.batch === batchFilter)
      .sort((first, second) => {
        const scoreDiff = (second.totalScore || 0) - (first.totalScore || 0);

        if (scoreDiff !== 0) {
          return scoreDiff;
        }

        return String(first.studentId).localeCompare(String(second.studentId), undefined, {
          numeric: true,
        });
      })
      .map((row, index) => ({
        ...row,
        rank: index + 1,
      }));
  }, [sourceRows, batchFilter]);

  const activeBatchName =
    batchFilter === "all"
      ? "All batches"
      : sourceRows.find((row) => row.batch === batchFilter)?.batchName || batchFilter;

  const scopeCopy =
    viewFilter === "present"
      ? "Showing the current live leaderboard."
      : selectedSnapshot
        ? `Showing saved leaderboard from ${formatSnapshotLabel(selectedSnapshot)}.`
        : "Showing a saved leaderboard.";

  const canSaveSnapshot = !publicView && !!user && !!profile;

  const handleExport = () => {
    exportRowsToCsv("leaderboard.csv", leaderboardRows, [
      { key: "rank", label: "Rank" },
      { key: "studentId", label: "Student ID" },
      { key: "name", label: "Name" },
      { key: "batchName", label: "Batch" },
      { key: "totalScore", label: "Total Score" },
    ]);
  };

  const handleSaveSnapshot = async () => {
    if (!leaderboardRows.length) {
      showToast("There is no leaderboard data to save.", "error");
      return;
    }

    setSavingSnapshot(true);

    try {
      const snapshotDateKey = getTodayDateKey();
      const label =
        batchFilter === "all"
          ? `Leaderboard - ${formatDate(new Date(`${snapshotDateKey}T00:00:00`))}`
          : `${activeBatchName} - ${formatDate(new Date(`${snapshotDateKey}T00:00:00`))}`;

      const snapshotId = await saveLeaderboardSnapshot({
        label,
        snapshotDateKey,
        batchFilter,
        batchName: batchFilter === "all" ? "" : activeBatchName,
        rows: leaderboardRows,
        teacher: {
          ...user,
          displayName: profile?.displayName || user?.displayName,
        },
      });

      setViewFilter(snapshotId);
      showToast("Leaderboard snapshot saved.");
    } catch (nextError) {
      showToast(nextError.message || "Failed to save leaderboard snapshot.", "error");
    } finally {
      setSavingSnapshot(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading leaderboard..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  const content = (
    <div className="page-grid">
      <SectionCard
        title={publicView ? "Public Leaderboard" : "Leaderboard"}
        action={
          !publicView ? (
            <div className="toolbar-actions">
              {canSaveSnapshot ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleSaveSnapshot}
                  disabled={savingSnapshot}
                >
                  {savingSnapshot ? "Saving..." : "Save day leaderboard"}
                </button>
              ) : null}
              <button type="button" className="secondary-button" onClick={handleExport}>
                Export CSV
              </button>
            </div>
          ) : null
        }
      >
        <p className="muted-copy leaderboard-meta">{scopeCopy}</p>
        {viewFilter !== "present" && selectedSnapshot ? (
          <p className="muted-copy leaderboard-meta">
            Saved by {selectedSnapshot.teacherName || "Teacher"} on{" "}
            {formatDateTime(selectedSnapshot.createdAt)}
          </p>
        ) : null}

        <div className="filters-row">
          <label className="filter-field">
            <span>Leaderboard date</span>
            <select value={viewFilter} onChange={(event) => setViewFilter(event.target.value)}>
              <option value="present">Present</option>
              {snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {formatSnapshotLabel(snapshot)}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Batch / Group</span>
            <select value={batchFilter} onChange={(event) => setBatchFilter(event.target.value)}>
              {batchOptions.map((batchId) => (
                <option key={batchId} value={batchId}>
                  {batchId === "all"
                    ? "All batches"
                    : sourceRows.find((row) => row.batch === batchId)?.batchName || batchId}
                </option>
              ))}
            </select>
          </label>
        </div>

        <DataTable
          columns={[
            { key: "rank", label: "Rank" },
            { key: "studentId", label: "Student ID" },
            { key: "name", label: "Student" },
            { key: "batchName", label: "Batch" },
            {
              key: "totalScore",
              label: "Total score",
              render: (value) => formatPoints(value),
            },
          ]}
          rows={leaderboardRows}
          emptyTitle="No leaderboard data"
          emptyDescription={
            viewFilter === "present"
              ? "No public leaderboard data is available yet."
              : "No saved leaderboard rows are available for this selection."
          }
        />
      </SectionCard>
    </div>
  );

  if (publicView) {
    return (
      <main className="public-page-shell">
        <div className="public-page-header">
          <p className="eyebrow">The Tech Academy</p>
          <h1>Leaderboard</h1>
        </div>
        {content}
      </main>
    );
  }

  return content;
}

export default LeaderboardPage;
