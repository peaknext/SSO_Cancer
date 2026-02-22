'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Microscope, FileText, Layers } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { CodeBadge } from '@/components/shared/code-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { CardSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';

interface Stage {
  id: number;
  stageCode: string;
  nameThai: string;
  nameEnglish: string;
  stageGroup: string;
}

interface Protocol {
  id: number;
  protocolCode: string;
  nameThai: string;
  nameEnglish: string;
  protocolType: string;
  treatmentIntent: string;
  isActive: boolean;
  _count?: { protocolRegimens: number; protocolStages: number };
}

interface CancerSiteDetail {
  id: number;
  siteCode: string;
  nameThai: string;
  nameEnglish: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  siteStages: { stage: Stage }[];
  _count: { protocols: number };
}

const typeLabels: Record<string, string> = {
  chemotherapy: 'เคมีบำบัด',
  targeted: 'ยามุ่งเป้า',
  chemo_immuno: 'เคมี+ภูมิคุ้มกัน',
  chemoradiation: 'เคมี+รังสี',
  hormonal: 'ฮอร์โมน',
};

const intentLabels: Record<string, string> = {
  curative: 'รักษาหาย',
  palliative: 'ประคับประคอง',
  adjuvant: 'เสริมหลังผ่าตัด',
  neoadjuvant: 'ก่อนการผ่าตัด',
};

export default function CancerSiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: site, isLoading: siteLoading } = useApi<CancerSiteDetail>(`/cancer-sites/${id}`);
  const { data: protocols, isLoading: protocolsLoading } = useApi<Protocol[]>(`/cancer-sites/${id}/protocols`);

  if (siteLoading) return <CardSkeleton />;

  if (!site) {
    return (
      <EmptyState
        title="ไม่พบตำแหน่งมะเร็ง"
        description="Cancer site not found"
      />
    );
  }

  const stages = site.siteStages?.map((ss) => ss.stage) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/cancer-sites">
          <Button variant="ghost" size="icon" className="mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <CodeBadge code={site.siteCode} />
            <h1 className="font-heading text-xl font-bold text-foreground">
              {site.nameThai}
            </h1>
            <StatusBadge active={site.isActive} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {site.nameEnglish}
          </p>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl border bg-card p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">รหัส</p>
            <p className="text-sm font-medium font-mono mt-1">{site.siteCode}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">ลำดับ</p>
            <p className="text-sm font-medium mt-1">{site.sortOrder}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">โปรโตคอล</p>
            <p className="text-sm font-medium mt-1">{site._count?.protocols ?? 0} รายการ</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">ระยะโรค</p>
            <p className="text-sm font-medium mt-1">{stages.length} ระยะ</p>
          </div>
        </div>
      </div>

      {/* Stages */}
      <div>
        <h2 className="font-heading text-base font-semibold flex items-center gap-2 mb-3">
          <Layers className="h-4 w-4 text-primary" />
          ระยะโรคที่เกี่ยวข้อง
        </h2>
        {stages.length === 0 ? (
          <p className="text-sm text-muted-foreground">ไม่มีระยะโรคที่กำหนด</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stages.map((stage) => (
              <span
                key={stage.id}
                className="inline-flex items-center rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-3 py-1 text-sm"
              >
                <span className="font-mono text-xs text-muted-foreground mr-1.5">{stage.stageCode}</span>
                {stage.nameThai}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Protocols */}
      <div>
        <h2 className="font-heading text-base font-semibold flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-primary" />
          โปรโตคอลในตำแหน่งนี้
        </h2>
        {protocolsLoading ? (
          <CardSkeleton />
        ) : !protocols || protocols.length === 0 ? (
          <p className="text-sm text-muted-foreground">ไม่มีโปรโตคอล</p>
        ) : (
          <div className="space-y-2">
            {protocols.map((protocol) => (
              <Link
                key={protocol.id}
                href={`/protocols/${protocol.id}`}
                className="block rounded-xl border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <CodeBadge code={protocol.protocolCode} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {protocol.nameThai}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {protocol.nameEnglish}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {protocol.protocolType && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {typeLabels[protocol.protocolType] || protocol.protocolType}
                      </span>
                    )}
                    {protocol.treatmentIntent && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {intentLabels[protocol.treatmentIntent] || protocol.treatmentIntent}
                      </span>
                    )}
                    <StatusBadge active={protocol.isActive} />
                  </div>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  <span>{protocol._count?.protocolRegimens ?? 0} สูตรยา</span>
                  <span>{protocol._count?.protocolStages ?? 0} ระยะ</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
