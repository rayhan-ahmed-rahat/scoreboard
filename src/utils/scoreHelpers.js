function normalizeLogDate(value) {
  return value?.toDate ? value.toDate() : new Date(value);
}

export function getTopScorers(students, count = 5) {
  return [...students]
    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
    .slice(0, count);
}

export function getCategoryBreakdown(categories, logs) {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    total: logs
      .filter((log) => log.categoryId === category.id)
      .reduce((sum, log) => sum + log.signedPoints, 0),
  }));
}

export function buildLeaderboardRows(students, logs, filters) {
  let rankedStudents = [...students];

  if (filters.batchFilter !== "all") {
    rankedStudents = rankedStudents.filter(
      (student) => student.batch === filters.batchFilter
    );
  }

  const hasDateFilter = Boolean(filters.fromDate || filters.toDate);

  if (hasDateFilter) {
    const totalsByStudent = new Map();

    logs.forEach((log) => {
      const date = normalizeLogDate(log.createdAt);
      const afterStart = !filters.fromDate || date >= new Date(filters.fromDate);
      const beforeEnd =
        !filters.toDate || date <= new Date(`${filters.toDate}T23:59:59`);

      if (afterStart && beforeEnd) {
        totalsByStudent.set(
          log.studentRef,
          (totalsByStudent.get(log.studentRef) || 0) + log.signedPoints
        );
      }
    });

    rankedStudents = rankedStudents.map((student) => ({
      ...student,
      totalScore: totalsByStudent.get(student.id) || 0,
    }));
  }

  return rankedStudents
    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
    .map((student, index) => ({
      id: student.id,
      rank: index + 1,
      name: student.name,
      studentId: student.studentId,
      batch: student.batch || "",
      totalScore: student.totalScore || 0,
    }));
}

export function getCategoryTotalsFromLogs(categories, logs) {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    total: logs
      .filter((log) => log.categoryId === category.id)
      .reduce((sum, log) => sum + log.signedPoints, 0),
  }));
}

export function getRecentDeductions(logs, count = 10) {
  return logs.filter((log) => log.type === "deduct").slice(0, count);
}

export function getRecentBonuses(logs, count = 10) {
  return logs
    .filter((log) => log.type === "add" && log.categoryName === "Bonus")
    .slice(0, count);
}
