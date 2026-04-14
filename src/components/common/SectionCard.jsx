function SectionCard({ title, action, children, className = "" }) {
  return (
    <section className={`card ${className}`.trim()}>
      {(title || action) && (
        <div className="section-card__header">
          {title ? <h2>{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export default SectionCard;
