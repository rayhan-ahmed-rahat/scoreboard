import { useEffect, useState } from "react";

function CategoryForm({ initialValues, onSubmit, onCancel, busy }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setName(initialValues?.name || "");
    setDescription(initialValues?.description || "");
  }, [initialValues]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      name: name.trim(),
      description: description.trim(),
    });
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label>
        <span>Category name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
      <label className="form-grid__full">
        <span>Description</span>
        <textarea
          rows="4"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional note to explain how this category is used."
        />
      </label>
      <div className="form-actions form-grid__full">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? "Saving..." : "Save category"}
        </button>
      </div>
    </form>
  );
}

export default CategoryForm;
