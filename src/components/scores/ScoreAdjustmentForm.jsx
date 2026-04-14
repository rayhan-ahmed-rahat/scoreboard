import { useEffect, useState } from "react";

const initialState = {
  categoryId: "",
  points: "",
  type: "add",
  reason: "",
};

function ScoreAdjustmentForm({ categories, onSubmit, onCancel, busy }) {
  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    if (categories.length && !formData.categoryId) {
      setFormData((current) => ({ ...current, categoryId: categories[0].id }));
    }
  }, [categories, formData.categoryId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit({
      categoryId: formData.categoryId,
      points: Number(formData.points),
      type: formData.type,
      reason: formData.reason.trim(),
    });
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label>
        <span>Category</span>
        <select
          name="categoryId"
          value={formData.categoryId}
          onChange={handleChange}
          required
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Action</span>
        <select name="type" value={formData.type} onChange={handleChange}>
          <option value="add">Add points</option>
          <option value="deduct">Deduct points</option>
        </select>
      </label>
      <label>
        <span>Points</span>
        <input
          name="points"
          type="number"
          min="1"
          value={formData.points}
          onChange={handleChange}
          required
        />
      </label>
      <label className="form-grid__full">
        <span>Reason / note</span>
        <textarea
          name="reason"
          rows="4"
          value={formData.reason}
          onChange={handleChange}
          required
          placeholder="Reason is required for a safe audit trail."
        />
      </label>
      <div className="form-actions form-grid__full">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? "Saving..." : "Submit adjustment"}
        </button>
      </div>
    </form>
  );
}

export default ScoreAdjustmentForm;
