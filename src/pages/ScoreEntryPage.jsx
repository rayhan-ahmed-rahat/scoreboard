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
import { formatPoints } from "../utils/formatters";

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
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [busyCategoryId, setBusyCategoryId] = useState("");
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

  useEffect(() => {
    if (!visibleStudents.length) {
      setSelectedStudentId("");
      return;
    }

    if (
      selectedStudentId &&
      visibleStudents.some((student) => student.id === selectedStudentId)
    ) {
      return;
    }

    setSelectedStudentId("");
  }, [selectedStudentId, visibleStudents]);

  const selectedStudent = useMemo(
    () => visibleStudents.find((student) => student.id === selectedStudentId) || null,
    [selectedStudentId, visibleStudents]
  );

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

  const commitCategoryChange = async (student, category, nextValue) => {
    const currentValue = Number(categoryScoreMap[student.id]?.[category.id] || 0);
    const parsedValue = Number(nextValue);

    if (!Number.isFinite(parsedValue)) {
      updateRowInput(student.id, category.id, String(currentValue));
      showToast("Enter a valid number.", "error");
      return;
    }

    const delta = parsedValue - currentValue;

    updateRowInput(student.id, category.id, String(parsedValue));

    if (delta === 0) {
      return;
    }

    setBusyCategoryId(category.id);

    try {
      await createBulkScoreAdjustments({
        student,
        adjustments: [{ category, points: delta }],
        reason: rowInputs[student.id]?.comment || "",
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
      setBusyCategoryId("");
    }
  };

  const handleStepChange = async (student, category, step) => {
    const currentValue = Number(getDisplayedValue(student.id, category.id) || 0);
    await commitCategoryChange(student, category, currentValue + step);
  };

  const handleInputBlur = async (student, category) => {
    const nextValue = rowInputs[student.id]?.[category.id];

    if (nextValue === undefined) {
      return;
    }

    await commitCategoryChange(student, category, nextValue);
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
          Tap a student to open a vertical score editor. Students stay sorted by numeric
          ID so it is easier to move down the list on mobile.
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

        <div className="score-student-list">
          {visibleStudents.map((student) => {
            const isActive = student.id === selectedStudentId;
            const totalScore = Number(student.totalScore || 0);

            return (
              <button
                key={student.id}
                type="button"
                className={isActive ? "score-student-card score-student-card--active" : "score-student-card"}
                onClick={() => setSelectedStudentId(student.id)}
              >
                <div className="score-student-card__id">ID {student.studentId}</div>
                <div className="score-student-card__main">
                  <strong>{student.name}</strong>
                  <span>{student.batchName || student.batch || "No batch"}</span>
                </div>
                <div className="score-student-card__score">{formatPoints(totalScore)}</div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {selectedStudent ? (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedStudentId("")}
          role="presentation"
        >
          <div
            className="modal score-entry-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="score-entry-modal-title"
          >
            <div className="modal__header score-entry-modal__header">
              <div>
                <h2 id="score-entry-modal-title">{selectedStudent.name}</h2>
                <p className="muted-copy">
                  ID {selectedStudent.studentId} · Total {formatPoints(selectedStudent.totalScore || 0)}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedStudentId("")}
                aria-label="Close score entry"
              >
                ×
              </button>
            </div>

            <div className="modal__content score-entry-modal__content">
              <label className="filter-field score-entry-comment-field">
                <span>Comment</span>
                <input
                  value={rowInputs[selectedStudent.id]?.comment || ""}
                  onChange={(event) =>
                    updateRowInput(selectedStudent.id, "comment", event.target.value)
                  }
                  placeholder="Optional comment for the next change"
                />
              </label>

              <div className="score-entry-category-list">
                {categories.map((category) => {
                  const inputValue = getDisplayedValue(selectedStudent.id, category.id);
                  const isBusy = busyCategoryId === category.id;

                  return (
                    <div key={category.id} className="score-entry-category-row">
                      <div className="score-entry-category-row__label">
                        <strong>{category.name}</strong>
                      </div>

                      <div className="score-entry-category-row__controls">
                        <input
                          className="score-entry-category-row__input"
                          type="number"
                          value={inputValue}
                          onChange={(event) =>
                            updateRowInput(selectedStudent.id, category.id, event.target.value)
                          }
                          onBlur={() => handleInputBlur(selectedStudent, category)}
                          disabled={isBusy}
                        />
                        <div className="score-entry-category-row__buttons">
                          <button
                            type="button"
                            className="secondary-button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleStepChange(selectedStudent, category, -1)}
                            disabled={isBusy}
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            className="primary-button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleStepChange(selectedStudent, category, 1)}
                            disabled={isBusy}
                          >
                            +1
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ScoreEntryPage;
