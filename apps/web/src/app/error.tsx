'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-destructive-subtle mb-6">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
          เกิดข้อผิดพลาด
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Something went wrong. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-muted-foreground mb-4">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-1.5" />
            ลองอีกครั้ง
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            กลับหน้าหลัก
          </Button>
        </div>
      </div>
    </div>
  );
}
