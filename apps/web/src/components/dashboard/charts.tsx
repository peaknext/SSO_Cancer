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

const CHART_COLORS = [
  '#0F766E', '#0D9488', '#14B8A6', '#2DD4BF', '#5EEAD4',
  '#99F6E4', '#EA580C', '#D97706', '#059669', '#E11D48',
];

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-[300px] flex items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// --- Visits by Cancer Site (horizontal bar) ---

interface BarChartData {
  name: string;
  value: number;
}

export function VisitsBySiteChart({ data }: { data: BarChartData[] }) {
  return (
    <ChartCard title="Top 10 ตำแหน่งมะเร็ง (โดย Visit)">
      {data.length === 0 ? (
        <EmptyState message="ยังไม่มีข้อมูล Visit — No visit data yet" />
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="var(--border)"
              />
              <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                formatter={(value: number) => [
                  `${value.toLocaleString('th-TH')} visits`,
                  'จำนวน',
                ]}
              />
              <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

// --- Top Drugs by Visits (horizontal bar) ---

const DRUG_FILTERS = [
  { key: 'all', label: 'ยาทั้งหมด' },
  { key: 'protocol', label: 'ยา Protocol' },
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
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Top 10 ยาที่ใช้บ่อยที่สุด
        </CardTitle>
        {onFilterChange && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {DRUG_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => onFilterChange(f.key)}
                className={cn(
                  'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  activeFilter === f.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
          </div>
        ) : data.length === 0 ? (
          <EmptyState message="ไม่พบข้อมูลยาในหมวดนี้ — No drugs found for this filter" />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="var(--border)"
                />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={140}
                  tick={{ fontSize: 10, fill: 'var(--muted)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                  formatter={(value: number) => [
                    `${value.toLocaleString('th-TH')} ครั้ง`,
                    'จำนวน',
                  ]}
                />
                <Bar dataKey="value" fill="#0D9488" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Z51x Billing Approval Rate (donut with center percentage) ---

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
    <ChartCard title="อัตราการเรียกเก็บสำเร็จ (Z51x)">
      {!hasData ? (
        <EmptyState message="ยังไม่มีข้อมูลการเรียกเก็บ — No billing data yet" />
      ) : (
        <div className="h-[300px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={
                      entry.name === 'เรียกเก็บสำเร็จ'
                        ? '#059669'
                        : entry.name === 'รอดำเนินการ'
                          ? '#D97706'
                          : '#E11D48'
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                formatter={(value: number) => [
                  value.toLocaleString('th-TH'),
                  'visits',
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value) => (
                  <span style={{ color: 'var(--foreground)' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center -mt-6">
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {data.rate}%
              </p>
              <p className="text-xs text-muted-foreground">เรียกเก็บสำเร็จ</p>
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  );
}

// --- Confirmation Rate (donut with center percentage) ---

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
    <ChartCard title="อัตราการยืนยันโปรโตคอล">
      {!hasData ? (
        <EmptyState message="ยังไม่มีข้อมูล Visit — No visit data yet" />
      ) : (
        <div className="h-[300px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                <Cell fill="#059669" />
                <Cell fill="#D97706" />
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                formatter={(value: number) => [
                  value.toLocaleString('th-TH'),
                  'visits',
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value) => (
                  <span style={{ color: 'var(--foreground)' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center -mt-6">
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {data.rate}%
              </p>
              <p className="text-xs text-muted-foreground">ยืนยันแล้ว</p>
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
