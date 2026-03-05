export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 700, color: '#0F766E', margin: 0 }}>
          404
        </h1>
        <p style={{ fontSize: '1rem', color: '#71717a', marginTop: '0.5rem' }}>
          ไม่พบหน้าที่ต้องการ — Page not found
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            marginTop: '1.5rem',
            padding: '0.5rem 1.5rem',
            backgroundColor: '#0F766E',
            color: '#fff',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          กลับหน้าหลัก
        </a>
      </div>
    </div>
  );
}
