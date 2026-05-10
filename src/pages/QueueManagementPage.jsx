import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  callNextStudent,
  clearOldResolvedEntries,
  resolveQueueEntry,
  subscribeToQueue,
} from "../services/queueService";

function QueueManagementPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToQueue(
      (rows) => {
        setQueue(rows);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsubscribe;
  }, []);

  const waitingQueue = useMemo(
    () => queue.filter((e) => e.status === "waiting"),
    [queue]
  );

  const inProgressEntry = useMemo(
    () => queue.find((e) => e.status === "in_progress") || null,
    [queue]
  );

  const resolvedToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return queue.filter((e) => {
      if (e.status !== "done" && e.status !== "skipped") return false;
      const resolved = e.resolvedAt?.toDate?.() || new Date(e.resolvedAt);
      return resolved >= today;
    });
  }, [queue]);

  const teacherName = profile?.displayName || profile?.email || "Teacher";

  const handleCallNext = async () => {
    if (!waitingQueue.length) return;
    setBusy(true);

    try {
      await callNextStudent(waitingQueue[0].id);
      showToast(`Called ${waitingQueue[0].studentName} to the front.`);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleClearOld = async () => {
    if (!window.confirm("Delete all resolved entries from previous days? This cannot be undone.")) return;
    setBusy(true);

    try {
      const count = await clearOldResolvedEntries();
      showToast(count > 0 ? `Cleared ${count} old entries.` : "No old entries to clear.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleResolve = async (entryId, resolution, studentName) => {
    setBusy(true);

    try {
      await resolveQueueEntry(entryId, resolution, teacherName);
      showToast(
        resolution === "done"
          ? `Marked ${studentName} as done.`
          : `Skipped ${studentName}.`
      );
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="screen-center">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="page-grid">
      <div className="page-heading">
        <div>
          <h2>Queue Management</h2>
          <p>
            {waitingQueue.length} waiting · {resolvedToday.length} resolved today
          </p>
        </div>
        <div className="topbar__actions">
          <button
            type="button"
            className="secondary-button"
            onClick={handleClearOld}
            disabled={busy}
          >
            Clear old entries
          </button>
          {!inProgressEntry && waitingQueue.length > 0 && (
            <button
              type="button"
              className="primary-button"
              onClick={handleCallNext}
              disabled={busy}
            >
              Call next student
            </button>
          )}
        </div>
      </div>

      {inProgressEntry && (
        <section className="queue-serving-card">
          <div className="queue-serving-card__badge">Now serving</div>
          <div className="queue-serving-card__info">
            <h3>{inProgressEntry.studentName}</h3>
            <p>
              {inProgressEntry.studentId} · {inProgressEntry.batchName}
            </p>
            {inProgressEntry.reason && (
              <p className="queue-serving-reason">"{inProgressEntry.reason}"</p>
            )}
          </div>
          <div className="queue-serving-card__actions">
            <Link
              to={`/score-entry`}
              className="secondary-button"
              style={{ textDecoration: "none", display: "inline-block" }}
            >
              Go to Score Entry
            </Link>
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                handleResolve(inProgressEntry.id, "done", inProgressEntry.studentName)
              }
              disabled={busy}
            >
              Mark done
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                handleResolve(inProgressEntry.id, "skipped", inProgressEntry.studentName)
              }
              disabled={busy}
            >
              Skip
            </button>
          </div>
        </section>
      )}

      <div className="two-column-layout">
        <section className="card">
          <div className="section-card__header">
            <h2>Waiting queue</h2>
            {!inProgressEntry && waitingQueue.length > 0 && (
              <button
                type="button"
                className="primary-button"
                onClick={handleCallNext}
                disabled={busy}
              >
                Call next
              </button>
            )}
          </div>

          {waitingQueue.length === 0 ? (
            <p className="muted-copy">No students waiting.</p>
          ) : (
            <ol className="queue-list queue-list--teacher">
              {waitingQueue.map((entry, index) => (
                <li key={entry.id} className="queue-list-item">
                  <span className="queue-list-item__pos">#{index + 1}</span>
                  <div className="queue-list-item__info">
                    <strong>{entry.studentName}</strong>
                    <span>{entry.studentId} · {entry.batchName}</span>
                    {entry.reason && (
                      <span className="queue-list-item__reason">{entry.reason}</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card">
          <div className="section-card__header">
            <h2>Resolved today</h2>
          </div>

          {resolvedToday.length === 0 ? (
            <p className="muted-copy">Nothing resolved yet today.</p>
          ) : (
            <ul className="queue-list queue-list--teacher">
              {resolvedToday.map((entry) => (
                <li key={entry.id} className="queue-list-item">
                  <span
                    className={
                      entry.status === "done" ? "pill pill--success" : "pill pill--muted"
                    }
                  >
                    {entry.status === "done" ? "Done" : "Skipped"}
                  </span>
                  <div className="queue-list-item__info">
                    <strong>{entry.studentName}</strong>
                    <span>{entry.studentId} · {entry.batchName}</span>
                    {entry.reason && (
                      <span className="queue-list-item__reason">{entry.reason}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default QueueManagementPage;
