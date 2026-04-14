import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DataTable from "../components/common/DataTable";
import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import SectionCard from "../components/common/SectionCard";
import StatCard from "../components/common/StatCard";
import {
  subscribeToBatches,
  subscribeToCategories,
  subscribeToStudentById,
} from "../services/studentService";
import { subscribeToStudentScoreLogs } from "../services/scoreService";
import { formatDateTime, formatPoints } from "../utils/formatters";
import { getCategoryBreakdown } from "../utils/scoreHelpers";

function StudentProfilePage() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [batches, setBatches] = useState([]);
  const [logs, setLogs] = useState([]);
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
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
      setError(nextError.message || "Failed to load the student profile.");
      setLoading(false);
    };

    const unsubscribeStudent = subscribeToStudentById(
      studentId,
      (row) => {
        setStudent(row);
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
    const unsubscribeLogs = subscribeToStudentScoreLogs(
      studentId,
      (rows) => {
        setLogs(rows);
        markLoaded();
      },
      handleError
    );

    return () => {
      unsubscribeStudent();
      unsubscribeCategories();
      unsubscribeBatches();
      unsubscribeLogs();
    };
  }, [studentId]);

  const batchNameMap = useMemo(
    () => new Map(batches.map((batch) => [batch.id, batch.name])),
    [batches]
  );
  const breakdown = useMemo(
    () => getCategoryBreakdown(categories, logs),
    [categories, logs]
  );

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const date = new Date(log.createdAt?.toDate?.() || log.createdAt);
      const matchesCategory =
        historyCategoryFilter === "all" || log.categoryId === historyCategoryFilter;
      const matchesFrom = !fromDate || date >= new Date(fromDate);
      const matchesTo = !toDate || date <= new Date(`${toDate}T23:59:59`);

      return matchesCategory && matchesFrom && matchesTo;
    });
  }, [logs, historyCategoryFilter, fromDate, toDate]);

  if (loading) {
    return <LoadingState message="Loading student profile..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  if (!student) {
    return <ErrorState message="This student could not be found." />;
  }

  return (
    <div className="page-grid">
      <div className="page-heading">
        <div>
          <Link to="/students" className="text-link">
            ← Back to students
          </Link>
          <h2>{student.name}</h2>
          <p>
            {student.studentId} · {student.school || "School not set"} ·{" "}
            {batchNameMap.get(student.batch) || "No batch"}
          </p>
        </div>
      </div>

      <section className="stats-grid">
        <StatCard label="Current total score" value={formatPoints(student.totalScore || 0)} />
        <StatCard label="Status" value={student.status} accent="success" />
        <StatCard label="Age" value={student.age || "Not set"} accent="warning" />
        <StatCard label="Score entries" value={logs.length} accent="secondary" />
      </section>

      <div className="two-column-layout">
        <SectionCard title="Student details">
          <div className="details-grid">
            <div>
              <span className="detail-label">Full name</span>
              <strong>{student.name}</strong>
            </div>
            <div>
              <span className="detail-label">Student ID</span>
              <strong>{student.studentId}</strong>
            </div>
            <div>
              <span className="detail-label">Batch / Group</span>
              <strong>{batchNameMap.get(student.batch) || "Not set"}</strong>
            </div>
            <div>
              <span className="detail-label">School</span>
              <strong>{student.school || "Not set"}</strong>
            </div>
            <div>
              <span className="detail-label">Status</span>
              <strong>{student.status}</strong>
            </div>
            <div>
              <span className="detail-label">Notes</span>
              <strong>{student.notes || "No notes yet"}</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Category breakdown">
          <DataTable
            columns={[
              { key: "name", label: "Category" },
              {
                key: "total",
                label: "Points",
                render: (value) => formatPoints(value),
              },
            ]}
            rows={breakdown}
            emptyTitle="No score history yet"
            emptyDescription="Score changes will build a category breakdown automatically."
          />
        </SectionCard>
      </div>

      <SectionCard title="Complete score history">
        <div className="filters-row">
          <label className="filter-field">
            <span>Category</span>
            <select
              value={historyCategoryFilter}
              onChange={(event) => setHistoryCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>From date</span>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label className="filter-field">
            <span>To date</span>
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
        </div>
        <DataTable
          columns={[
            {
              key: "createdAt",
              label: "Date",
              render: (value) => formatDateTime(value),
            },
            { key: "categoryName", label: "Category" },
            {
              key: "signedPoints",
              label: "Points",
              render: (value) => (
                <span className={value >= 0 ? "pill pill--success" : "pill pill--danger"}>
                  {formatPoints(value)}
                </span>
              ),
            },
            { key: "reason", label: "Reason" },
            { key: "teacherName", label: "Teacher" },
            { key: "teacherEmail", label: "Teacher email" },
          ]}
          rows={filteredLogs}
          emptyTitle="No matching history"
          emptyDescription="Try another category or date filter."
        />
      </SectionCard>
    </div>
  );
}

export default StudentProfilePage;
