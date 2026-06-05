export default function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <div className="page-header">
        <h1>{title}</h1>
        <p>This section is coming soon.</p>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: 64 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Under Construction</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
          {title} page will be implemented here.
        </div>
      </div>
    </div>
  );
}
