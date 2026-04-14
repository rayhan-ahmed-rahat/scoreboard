import { useEffect, useMemo, useState } from "react";
import DataTable from "../components/common/DataTable";
import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import SectionCard from "../components/common/SectionCard";
import StatCard from "../components/common/StatCard";
import {
  subscribeToBatches,
  subscribeToCategories,
  subscribeToStudents,
} from "../services/studentService";
import { subscribeToScoreLogs } from "../services/scoreService";
import { formatDateTime, formatPoints } from "../utils/formatters";
import { getTopScorers } from "../utils/scoreHelpers";

function DashboardPage() {
  const [students, setStudents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [batches, setBatches] = useState([]);
  const [scoreLogs, setScoreLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let loadedStreams = 0;
    const markLoaded = () => {
      loadedStreams += 1;
      if (loadedStreams >= 4) {
        setLoading(false);
      }
    };

    const handleError = (nextError) => {
      setError(nextError.message || "Failed to load dashboard data.");
      setLoading(false);
    };

    const unsubscribeStudents = subscribeToStudents(
      (rows) => {
        setStudents(rows);
        markLoaded();
      },
      handleError
    );
    const unsubscribeCategories = subscribeToCategories(
      (rows) => {
        setCategories(rows);
        markLoaded();
      },
      handleError
    );
    const unsubscribeBatches = subscribeToBatches(
      (rows) => {
        setBatches(rows);
        markLoaded();
      },
      handleError
    );
    const unsubscribeLogs = subscribeToScoreLogs(
      (rows) => {
        setScoreLogs(rows);
        markLoaded();
      },
      { limitCount: 12 },
      handleError
    );

    return () => {
      unsubscribeStudents();
      unsubscribeCategories();
      unsubscribeBatches();
      unsubscribeLogs();
    };
  }, []);

  const batchNameMap = useMemo(
    () => new Map(batches.map((batch) => [batch.id, batch.name])),
    [batches]
  );
  const topScorers = getTopScorers(students, 5);
  const categorySummary = categories.map((category) => {
    const total = scoreLogs
      .filter((log) => log.categoryId === category.id)
      .reduce((sum, log) => sum + log.signedPoints, 0);

    return {
      id: category.id,
      name: category.name,
      total,
    };
  });

  if (loading) {
    return <LoadingState message="Loading dashboard insights..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="page-grid">
      <section className="stats-grid">
        <StatCard label="Total students" value={students.length} hint="Across all batches" />
        <StatCard
          label="Active students"
          value={students.filter((student) => student.status === "active").length}
          hint="Ready for scoring"
          accent="success"
        />
        <StatCard
          label="Active batches"
          value={batches.filter((batch) => batch.status === "active").length}
          hint="Managed in settings"
          accent="warning"
        />
        <StatCard
          label="Recent score activity"
          value={scoreLogs.length}
          hint="Latest 12 adjustments"
          accent="secondary"
        />
      </section>

      <div className="two-column-layout">
        <SectionCard title="Top scorers">
          <DataTable
            columns={[
              { key: "rank", label: "Rank" },
              { key: "name", label: "Student" },
              {
                key: "batch",
                label: "Batch",
                render: (value) => batchNameMap.get(value) || "Unknown batch",
              },
              {
                key: "totalScore",
                label: "Score",
                render: (value) => formatPoints(value),
              },
            ]}
            rows={topScorers.map((student, index) => ({
              ...student,
              rank: index + 1,
            }))}
            emptyTitle="No students yet"
            emptyDescription="Add or import students to start tracking rankings."
          />
        </SectionCard>

        <SectionCard title="Category summary">
          <DataTable
            columns={[
              { key: "name", label: "Category" },
              {
                key: "total",
                label: "Recent net points",
                render: (value) => formatPoints(value),
              },
            ]}
            rows={categorySummary}
            emptyTitle="No categories yet"
            emptyDescription="Create categories in settings to organize scores."
          />
        </SectionCard>
      </div>

      <SectionCard title="Recent activity">
        <DataTable
          columns={[
            { key: "studentName", label: "Student" },
            { key: "categoryName", label: "Category" },
            {
              key: "signedPoints",
              label: "Change",
              render: (value) => (
                <span className={value >= 0 ? "pill pill--success" : "pill pill--danger"}>
                  {formatPoints(value)}
                </span>
              ),
            },
            { key: "teacherName", label: "Teacher" },
            { key: "reason", label: "Reason" },
            {
              key: "createdAt",
              label: "Time",
              render: (value) => formatDateTime(value),
            },
          ]}
          rows={scoreLogs}
          emptyTitle="No score changes yet"
          emptyDescription="Every score adjustment will appear here with a full audit trail."
        />
      </SectionCard>
    </div>
  );
}

export default DashboardPage;
