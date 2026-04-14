function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h3>{title}</h3>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal__content">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
