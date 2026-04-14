import { useEffect, useMemo, useState } from "react";
import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import SectionCard from "../components/common/SectionCard";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  subscribeToBatches,
  subscribeToCategories,
  subscribeToStudents,
} from "../services/studentService";
import {
  createBulkScoreAdjustments,
  subscribeToAllScoreLogs,
} from "../services/scoreService";

function sortStudentsByNumericId(rows) {
  return [...rows].sort((first, second) => {
    const firstId = Number(first.studentId);
    const secondId = Number(second.studentId);
    const firstNumeric = Number.isFinite(firstId);
    const secondNumeric = Number.isFinite(secondId);

    if (firstNumeric && secondNumeric) {
      return firstId - secondId;
    }

    return String(first.studentId).localeCompare(String(second.studentId), undefined, {
      numeric: true,
    });
  });
}

function buildCategoryScoreMap(logs) {
  const totals = {};

  logs.forEach((log) => {
    if (!totals[log.studentRef]) {
      totals[log.studentRef] = {};
    }

    totals[log.studentRef][log.categoryId] =
      (totals[log.studentRef][log.categoryId] || 0) + log.signedPoints;
  });

  return totals;
}

function ScoreEntryPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [students, setStudents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [batches, setBatches] = useState([]);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [rowInputs, setRowInputs] = useState({});
  const [busyCellKey, setBusyCellKey] = useState("");
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
      setError(nextError.message || "Failed to load score entry data.");
      setLoading(false);
    };

    const unsubscribeStudents = subscribeToStudents(
      (rows) => {
        setStudents(sortStudentsByNumericId(rows));
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
      unsubscribeBatches();
      unsubscribeLogs();
    };
  }, []);

  const categoryScoreMap = useMemo(() => buildCategoryScoreMap(logs), [logs]);

  const visibleStudents = useMemo(() => {
    return sortStudentsByNumericId(
      students.filter((student) => {
        const matchesSearch =
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(student.studentId).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBatch = batchFilter === "all" || student.batch === batchFilter;
        return matchesSearch && matchesBatch;
      })
    );
  }, [students, searchTerm, batchFilter]);

  const getDisplayedValue = (studentId, categoryId) => {
    const draftValue = rowInputs[studentId]?.[categoryId];

    if (draftValue !== undefined) {
      return draftValue;
    }

    return String(categoryScoreMap[studentId]?.[categoryId] || 0);
  };

  const updateRowInput = (studentId, field, value) => {
    setRowInputs((current) => ({
      ...current,
      [studentId]: {
        ...current[studentId],
        [field]: value,
      },
    }));
  };

  const handleCategoryBlur = async (student, category) => {
    const rowState = rowInputs[student.id] || {};
    const nextValue = Number(
      rowState[category.id] ?? categoryScoreMap[student.id]?.[category.id] ?? 0
    );
    const currentValue = Number(categoryScoreMap[student.id]?.[category.id] || 0);
    const delta = nextValue - currentValue;

    if (delta === 0) {
      return;
    }

    setBusyCellKey(`${student.id}-${category.id}`);

    try {
      await createBulkScoreAdjustments({
        student,
        adjustments: [{ category, points: delta }],
        reason: rowState.comment || "",
        teacher: {
          ...user,
          displayName: profile?.displayName || user?.displayName,
        },
      });
      showToast(`${category.name} updated for ${student.name}.`);
    } catch (nextError) {
      updateRowInput(student.id, category.id, String(currentValue));
      showToast(nextError.message, "error");
    } finally {
      setBusyCellKey("");
    }
  };

  if (loading) {
    return <LoadingState message="Loading score entry..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="page-grid">
      <SectionCard title="Score Entry">
        <p className="muted-copy">
          Students are sorted by numeric student ID. Each category box shows the
          current score for that category. Edit a number and click outside the box
          to save automatically. Comment is optional.
        </p>

        <div className="filters-row">
          <label className="filter-field">
            <span>Search by ID or name</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search students"
            />
          </label>
          <label className="filter-field">
            <span>Batch / Group</span>
            <select
              value={batchFilter}
              onChange={(event) => setBatchFilter(event.target.value)}
            >
              <option value="all">All batches</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="score-entry-table-wrapper">
          <table className="score-entry-table">
            <colgroup>
              <col style={{ width: "72px" }} />
              <col style={{ width: "180px" }} />
              {categories.map((category) => (
                <col key={category.id} style={{ width: "78px" }} />
              ))}
              <col style={{ width: "130px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                {categories.map((category) => (
                  <th key={category.id}>{category.name}</th>
                ))}
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map((student) => {
                const rowState = rowInputs[student.id] || {};

                return (
                  <tr key={student.id}>
                    <td className="score-entry-table__sticky">{student.studentId}</td>
                    <td className="score-entry-table__sticky-second">
                      <div className="score-entry-student">
                        <strong>{student.name}</strong>
                      </div>
                    </td>
                    {categories.map((category) => (
                      <td key={category.id}>
                        <input
                          className="score-cell-input"
                          type="number"
                          value={getDisplayedValue(student.id, category.id)}
                          onChange={(event) =>
                            updateRowInput(student.id, category.id, event.target.value)
                          }
                          onBlur={() => handleCategoryBlur(student, category)}
                          placeholder="0"
                          disabled={busyCellKey === `${student.id}-${category.id}`}
                        />
                      </td>
                    ))}
                    <td>
                      <input
                        className="score-comment-input"
                        value={rowState.comment || ""}
                        onChange={(event) =>
                          updateRowInput(student.id, "comment", event.target.value)
                        }
                        placeholder="Optional comment"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

export default ScoreEntryPage;
