import { useEffect, useState } from "react";

const initialFormState = {
  name: "",
  studentId: "",
  age: "",
  school: "",
  batch: "",
  status: "active",
  notes: "",
};

function StudentForm({ initialValues, batches, onSubmit, onCancel, busy }) {
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (initialValues) {
      setFormData({
        name: initialValues.name || "",
        studentId: initialValues.studentId || "",
        age: initialValues.age || "",
        school: initialValues.school || "",
        batch: initialValues.batch || "",
        status: initialValues.status || "active",
        notes: initialValues.notes || "",
      });
      return;
    }

    setFormData(initialFormState);
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit({
      ...formData,
      age: formData.age ? Number(formData.age) : null,
      name: formData.name.trim(),
      studentId: formData.studentId.trim(),
      school: formData.school.trim(),
      batch: formData.batch.trim(),
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
