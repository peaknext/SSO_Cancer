import type { NextPageContext } from 'next';

function ErrorPage({ statusCode }: { statusCode?: number }) {
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
          {statusCode || 'Error'}
        </h1>
        <p style={{ fontSize: '1rem', color: '#71717a', marginTop: '0.5rem' }}>
          {statusCode === 404
            ? 'ไม่พบหน้าที่ต้องการ — Page not found'
            : 'เกิดข้อผิดพลาด — Something went wrong'}
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

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default ErrorPage;
