import { useEffect, useState } from "react";

function ClusterForm({ initialValues, batches, users, onSubmit, onCancel, busy }) {
  const [formData, setFormData] = useState({
    name: "",
    batchId: "",
    assignedTeacherUid: "",
    assignedTeacherName: "",
  });

  useEffect(() => {
    setFormData({
      name: initialValues?.name || "",
      batchId: initialValues?.batchId || "",
      assignedTeacherUid: initialValues?.assignedTeacherUid || "",
      assignedTeacherName: initialValues?.assignedTeacherName || "",
    });
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "assignedTeacherUid") {
      const selectedUser = users.find((u) => u.id === value);
      setFormData((current) => ({
        ...current,
        assignedTeacherUid: value,
        assignedTeacherName: selectedUser?.displayName || selectedUser?.email || "",
      }));
      return;
    }

    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const selectedBatch = batches.find((b) => b.id === formData.batchId);

    onSubmit({
      name: formData.name.trim(),
      batchId: formData.batchId,
      batchName: selectedBatch?.name || "",
      assignedTeacherUid: formData.assignedTeacherUid || "",
      assignedTeacherName: formData.assignedTeacherName || "",
    });
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label>
        <span>Cluster name</span>
        <input name="name" value={formData.name} onChange={handleChange} required />
      </label>
      <label>
        <span>Batch / Group</span>
        <select name="batchId" value={formData.batchId} onChange={handleChange} required>
          <option value="">Select a batch</option>
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.name}
            </option>
          ))}
        </select>
      </label>
      <label className="form-grid__full">
        <span>Assigned teacher</span>
        <select
          name="assignedTeacherUid"
          value={formData.assignedTeacherUid}
          onChange={handleChange}
        >
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.displayName || u.email}
            </option>
          ))}
        </select>
      </label>
      <div className="form-actions form-grid__full">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? "Saving..." : "Save cluster"}
        </button>
      </div>
    </form>
  );
}

export default ClusterForm;
