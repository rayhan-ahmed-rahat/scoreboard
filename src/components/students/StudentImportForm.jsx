import { useState } from "react";
import { parseStudentCsvFile } from "../../utils/csv";

function StudentImportForm({ batches, onImport, onCancel, busy }) {
  const [fileName, setFileName] = useState("");
  const [rowsPreview, setRowsPreview] = useState([]);
  const [error, setError] = useState("");

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const parsedRows = await parseStudentCsvFile(file, batches);
      setRowsPreview(parsedRows);
      setFileName(file.name);
      setError("");
    } catch (nextError) {
      setRowsPreview([]);
      setFileName(file.name);
      setError(nextError.message);
    }
  };

  return (
    <div className="page-grid">
      <label>
        <span>Choose CSV file</span>
        <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
      </label>
      <p className="muted-copy">
        Expected headers: `name, studentId, age, school, batchCode, status, notes`
      </p>
      {fileName ? <p className="muted-copy">Selected file: {fileName}</p> : null}
      {error ? <p className="error-copy">{error}</p> : null}
      {rowsPreview.length ? (
        <div className="import-preview">
          <strong>{rowsPreview.length} students ready to import</strong>
          <ul className="preview-list">
            {rowsPreview.slice(0, 6).map((row) => (
              <li key={`${row.studentId}-${row.name}`}>
                {row.name} · {row.studentId}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() => onImport(rowsPreview)}
          disabled={busy || !rowsPreview.length}
        >
          {busy ? "Importing..." : "Import students"}
        </button>
      </div>
    </div>
  );
}

export default StudentImportForm;
