function escapeCsvValue(value) {
  const stringValue = String(value ?? "");

  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

export function exportRowsToCsv(filename, rows, columns) {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((column) => escapeCsvValue(row[column.key])).join(",")
  );
  const csvContent = [header, ...lines].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsvText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("The CSV file must include a header row and at least one student row.");
  }

  const headers = lines[0].split(",").map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    return headers.reduce((result, header, index) => {
      result[header] = cells[index] || "";
      return result;
    }, {});
  });
}

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getFieldValue(row, aliases) {
  const normalizedAliases = aliases.map(normalizeHeader);
  const entry = Object.entries(row).find(([key]) =>
    normalizedAliases.includes(normalizeHeader(key))
  );

  return entry ? entry[1] : "";
}

export async function parseStudentCsvFile(file, batches) {
  const text = await file.text();
  const rows = parseCsvText(text);
  const batchByCode = new Map(
    batches.map((batch) => [String(batch.code || "").toLowerCase(), batch])
  );
  const batchByName = new Map(
    batches.map((batch) => [String(batch.name || "").toLowerCase(), batch])
  );

  return rows.map((row, index) => {
    const name = getFieldValue(row, ["name", "fullname", "studentname"]);
    const studentId = getFieldValue(row, ["studentId", "studentid", "student_id", "id"]);
    const age = getFieldValue(row, ["age"]);
    const school = getFieldValue(row, ["school"]);
    const batchCode = getFieldValue(row, ["batchCode", "batchcode", "batch_code"]);
    const batchName = getFieldValue(row, ["batch", "batchname", "group"]);
    const status = getFieldValue(row, ["status"]);
    const notes = getFieldValue(row, ["notes", "note", "remarks", "comment"]);
    const batch =
      batchByCode.get(String(batchCode || "").toLowerCase()) ||
      batchByName.get(String(batchName || "").toLowerCase()) ||
      (batches.length === 1 && !batchCode && !batchName ? batches[0] : null);

    if (!name || !studentId) {
      throw new Error(`Row ${index + 2} is missing name or studentId.`);
    }

    if (!batch) {
      throw new Error(
        `Row ${index + 2} is missing a valid batch. Add batchCode/batch, or keep exactly one batch in the app so it can be used automatically.`
      );
    }

    return {
      name,
      studentId,
      age: age ? Number(age) : null,
      school: school || "",
      batch: batch.id,
      status: status || "active",
      notes: notes || "",
    };
  });
}
