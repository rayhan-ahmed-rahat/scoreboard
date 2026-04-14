function LoadingState({ message = "Loading..." }) {
  return (
    <div className="state-panel">
      <div className="loader" />
      <p>{message}</p>
    </div>
  );
}

export default LoadingState;
