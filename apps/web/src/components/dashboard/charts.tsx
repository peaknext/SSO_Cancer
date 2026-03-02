'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';

/* ═══════════════════════════════════════════
   SHARED TOOLTIP COMPONENTS
   ═══════════════════════════════════════════ */

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-glass-border bg-card px-3 py-2.5 shadow-lg text-sm">
      <p className="font-medium text-foreground mb-1 max-w-[200px] leading-snug">{label}</p>
      <p className="tabular-nums font-semibold text-primary">
        {payload[0].value.toLocaleString('th-TH')}{' '}
        <span className="text-muted-foreground font-normal text-xs">visits</span>
      </p>
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-glass-border bg-card px-3 py-2.5 shadow-lg text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: entry.payload?.fill }}
        />
        <span className="font-medium text-foreground">{entry.name}</span>
      </div>
      <p className="tabular-nums font-semibold text-foreground ml-[18px]">
        {entry.value.toLocaleString('th-TH')}{' '}
        <span className="text-muted-foreground font-normal text-xs">visits</span>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CHART CARD WRAPPER
   ═══════════════════════════════════════════ */

interface ChartCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}

function ChartCard({ title, description, icon, children, headerExtra }: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8 text-primary shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold leading-tight">{title}</CardTitle>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          </div>
          {headerExtra}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-[300px] flex flex-col items-center justify-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/20">
        <BarChart3 className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <p className="text-sm text-muted-foreground text-center max-w-[240px]">{message}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   VISITS BY CANCER SITE (horizontal bar)
   ═══════════════════════════════════════════ */

interface BarChartData {
  name: string;
  value: number;
}

export function VisitsBySiteChart({ data }: { data: BarChartData[] }) {
  return (
    <ChartCard
      title="Top 10 ตำแหน่งมะเร็ง"
      description="จำนวน Visit แยกตามตำแหน่งมะเร็ง"
      icon={<BarChart3 className="h-4 w-4" />}
    >
      {data.length === 0 ? (
        <EmptyState message="ยังไม่มีข้อมูล Visit" />
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="siteBarGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0D9488" />
                  <stop offset="100%" stopColor="#2DD4BF" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="var(--border)"
                strokeOpacity={0.5}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={{ stroke: 'var(--border)', strokeOpacity: 0.5 }}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<BarTooltip />}
                cursor={{ fill: 'var(--primary)', opacity: 0.06 }}
              />
              <Bar
                dataKey="value"
                fill="url(#siteBarGradient)"
                radius={[0, 6, 6, 0]}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/* ═══════════════════════════════════════════
   TOP DRUGS BY VISITS (horizontal bar)
   ═══════════════════════════════════════════ */

const DRUG_FILTERS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'protocol', label: 'Protocol' },
  { key: 'chemotherapy', label: 'Chemo' },
  { key: 'hormonal', label: 'Hormonal' },
  { key: 'immunotherapy', label: 'Immuno' },
  { key: 'targeted therapy', label: 'Targeted' },
] as const;

interface TopDrugsChartProps {
  data: BarChartData[];
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
  isLoading?: boolean;
}

export function TopDrugsChart({
  data,
  activeFilter = 'all',
  onFilterChange,
  isLoading,
}: TopDrugsChartProps) {
  const filterButtons = onFilterChange ? (
    <div className="flex flex-wrap gap-1 pt-1">
      {DRUG_FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => onFilterChange(f.key)}
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            activeFilter === f.key
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30',
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  ) : undefined;

  return (
    <ChartCard
      title="Top 10 ยาที่ใช้บ่อยที่สุด"
      description="จำนวนครั้งที่สั่งยาแยกตามหมวด"
      icon={<BarChart3 className="h-4 w-4" />}
      headerExtra={filterButtons}
    >
      {isLoading ? (
        <div className="h-[300px] flex items-center justify-center">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
        </div>
      ) : data.length === 0 ? (
        <EmptyState message="ไม่พบข้อมูลยาในหมวดนี้" />
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="drugBarGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0D9488" />
                  <stop offset="100%" stopColor="#5EEAD4" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="var(--border)"
                strokeOpacity={0.5}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={{ stroke: 'var(--border)', strokeOpacity: 0.5 }}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={140}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<BarTooltip />}
                cursor={{ fill: 'var(--primary)', opacity: 0.06 }}
              />
              <Bar
                dataKey="value"
                fill="url(#drugBarGradient)"
                radius={[0, 6, 6, 0]}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/* ═══════════════════════════════════════════
   Z51x BILLING APPROVAL RATE (donut)
   ═══════════════════════════════════════════ */

const BILLING_COLORS: Record<string, string> = {
  'เรียกเก็บสำเร็จ': '#059669',
  'รอดำเนินการ': '#D97706',
  'ถูกปฏิเสธ': '#E11D48',
};

interface BillingApprovalRateData {
  approved: number;
  pending: number;
  rejected: number;
  rate: number;
}

export function BillingApprovalRateChart({ data }: { data: BillingApprovalRateData }) {
  const pieData = [
    { name: 'เรียกเก็บสำเร็จ', value: data.approved },
    { name: 'รอดำเนินการ', value: data.pending },
    { name: 'ถูกปฏิเสธ', value: data.rejected },
  ].filter((d) => d.value > 0);

  const hasData = data.approved + data.pending + data.rejected > 0;

  return (
    <ChartCard
      title="อัตราการเรียกเก็บสำเร็จ"
      description="สัดส่วน Visit Z51x ที่เรียกเก็บได้"
      icon={<PieChartIcon className="h-4 w-4" />}
    >
      {!hasData ? (
        <EmptyState message="ยังไม่มีข้อมูลการเรียกเก็บ" />
      ) : (
        <div className="h-[300px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={3}
                strokeWidth={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={BILLING_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                formatter={(value) => (
                  <span className="text-muted-foreground ml-0.5">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: '-18px' }}>
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums text-foreground font-heading leading-none">
                {data.rate}%
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">สำเร็จ</p>
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  );
}

/* ═══════════════════════════════════════════
   CONFIRMATION RATE (donut)
   ═══════════════════════════════════════════ */

const CONFIRM_COLORS = ['#059669', '#D97706'];

interface ConfirmationRateData {
  confirmed: number;
  unconfirmed: number;
  rate: number;
}

export function ConfirmationRateChart({ data }: { data: ConfirmationRateData }) {
  const pieData = [
    { name: 'ยืนยันแล้ว', value: data.confirmed },
    { name: 'ยังไม่ยืนยัน', value: data.unconfirmed },
  ];

  const hasData = data.confirmed + data.unconfirmed > 0;

  return (
    <ChartCard
      title="อัตราการยืนยันโปรโตคอล"
      description="สัดส่วน Visit ที่ยืนยันโปรโตคอลแล้ว"
      icon={<PieChartIcon className="h-4 w-4" />}
    >
      {!hasData ? (
        <EmptyState message="ยังไม่มีข้อมูล Visit" />
      ) : (
        <div className="h-[300px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={3}
                strokeWidth={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={CONFIRM_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                formatter={(value) => (
                  <span className="text-muted-foreground ml-0.5">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: '-18px' }}>
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums text-foreground font-heading leading-none">
                {data.rate}%
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">ยืนยันแล้ว</p>
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
