import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DataTable from "../components/common/DataTable";
import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import Modal from "../components/common/Modal";
import Pagination from "../components/common/Pagination";
import SectionCard from "../components/common/SectionCard";
import StudentImportForm from "../components/students/StudentImportForm";
import StudentForm from "../components/students/StudentForm";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  addStudent,
  addStudentsFromImport,
  deleteStudent,
  subscribeToBatches,
  subscribeToStudents,
  updateStudent,
} from "../services/studentService";
import { formatDate, formatPoints } from "../utils/formatters";

const PAGE_SIZE = 10;

function StudentsPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [studentModalState, setStudentModalState] = useState({ open: false, student: null });
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let loadedStreams = 0;
    const markLoaded = () => {
      loadedStreams += 1;
      if (loadedStreams >= 2) {
        setLoading(false);
      }
    };

    const handleError = (nextError) => {
      setError(nextError.message || "Failed to load student data.");
      setLoading(false);
    };

    const unsubscribeStudents = subscribeToStudents(
      (rows) => {
        setStudents(rows);
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

    return () => {
      unsubscribeStudents();
      unsubscribeBatches();
    };
  }, []);

  const batchNameMap = useMemo(
    () => new Map(batches.map((batch) => [batch.id, batch.name])),
    [batches]
  );

  const batchOptions = useMemo(() => ["all", ...batches.map((batch) => batch.id)], [batches]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBatch = batchFilter === "all" || student.batch === batchFilter;

      return matchesSearch && matchesBatch;
    });
  }, [students, searchTerm, batchFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, batchFilter]);

  const handleSaveStudent = async (payload) => {
    setBusy(true);

    try {
      if (studentModalState.student) {
        await updateStudent(studentModalState.student.id, payload);
        showToast("Student updated successfully.");
      } else {
        await addStudent(payload);
        showToast("Student added successfully.");
      }

      setStudentModalState({ open: false, student: null });
    } catch (nextError) {
      showToast(nextError.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteStudent = async (student) => {
    if (!isAdmin) {
      showToast("Only admins can delete students.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${student.name}? This action cannot be undone. Score history will stay preserved for auditing.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteStudent(student.id);
      showToast("Student deleted successfully.");
    } catch (nextError) {
      showToast(nextError.message, "error");
    }
  };

  const handleImportStudents = async (rows) => {
    setBusy(true);

    try {
      await addStudentsFromImport(rows);
      setImportModalOpen(false);
      showToast(`${rows.length} students imported successfully.`);
    } catch (nextError) {
      showToast(nextError.message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading students and batches..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="page-grid">
      <SectionCard
        title="Students"
        action={
          <div className="toolbar-actions">
            {isAdmin ? (
              <>
                <Link to="/score-entry" className="secondary-button">
                  Open score entry
                </Link>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setImportModalOpen(true)}
                >
                  Import CSV
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setStudentModalState({ open: true, student: null })}
                >
                  Add student
                </button>
              </>
            ) : (
              <Link to="/score-entry" className="secondary-button">
                Open score entry
              </Link>
            )}
          </div>
        }
      >
        <div className="filters-row">
          <label className="filter-field">
            <span>Search by name or ID</span>
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
              {batchOptions.map((batchId) => (
                <option key={batchId} value={batchId}>
                  {batchId === "all" ? "All batches" : batchNameMap.get(batchId)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <DataTable
          columns={[
            { key: "name", label: "Student" },
            { key: "studentId", label: "Student ID" },
            {
              key: "batch",
              label: "Batch",
              render: (value) => batchNameMap.get(value) || "Unknown batch",
            },
            {
              key: "totalScore",
              label: "Total score",
              render: (value) => formatPoints(value),
            },
            {
              key: "status",
              label: "Status",
              render: (value) => (
                <span className={value === "active" ? "pill pill--success" : "pill pill--muted"}>
                  {value}
                </span>
              ),
            },
            {
              key: "updatedAt",
              label: "Updated",
              render: (value) => formatDate(value),
            },
            {
              key: "actions",
              label: "Actions",
              render: (_, row) => (
                <div className="table-actions">
                  <Link to={`/students/${row.id}`} className="text-link">
                    View
                  </Link>
                  {isAdmin ? (
                    <>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setStudentModalState({ open: true, student: row })}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-button text-button--danger"
                        onClick={() => handleDeleteStudent(row)}
                      >
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              ),
            },
          ]}
          rows={paginatedStudents}
          emptyTitle="No students found"
          emptyDescription="Add or import students to start tracking progress."
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </SectionCard>

      {studentModalState.open ? (
        <Modal
          title={studentModalState.student ? "Edit student" : "Add student"}
          onClose={() => setStudentModalState({ open: false, student: null })}
        >
          <StudentForm
            initialValues={studentModalState.student}
            batches={batches}
            onSubmit={handleSaveStudent}
            onCancel={() => setStudentModalState({ open: false, student: null })}
            busy={busy}
          />
        </Modal>
      ) : null}

      {importModalOpen ? (
        <Modal title="Import students from CSV" onClose={() => setImportModalOpen(false)}>
          <StudentImportForm
            batches={batches}
            onImport={handleImportStudents}
            onCancel={() => setImportModalOpen(false)}
            busy={busy}
          />
        </Modal>
      ) : null}
    </div>
  );
}

export default StudentsPage;
