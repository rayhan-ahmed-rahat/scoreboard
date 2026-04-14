function RoleBadge({ role }) {
  const normalizedRole = role || "teacher";
  const className =
    normalizedRole === "admin" ? "pill pill--warning" : "pill pill--secondary";

  return <span className={className}>{normalizedRole}</span>;
}

export default RoleBadge;
