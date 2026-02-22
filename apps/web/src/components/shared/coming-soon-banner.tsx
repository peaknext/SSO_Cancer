import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ComingSoonBannerProps {
  title: string;
  titleEn?: string;
}

export function ComingSoonBanner({ title, titleEn }: ComingSoonBannerProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center text-center py-12 px-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning-subtle mb-6">
            <Construction className="h-7 w-7 text-warning" />
          </div>
          <h2 className="font-heading text-xl font-bold text-foreground mb-2">
            {title}
          </h2>
          {titleEn && (
            <p className="text-sm text-muted-foreground mb-4">{titleEn}</p>
          )}
          <div className="inline-flex items-center gap-2 rounded-full bg-warning-subtle px-4 py-2 text-sm text-warning">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
            </span>
            อยู่ระหว่างการพัฒนา — Under Development
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
