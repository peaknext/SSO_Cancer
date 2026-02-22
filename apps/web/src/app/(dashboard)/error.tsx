'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full text-center">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-destructive-subtle mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="font-heading text-lg font-semibold text-foreground mb-1">
          เกิดข้อผิดพลาดในหน้านี้
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          An error occurred on this page. Please try again.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={reset} size="sm">
            <RotateCcw className="h-4 w-4 mr-1.5" />
            ลองอีกครั้ง
          </Button>
          <Button variant="outline" size="sm" onClick={() => (window.location.href = '/')}>
            <Home className="h-4 w-4 mr-1.5" />
            หน้าหลัก
          </Button>
        </div>
      </div>
    </div>
  );
}
