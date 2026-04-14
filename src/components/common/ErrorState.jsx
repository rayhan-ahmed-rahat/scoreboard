function ErrorState({ message, onRetry }) {
  return (
    <div className="state-panel state-panel--error">
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="secondary-button" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export default ErrorState;
