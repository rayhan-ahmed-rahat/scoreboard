import { useEffect, useState } from "react";
import { updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import DataTable from "../components/common/DataTable";
import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import Modal from "../components/common/Modal";
import RoleBadge from "../components/common/RoleBadge";
import SectionCard from "../components/common/SectionCard";
import BatchForm from "../components/scores/BatchForm";
import CategoryForm from "../components/scores/CategoryForm";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { COLLECTIONS, ROLES } from "../firebase/collections";
import { auth, db } from "../firebase/config";
import {
  addBatch,
  addCategory,
  deleteBatch,
  deleteCategory,
  rebuildPublicLeaderboard,
  subscribeToBatches,
  subscribeToCategories,
  updateBatch,
  updateCategory,
} from "../services/studentService";
import { seedDemoData } from "../services/seedService";
import { subscribeToUsers, updateUserRole } from "../services/userService";

function SettingsPage() {
  const { user, profile, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [batches, setBatches] = useState([]);
  const [users, setUsers] = useState([]);
  const [modalState, setModalState] = useState({ type: "", item: null });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState(profile?.displayName || user?.displayName || "");

  useEffect(() => {
    let loadedStreams = 0;
    const expectedStreams = isAdmin ? 3 : 2;
    const markLoaded = () => {
      loadedStreams += 1;
      if (loadedStreams >= expectedStreams) {
        setLoading(false);
      }
    };
    const handleError = (nextError) => {
      setError(nextError.message || "Failed to load settings.");
      setLoading(false);
    };

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
    const unsubscribeUsers = isAdmin
      ? subscribeToUsers(
          (rows) => {
            setUsers(rows);
            markLoaded();
          },
          handleError
        )
      : () => {};

    return () => {
      unsubscribeCategories();
      unsubscribeBatches();
      unsubscribeUsers();
    };
  }, [isAdmin]);

  useEffect(() => {
    setDisplayName(profile?.displayName || user?.displayName || "");
  }, [profile, user]);

  const handleAdminOnly = () => {
    showToast("Only admins can manage this section.", "error");
  };

  const handleSaveCategory = async (payload) => {
    if (!isAdmin) {
      handleAdminOnly();
      return;
    }

    setBusy(true);

    try {
      if (modalState.item) {
        await updateCategory(modalState.item.id, payload);
        showToast("Category updated successfully.");
      } else {
        await addCategory(payload);
        showToast("Category created successfully.");
      }
      setModalState({ type: "", item: null });
    } catch (nextError) {
      showToast(nextError.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveBatch = async (payload) => {
    if (!isAdmin) {
      handleAdminOnly();
      return;
    }

    setBusy(true);

    try {
      if (modalState.item) {
        await updateBatch(modalState.item.id, payload);
        showToast("Batch updated successfully.");
      } else {
        await addBatch(payload);
        showToast("Batch created successfully.");
      }
      setModalState({ type: "", item: null });
    } catch (nextError) {
      showToast(nextError.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!isAdmin) {
      handleAdminOnly();
      return;
    }

    const confirmed = window.confirm(`Delete ${category.name}?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteCategory(category.id);
      showToast("Category deleted successfully.");
    } catch (nextError) {
      showToast(nextError.message, "error");
    }
  };

  const handleDeleteBatch = async (batch) => {
    if (!isAdmin) {
      handleAdminOnly();
      return;
    }

    const confirmed = window.confirm(`Delete ${batch.name}?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteBatch(batch.id);
      showToast("Batch deleted successfully.");
    } catch (nextError) {
      showToast(nextError.message, "error");
    }
  };

  const handleRoleChange = async (targetUser, nextRole) => {
    if (!isAdmin) {
      handleAdminOnly();
      return;
    }

    try {
      await updateUserRole(targetUser.id, nextRole);
      showToast(`Role updated for ${targetUser.email}.`);
    } catch (nextError) {
      showToast(nextError.message, "error");
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();

    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      await setDoc(
        doc(db, COLLECTIONS.USERS, user.uid),
        {
          displayName: displayName.trim(),
          email: user.email,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      showToast("Teacher profile updated.");
    } catch (nextError) {
      showToast(nextError.message, "error");
    }
  };

  const handleSeedData = async () => {
    if (!isAdmin) {
      handleAdminOnly();
      return;
    }

    const confirmed = window.confirm(
      "Load sample demo data? This adds example batches, students, categories, and score logs."
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);

    try {
      await seedDemoData({ ...user, displayName: profile?.displayName || user?.displayName });
      showToast("Demo data loaded successfully.");
    } catch (nextError) {
      showToast(nextError.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRebuildPublicLeaderboard = async () => {
    if (!isAdmin) {
      handleAdminOnly();
      return;
    }

    setBusy(true);

    try {
      await rebuildPublicLeaderboard();
      showToast("Public leaderboard rebuilt successfully.");
    } catch (nextError) {
      showToast(nextError.message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading settings..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="page-grid">
      <div className="two-column-layout">
        <SectionCard title="Teacher profile">
          <form className="form-grid" onSubmit={handleProfileSave}>
            <label>
              <span>Display name</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Teacher name"
              />
            </label>
            <label>
              <span>Email</span>
              <input value={user?.email || ""} disabled />
            </label>
            <label>
              <span>Role</span>
              <div className="inline-field">
                <RoleBadge role={profile?.role} />
              </div>
            </label>
            <div className="form-actions form-grid__full">
              <button type="submit" className="primary-button">
                Save profile
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Demo data">
          <p className="muted-copy">
            Quickly load sample categories, batches, students, and score history to explore the app.
          </p>
          <div className="toolbar-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleSeedData}
              disabled={busy}
            >
              {busy ? "Working..." : "Load demo data"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleRebuildPublicLeaderboard}
              disabled={busy}
            >
              {busy ? "Working..." : "Rebuild public leaderboard"}
            </button>
          </div>
        </SectionCard>
      </div>

      <div className="two-column-layout">
        <SectionCard
          title="Score categories"
          action={
            <button
              type="button"
              className="primary-button"
              onClick={() => (isAdmin ? setModalState({ type: "category", item: null }) : handleAdminOnly())}
            >
              Add category
            </button>
          }
        >
          <DataTable
            columns={[
              { key: "name", label: "Category" },
              { key: "description", label: "Description" },
              {
                key: "actions",
                label: "Actions",
                render: (_, row) => (
                  <div className="table-actions">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        isAdmin ? setModalState({ type: "category", item: row }) : handleAdminOnly()
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-button text-button--danger"
                      onClick={() => handleDeleteCategory(row)}
                    >
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
            rows={categories}
            emptyTitle="No categories yet"
            emptyDescription="Create categories to organize how points are awarded."
          />
        </SectionCard>

        <SectionCard
          title="Batch management"
          action={
            <button
              type="button"
              className="primary-button"
              onClick={() => (isAdmin ? setModalState({ type: "batch", item: null }) : handleAdminOnly())}
            >
              Add batch
            </button>
          }
        >
          <DataTable
            columns={[
              { key: "name", label: "Batch" },
              { key: "code", label: "Code" },
              { key: "status", label: "Status" },
              { key: "description", label: "Description" },
              {
                key: "actions",
                label: "Actions",
                render: (_, row) => (
                  <div className="table-actions">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        isAdmin ? setModalState({ type: "batch", item: row }) : handleAdminOnly()
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-button text-button--danger"
                      onClick={() => handleDeleteBatch(row)}
                    >
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
            rows={batches}
            emptyTitle="No batches yet"
            emptyDescription="Create batches before assigning students to them."
          />
        </SectionCard>
      </div>

      {isAdmin ? (
        <SectionCard title="User roles">
          <DataTable
            columns={[
              { key: "email", label: "Email" },
              { key: "displayName", label: "Display name" },
              {
                key: "role",
                label: "Role",
                render: (value) => <RoleBadge role={value} />,
              },
              {
                key: "actions",
                label: "Actions",
                render: (_, row) => (
                  <div className="table-actions">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => handleRoleChange(row, ROLES.ADMIN)}
                    >
                      Make admin
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => handleRoleChange(row, ROLES.TEACHER)}
                    >
                      Make teacher
                    </button>
                  </div>
                ),
              },
            ]}
            rows={users}
            emptyTitle="No users yet"
            emptyDescription="Users appear here after their first login."
          />
        </SectionCard>
      ) : null}

      {modalState.type === "category" ? (
        <Modal
          title={modalState.item ? "Edit category" : "Add category"}
          onClose={() => setModalState({ type: "", item: null })}
        >
          <CategoryForm
            initialValues={modalState.item}
            onSubmit={handleSaveCategory}
            onCancel={() => setModalState({ type: "", item: null })}
            busy={busy}
          />
        </Modal>
      ) : null}

      {modalState.type === "batch" ? (
        <Modal
          title={modalState.item ? "Edit batch" : "Add batch"}
          onClose={() => setModalState({ type: "", item: null })}
        >
          <BatchForm
            initialValues={modalState.item}
            onSubmit={handleSaveBatch}
            onCancel={() => setModalState({ type: "", item: null })}
            busy={busy}
          />
        </Modal>
      ) : null}
    </div>
  );
}

export default SettingsPage;
