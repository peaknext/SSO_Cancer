import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-warning-subtle mb-6">
          <FileQuestion className="h-7 w-7 text-warning" />
        </div>
        <h1 className="font-heading text-6xl font-bold text-primary mb-2">404</h1>
        <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
          ไม่พบหน้าที่ต้องการ
        </h2>
        <p className="text-sm text-muted-foreground mb-8">
          The page you are looking for does not exist.
        </p>
        <Button asChild>
          <Link href="/">กลับหน้าหลัก</Link>
        </Button>
      </div>
    </div>
  );
}
