import { useEffect, useMemo, useState } from "react";
import DataTable from "../components/common/DataTable";
import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import SectionCard from "../components/common/SectionCard";
import {
  subscribeToCategories,
  subscribeToStudents,
} from "../services/studentService";
import { subscribeToAllScoreLogs } from "../services/scoreService";
import { exportRowsToCsv } from "../utils/csv";
import { formatDateTime, formatPoints } from "../utils/formatters";
import {
  getCategoryTotalsFromLogs,
  getRecentBonuses,
  getRecentDeductions,
} from "../utils/scoreHelpers";

function ReportsPage() {
  const [students, setStudents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [logs, setLogs] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let loadedStreams = 0;
    const markLoaded = () => {
      loadedStreams += 1;
      if (loadedStreams >= 3) {
        setLoading(false);
      }
    };
    const handleError = (nextError) => {
      setError(nextError.message || "Failed to load reports.");
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
    const unsubscribeLogs = subscribeToAllScoreLogs(
      (rows) => {
        setLogs(rows);
        markLoaded();
      },
      handleError
    );

    return () => {
      unsubscribeStudents();
      unsubscribeCategories();
      unsubscribeLogs();
    };
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const date = new Date(log.createdAt?.toDate?.() || log.createdAt);
      const matchesFrom = !fromDate || date >= new Date(fromDate);
      const matchesTo = !toDate || date <= new Date(`${toDate}T23:59:59`);
      return matchesFrom && matchesTo;
    });
  }, [logs, fromDate, toDate]);

  const categoryRows = useMemo(
    () => getCategoryTotalsFromLogs(categories, filteredLogs),
    [categories, filteredLogs]
  );
  const studentTotals = useMemo(() => {
    const totalsByStudentId = new Map();

    filteredLogs.forEach((log) => {
      totalsByStudentId.set(
        log.studentRef,
        (totalsByStudentId.get(log.studentRef) || 0) + log.signedPoints
      );
    });

    return students
      .map((student) => ({
        ...student,
        filteredTotal: totalsByStudentId.get(student.id) || 0,
      }))
      .sort((a, b) => b.filteredTotal - a.filteredTotal);
  }, [students, filteredLogs]);
  const recentDeductions = useMemo(() => getRecentDeductions(filteredLogs, 10), [filteredLogs]);
  const recentBonuses = useMemo(() => getRecentBonuses(filteredLogs, 10), [filteredLogs]);

  if (loading) {
    return <LoadingState message="Loading reports..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="page-grid">
      <SectionCard
        title="Report filters"
        action={
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              exportRowsToCsv("score-logs.csv", filteredLogs.map((log) => ({
                ...log,
                createdAtLabel: formatDateTime(log.createdAt),
              })), [
                { key: "studentName", label: "Student" },
                { key: "studentId", label: "Student ID" },
                { key: "categoryName", label: "Category" },
                { key: "signedPoints", label: "Signed Points" },
                { key: "type", label: "Type" },
                { key: "reason", label: "Reason" },
                { key: "teacherName", label: "Teacher" },
                { key: "teacherEmail", label: "Teacher Email" },
                { key: "createdAtLabel", label: "Created At" },
              ])
            }
          >
            Export score logs
          </button>
        }
      >
        <div className="filters-row">
          <label className="filter-field">
            <span>From date</span>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label className="filter-field">
            <span>To date</span>
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
        </div>
      </SectionCard>

      <div className="two-column-layout">
        <SectionCard
          title="Total points by student"
          action={
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                exportRowsToCsv(
                  "student-points-report.csv",
                  studentTotals,
                  [
                    { key: "name", label: "Student" },
                    { key: "studentId", label: "Student ID" },
                    { key: "filteredTotal", label: "Total Score" },
                  ]
                )
              }
            >
              Export student totals
            </button>
          }
        >
          <DataTable
            columns={[
              { key: "name", label: "Student" },
              { key: "studentId", label: "Student ID" },
              {
                key: "filteredTotal",
                label: "Total points",
                render: (value) => formatPoints(value),
              },
            ]}
            rows={studentTotals}
            emptyTitle="No students yet"
            emptyDescription="Add students to create the first report."
          />
        </SectionCard>

        <SectionCard title="Points by category">
          <DataTable
            columns={[
              { key: "name", label: "Category" },
              {
                key: "total",
                label: "Net points",
                render: (value) => formatPoints(value),
              },
            ]}
            rows={categoryRows}
            emptyTitle="No category data"
            emptyDescription="Score logs will roll up here automatically."
          />
        </SectionCard>
      </div>

      <div className="two-column-layout">
        <SectionCard title="Recent deductions">
          <DataTable
            columns={[
              { key: "studentName", label: "Student" },
              { key: "categoryName", label: "Category" },
              {
                key: "signedPoints",
                label: "Points",
                render: (value) => formatPoints(value),
              },
              { key: "reason", label: "Reason" },
              {
                key: "createdAt",
                label: "Date",
                render: (value) => formatDateTime(value),
              },
            ]}
            rows={recentDeductions}
            emptyTitle="No deductions yet"
            emptyDescription="Any deducted points will show here for quick review."
          />
        </SectionCard>

        <SectionCard title="Recent bonuses">
          <DataTable
            columns={[
              { key: "studentName", label: "Student" },
              { key: "categoryName", label: "Category" },
              {
                key: "signedPoints",
                label: "Points",
                render: (value) => formatPoints(value),
              },
              { key: "reason", label: "Reason" },
              {
                key: "createdAt",
                label: "Date",
                render: (value) => formatDateTime(value),
              },
            ]}
            rows={recentBonuses}
            emptyTitle="No bonuses yet"
            emptyDescription="Positive bonus adjustments will appear here."
          />
        </SectionCard>
      </div>
    </div>
  );
}

export default ReportsPage;
