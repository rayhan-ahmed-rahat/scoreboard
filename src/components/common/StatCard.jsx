function StatCard({ label, value, hint, accent = "primary" }) {
  return (
    <div className={`stat-card stat-card--${accent}`}>
      <p className="stat-card__label">{label}</p>
      <strong className="stat-card__value">{value}</strong>
      {hint ? <span className="stat-card__hint">{hint}</span> : null}
    </div>
  );
}

export default StatCard;
