import { useEffect, useMemo, useState } from "react";
import DataTable from "../components/common/DataTable";
import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import SectionCard from "../components/common/SectionCard";
import { subscribeToPublicLeaderboard } from "../services/scoreService";
import { exportRowsToCsv } from "../utils/csv";
import { formatPoints } from "../utils/formatters";

function LeaderboardPage({ publicView = false }) {
  const [rows, setRows] = useState([]);
  const [batchFilter, setBatchFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToPublicLeaderboard(
      (nextRows) => {
        setRows(nextRows);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError.message || "Failed to load leaderboard data.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const batchOptions = useMemo(() => {
    const unique = new Set(rows.map((row) => row.batch || "").filter(Boolean));
    return ["all", ...Array.from(unique)];
  }, [rows]);

  const leaderboardRows = useMemo(() => {
    return rows
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
  }, [rows, batchFilter]);

  const handleExport = () => {
    exportRowsToCsv("leaderboard.csv", leaderboardRows, [
      { key: "rank", label: "Rank" },
      { key: "studentId", label: "Student ID" },
      { key: "name", label: "Name" },
      { key: "batchName", label: "Batch" },
      { key: "totalScore", label: "Total Score" },
    ]);
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
            <button type="button" className="secondary-button" onClick={handleExport}>
              Export CSV
            </button>
          ) : null
        }
      >
        <div className="filters-row">
          <label className="filter-field">
            <span>Batch / Group</span>
            <select value={batchFilter} onChange={(event) => setBatchFilter(event.target.value)}>
              {batchOptions.map((batchId) => (
                <option key={batchId} value={batchId}>
                  {batchId === "all"
                    ? "All batches"
                    : rows.find((row) => row.batch === batchId)?.batchName || batchId}
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
          emptyDescription="No public leaderboard data is available yet."
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
