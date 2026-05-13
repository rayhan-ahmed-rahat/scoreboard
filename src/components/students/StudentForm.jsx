import { useEffect, useMemo, useState } from "react";

const initialFormState = {
  name: "",
  studentId: "",
  age: "",
  school: "",
  batch: "",
  clusterId: "",
  status: "active",
  notes: "",
};

function StudentForm({ initialValues, batches, clusters, onSubmit, onCancel, busy }) {
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (initialValues) {
      setFormData({
        name: initialValues.name || "",
        studentId: initialValues.studentId || "",
        age: initialValues.age || "",
        school: initialValues.school || "",
        batch: initialValues.batch || "",
        clusterId: initialValues.clusterId || "",
        status: initialValues.status || "active",
        notes: initialValues.notes || "",
      });
      return;
    }

    setFormData(initialFormState);
  }, [initialValues]);

  const batchClusters = useMemo(
    () => (clusters || []).filter((c) => c.batchId === formData.batch),
    [clusters, formData.batch]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "batch") {
      setFormData((current) => ({ ...current, batch: value, clusterId: "" }));
      return;
    }

    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const selectedCluster = (clusters || []).find((c) => c.id === formData.clusterId);

    onSubmit({
      ...formData,
      age: formData.age ? Number(formData.age) : null,
      name: formData.name.trim(),
      studentId: formData.studentId.trim(),
      school: formData.school.trim(),
      batch: formData.batch.trim(),
      clusterId: formData.clusterId || "",
      clusterName: selectedCluster?.name || "",
      notes: formData.notes.trim(),
    });
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label>
        <span>Full name</span>
        <input name="name" value={formData.name} onChange={handleChange} required />
      </label>
      <label>
        <span>Student ID</span>
        <input name="studentId" value={formData.studentId} onChange={handleChange} required />
      </label>
      <label>
        <span>Age</span>
        <input
          name="age"
          type="number"
          min="1"
          value={formData.age}
          onChange={handleChange}
        />
      </label>
      <label>
        <span>School</span>
        <input name="school" value={formData.school} onChange={handleChange} />
      </label>
      <label>
        <span>Batch / Group</span>
        <select name="batch" value={formData.batch} onChange={handleChange} required>
          <option value="">Select a batch</option>
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Cluster</span>
        <select name="clusterId" value={formData.clusterId} onChange={handleChange}>
          <option value="">No cluster</option>
          {batchClusters.length === 0 && formData.batch ? (
            <option value="" disabled>No clusters in this batch</option>
          ) : null}
          {batchClusters.map((cluster) => (
            <option key={cluster.id} value={cluster.id}>
              {cluster.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Status</span>
        <select name="status" value={formData.status} onChange={handleChange}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
      <label className="form-grid__full">
        <span>Notes</span>
        <textarea name="notes" rows="4" value={formData.notes} onChange={handleChange} />
      </label>
      <div className="form-actions form-grid__full">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? "Saving..." : "Save student"}
        </button>
      </div>
    </form>
  );
}

export default StudentForm;
