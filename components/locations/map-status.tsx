export function MapStatus({ loading, error, onRetry }: { loading: boolean; error: string; onRetry: () => void }) {
  if (error) {
    return (
      <div className="map-status map-status--error" role="alert">
        <p>{error}</p>
        <button className="button button--secondary" type="button" onClick={onRetry}>Yritä uudelleen</button>
      </div>
    );
  }

  if (loading) return <div className="map-status" role="status">Sydäniskureita ladataan…</div>;
  return null;
}
