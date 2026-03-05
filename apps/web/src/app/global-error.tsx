'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="th">
      <body>
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
              Error
            </h1>
            <p style={{ fontSize: '1rem', color: '#71717a', marginTop: '0.5rem' }}>
              เกิดข้อผิดพลาด — Something went wrong
            </p>
            <button
              onClick={reset}
              style={{
                display: 'inline-block',
                marginTop: '1.5rem',
                padding: '0.5rem 1.5rem',
                backgroundColor: '#0F766E',
                color: '#fff',
                borderRadius: '0.5rem',
                border: 'none',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              ลองอีกครั้ง
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
