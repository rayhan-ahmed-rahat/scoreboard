import { useEffect, useState } from "react";

function BatchForm({ initialValues, onSubmit, onCancel, busy }) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    status: "active",
  });

  useEffect(() => {
    setFormData({
      name: initialValues?.name || "",
      code: initialValues?.code || "",
      description: initialValues?.description || "",
      status: initialValues?.status || "active",
    });
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      name: formData.name.trim(),
      code: formData.code.trim(),
      description: formData.description.trim(),
      status: formData.status,
    });
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label>
        <span>Batch name</span>
        <input name="name" value={formData.name} onChange={handleChange} required />
      </label>
      <label>
        <span>Batch code</span>
        <input name="code" value={formData.code} onChange={handleChange} required />
      </label>
      <label className="form-grid__full">
        <span>Description</span>
        <textarea
          name="description"
          rows="3"
          value={formData.description}
          onChange={handleChange}
        />
      </label>
      <label>
        <span>Status</span>
        <select name="status" value={formData.status} onChange={handleChange}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
      <div className="form-actions form-grid__full">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? "Saving..." : "Save batch"}
        </button>
      </div>
    </form>
  );
}

export default BatchForm;
