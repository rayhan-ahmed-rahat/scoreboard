import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { subscribeToCluster } from "../services/clusterService";
import { joinQueue, leaveQueue, subscribeToQueue } from "../services/queueService";

function StudentQueuePage() {
  const { studentSession } = useAuth();
  const { showToast } = useToast();
  const [queue, setQueue] = useState([]);
  const [myCluster, setMyCluster] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Subscribe to live cluster data so teacher name is always fresh
  useEffect(() => {
    if (!studentSession?.clusterId) return;

    const unsubscribe = subscribeToCluster(
      studentSession.clusterId,
      (cluster) => setMyCluster(cluster),
      () => {}
    );

    return unsubscribe;
  }, [studentSession?.clusterId]);

  // All active entries in the queue
  const fullActiveQueue = useMemo(
    () => queue.filter((entry) => entry.status === "waiting" || entry.status === "in_progress"),
    [queue]
  );

  // Scoped to this student's cluster (if they have one), otherwise show all
  const activeQueue = useMemo(() => {
    if (!studentSession?.clusterId) return fullActiveQueue;
    return fullActiveQueue.filter((entry) => entry.clusterId === studentSession.clusterId);
  }, [fullActiveQueue, studentSession?.clusterId]);

  const waitingQueue = useMemo(
    () => activeQueue.filter((e) => e.status === "waiting"),
    [activeQueue]
  );

  const waitingPositionMap = useMemo(
    () => new Map(waitingQueue.map((e, i) => [e.id, i + 1])),
    [waitingQueue]
  );

  const myEntry = useMemo(
    () => activeQueue.find((entry) => entry.studentRef === studentSession?.id) || null,
    [activeQueue, studentSession]
  );

  const myPosition = useMemo(() => {
    if (!myEntry || myEntry.status === "in_progress") return null;
    return waitingPositionMap.get(myEntry.id) || null;
  }, [myEntry, waitingPositionMap]);

  // Live teacher name from the cluster doc (falls back to stored name on the queue entry)
  const assignedTeacherName = myCluster?.assignedTeacherName || myEntry?.assignedTeacherName || "";

  const handleJoin = async (event) => {
    event.preventDefault();
    setBusy(true);

    try {
      await joinQueue({
        studentRef: studentSession.id,
        studentId: studentSession.studentId,
        studentName: studentSession.name,
        batch: studentSession.batch,
        batchName: studentSession.batchName,
        clusterId: studentSession.clusterId || "",
        clusterName: studentSession.clusterName || "",
        reason,
      });
      setReason("");
      showToast("You joined the queue.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!myEntry) return;
    setBusy(true);

    try {
      await leaveQueue(myEntry.id);
      showToast("You left the queue.");
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

  const waitingCount = waitingQueue.length;

  return (
    <div className="student-page-grid">
      <div className="student-queue-status">
        {myEntry?.status === "in_progress" ? (
          <div className="queue-status-card queue-status-card--active">
            <div className="queue-status-card__number">Now</div>
            <h2>The teacher is ready for you!</h2>
            <p>Please wait patiently, no need to raise your hands.</p>
          </div>
        ) : myEntry ? (
          <div className="queue-status-card queue-status-card--waiting">
            <div className="queue-status-card__number">#{myPosition}</div>
            <h2>You are in the queue</h2>
            <p>
              {myPosition === 1
                ? "You are next!"
                : `${myPosition - 1} ${myPosition - 1 === 1 ? "person" : "people"} ahead of you`}
            </p>
            {myEntry.reason && (
              <p className="queue-status-card__reason">Your note: {myEntry.reason}</p>
            )}
            {assignedTeacherName && (
              <p className="queue-status-card__reason">
                Assigned to: {assignedTeacherName}
              </p>
            )}
            <button
              type="button"
              className="secondary-button"
              onClick={handleLeave}
              disabled={busy}
            >
              Leave queue
            </button>
          </div>
        ) : (
          <div className="queue-status-card queue-status-card--idle">
            <div className="queue-status-card__number">
              {waitingCount > 0 ? `${waitingCount} waiting` : "Queue is empty"}
            </div>
            <h2>You are not in the queue</h2>
            <p>Join the queue to request an evaluation from the teacher.</p>
            <form onSubmit={handleJoin} className="queue-join-form">
              <label>
                <span>Reason (optional)</span>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. completed homework, project submission..."
                  maxLength={120}
                />
              </label>
              <button type="submit" className="primary-button" disabled={busy}>
                {busy ? "Joining..." : "Join the queue"}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="queue-list-section">
        <h3 className="queue-list-heading">
          Current queue
          {waitingCount > 0 && (
            <span className="queue-count-badge">{waitingCount} waiting</span>
          )}
        </h3>

        {activeQueue.length === 0 ? (
          <p className="muted-copy">No one is in the queue right now.</p>
        ) : (
          <ol className="queue-list">
            {activeQueue.map((entry) => {
              const isMe = entry.studentRef === studentSession?.id;
              const positionLabel =
                entry.status === "in_progress" ? "Now" : `#${waitingPositionMap.get(entry.id)}`;

              return (
                <li
                  key={entry.id}
                  className={[
                    "queue-list-item",
                    isMe && "queue-list-item--mine",
                    entry.status === "in_progress" && "queue-list-item--active",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="queue-list-item__pos">{positionLabel}</span>
                  <div className="queue-list-item__info">
                    <strong>
                      {isMe ? `${entry.studentName} (You)` : entry.studentName}
                    </strong>
                    <span>{entry.batchName} · {entry.studentId}</span>
                    {entry.reason && <span className="queue-list-item__reason">{entry.reason}</span>}
                  </div>
                  {entry.status === "in_progress" && (
                    <span className="pill pill--success">Being seen</span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

export default StudentQueuePage;
