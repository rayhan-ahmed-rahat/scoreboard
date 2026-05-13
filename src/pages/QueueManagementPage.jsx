import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  assignToMe,
  callNextStudent,
  clearOldResolvedEntries,
  resolveQueueEntry,
  returnStudentToWaiting,
  subscribeToQueue,
} from "../services/queueService";
import { subscribeToUsers } from "../services/userService";

function QueueManagementPage() {
  const { profile, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [queue, setQueue] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let loadedStreams = 0;
    const markLoaded = () => {
      loadedStreams += 1;
      if (loadedStreams >= 2) setLoading(false);
    };

    const unsubscribeQueue = subscribeToQueue(
      (rows) => { setQueue(rows); markLoaded(); },
      () => markLoaded()
    );
    const unsubscribeUsers = subscribeToUsers(
      (rows) => { setUsers(rows); markLoaded(); },
      () => markLoaded()
    );

    return () => {
      unsubscribeQueue();
      unsubscribeUsers();
    };
  }, []);

  const teacherName = profile?.displayName || profile?.email || "Teacher";

  // My queue (entries assigned to this teacher, still waiting)
  const myWaiting = useMemo(
    () => queue.filter((e) => e.status === "waiting" && e.assignedTeacherUid === profile?.uid),
    [queue, profile?.uid]
  );

  // The entry currently being served by this teacher
  const myInProgress = useMemo(
    () => queue.find((e) => e.status === "in_progress" && e.assignedTeacherUid === profile?.uid) || null,
    [queue, profile?.uid]
  );

  // Unassigned waiting entries
  const unassigned = useMemo(
    () => queue.filter((e) => e.status === "waiting" && !e.assignedTeacherUid),
    [queue]
  );

  // Entries resolved today by this teacher
  const myResolvedToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return queue.filter((e) => {
      if (e.status !== "done" && e.status !== "skipped") return false;
      if (e.assignedTeacherUid !== profile?.uid) return false;
      const resolved = e.resolvedAt?.toDate?.() || new Date(e.resolvedAt);
      return resolved >= today;
    });
  }, [queue, profile?.uid]);

  // Auto-advance: when no in_progress entry, pull the next waiting entry
  useEffect(() => {
    if (loading) return;
    if (myInProgress) return;
    if (myWaiting.length === 0) return;

    callNextStudent(myWaiting[0].id).catch(() => {});
  }, [loading, myInProgress?.id, myWaiting.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleCallFromMiddle = async (entry) => {
    setBusy(true);

    try {
      if (myInProgress) {
        await returnStudentToWaiting(myInProgress.id);
      }
      await callNextStudent(entry.id);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleReturnToWaiting = async (entryId) => {
    setBusy(true);

    try {
      await returnStudentToWaiting(entryId);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleAssignToMe = async (entry) => {
    setBusy(true);

    try {
      await assignToMe(entry.id, profile.uid, teacherName);
      showToast(`${entry.studentName} assigned to you.`);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleAssignToTeacher = async (entry, teacherUid) => {
    const selectedUser = users.find((u) => u.id === teacherUid);
    const name = selectedUser?.displayName || selectedUser?.email || "";
    setBusy(true);

    try {
      await assignToMe(entry.id, teacherUid, name);
      showToast(`${entry.studentName} assigned to ${name || "teacher"}.`);
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
            {myWaiting.length} waiting · {myResolvedToday.length} resolved today
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
        </div>
      </div>

      {myInProgress && (
        <section className="queue-serving-card">
          <div className="queue-serving-card__badge">Now serving</div>
          <div className="queue-serving-card__info">
            <h3>{myInProgress.studentName}</h3>
            <p>
              {myInProgress.studentId} · {myInProgress.batchName}
              {myInProgress.clusterName ? ` · ${myInProgress.clusterName}` : ""}
            </p>
            {myInProgress.reason && (
              <p className="queue-serving-reason">"{myInProgress.reason}"</p>
            )}
          </div>
          <div className="queue-serving-card__actions">
            <Link
              to="/score-entry"
              className="secondary-button"
              style={{ textDecoration: "none", display: "inline-block" }}
            >
              Go to Score Entry
            </Link>
            <button
              type="button"
              className="primary-button"
              onClick={() => handleResolve(myInProgress.id, "done", myInProgress.studentName)}
              disabled={busy}
            >
              Mark done
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => handleResolve(myInProgress.id, "skipped", myInProgress.studentName)}
              disabled={busy}
            >
              Skip
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => handleReturnToWaiting(myInProgress.id)}
              disabled={busy}
            >
              Return to queue
            </button>
          </div>
        </section>
      )}

      <div className="two-column-layout">
        <section className="card">
          <div className="section-card__header">
            <h2>My queue</h2>
            <span className="muted-copy">{myWaiting.length} waiting</span>
          </div>

          {myWaiting.length === 0 ? (
            <p className="muted-copy">No students in your queue.</p>
          ) : (
            <ol className="queue-list queue-list--teacher">
              {myWaiting.map((entry, index) => (
                <li key={entry.id} className="queue-list-item">
                  <span className="queue-list-item__pos">#{index + 1}</span>
                  <div className="queue-list-item__info">
                    <strong>{entry.studentName}</strong>
                    <span>
                      {entry.studentId} · {entry.batchName}
                      {entry.clusterName ? ` · ${entry.clusterName}` : ""}
                    </span>
                    {entry.reason && (
                      <span className="queue-list-item__reason">{entry.reason}</span>
                    )}
                  </div>
                  <div className="table-actions">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => handleCallFromMiddle(entry)}
                      disabled={busy}
                    >
                      Serve now
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => handleResolve(entry.id, "done", entry.studentName)}
                      disabled={busy}
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      className="text-button text-button--danger"
                      onClick={() => handleResolve(entry.id, "skipped", entry.studentName)}
                      disabled={busy}
                    >
                      Skip
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card">
          <div className="section-card__header">
            <h2>Unassigned</h2>
            <span className="muted-copy">{unassigned.length} waiting</span>
          </div>

          {unassigned.length === 0 ? (
            <p className="muted-copy">No unassigned students.</p>
          ) : (
            <ol className="queue-list queue-list--teacher">
              {unassigned.map((entry, index) => (
                <li key={entry.id} className="queue-list-item">
                  <span className="queue-list-item__pos">#{index + 1}</span>
                  <div className="queue-list-item__info">
                    <strong>{entry.studentName}</strong>
                    <span>
                      {entry.studentId} · {entry.batchName}
                      {entry.clusterName ? ` · ${entry.clusterName}` : ""}
                    </span>
                    {entry.reason && (
                      <span className="queue-list-item__reason">{entry.reason}</span>
                    )}
                  </div>
                  <div className="table-actions">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => handleAssignToMe(entry)}
                      disabled={busy}
                    >
                      Assign to me
                    </button>
                    {isAdmin && (
                      <select
                        className="inline-select"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) handleAssignToTeacher(entry, e.target.value);
                          e.target.value = "";
                        }}
                        disabled={busy}
                      >
                        <option value="">Assign to…</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.displayName || u.email}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="card">
        <div className="section-card__header">
          <h2>Resolved today</h2>
        </div>

        {myResolvedToday.length === 0 ? (
          <p className="muted-copy">Nothing resolved yet today.</p>
        ) : (
          <ul className="queue-list queue-list--teacher">
            {myResolvedToday.map((entry) => (
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
                  <span>
                    {entry.studentId} · {entry.batchName}
                    {entry.clusterName ? ` · ${entry.clusterName}` : ""}
                  </span>
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
  );
}

export default QueueManagementPage;
