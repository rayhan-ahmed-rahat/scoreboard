export function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = value?.toDate ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = value?.toDate ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatPoints(value) {
  const numericValue = Number(value || 0);
  return `${numericValue > 0 ? "+" : ""}${numericValue}`;
}

export function buildTeacherProfile(user) {
  const email = user?.email || "unknown@teacher.com";
  const fallbackName = email.split("@")[0].replace(/[._-]/g, " ");

  return {
    name: user?.displayName || titleCase(fallbackName),
    email,
  };
}

export function titleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getLastSevenDaysLabel() {
  return "Live dashboard overview";
}
