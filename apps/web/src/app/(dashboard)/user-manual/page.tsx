'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  Search,
  ArrowUp,
  LayoutDashboard,
  Users,
  FileText,
  Pill,
  FlaskConical,
  Microscope,
  SearchCheck,
  FileArchive,
  Settings,
  LogIn,
  KeyRound,
  Shield,
  HelpCircle,
  BookMarked,
  Workflow,
  AlertTriangle,
  MonitorSmartphone,
  Layers,
  ClipboardList,
  Database,
  Globe,
  Stethoscope,
  Receipt,
  Upload,
  Download,
  CheckCircle2,
  Sparkles,
  History,
  Eye,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Manual Version ─────────────────────────────────────────
const MANUAL_VERSION = '1.0.1';
const MANUAL_DATE = '9 มีนาคม 2569';
const MANUAL_CHANGELOG = [
  { version: '1.0.1', date: '9 มีนาคม 2569', description: 'แก้ไขข้อมูลแดชบอร์ด (กราฟ/ตาราง/ตัวกรอง) ให้ตรงกับระบบจริง, ระบุสถานะ SSOP Export' },
  { version: '1.0.0', date: '8 มีนาคม 2569', description: 'เวอร์ชันแรก — ครอบคลุมทุกฟีเจอร์ของระบบ' },
];

// ─── Section type definitions ───────────────────────────────
interface SubSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface Section {
  id: string;
  title: string;
  icon: LucideIcon;
  subsections: SubSection[];
}

// ─── Role permission table ──────────────────────────────────
function RoleTable() {
  const features = [
    { name: 'ดูแดชบอร์ดและข้อมูลทั่วไป', viewer: true, editor: true, admin: true },
    { name: 'ดูรายละเอียดผู้ป่วย/โปรโตคอล/ยา', viewer: true, editor: true, admin: true },
    { name: 'เพิ่ม/แก้ไข/ลบ ข้อมูลผู้ป่วย', viewer: false, editor: true, admin: true },
    { name: 'เพิ่ม/แก้ไข/ลบ โปรโตคอล สูตรยา ยา', viewer: false, editor: true, admin: true },
    { name: 'นำเข้าข้อมูล (Import)', viewer: false, editor: true, admin: true },
    { name: 'วิเคราะห์และยืนยันโปรโตคอล', viewer: false, editor: true, admin: true },
    { name: 'ขอคำแนะนำจาก AI', viewer: false, editor: true, admin: true },
    { name: 'ส่งออก SSOP / Excel', viewer: false, editor: true, admin: true },
    { name: 'จัดการผู้ใช้งาน', viewer: false, editor: false, admin: true },
    { name: 'ดูบันทึกกิจกรรม (Audit Log)', viewer: false, editor: false, admin: true },
    { name: 'ดาวน์โหลดสำรองข้อมูล', viewer: false, editor: false, admin: true },
  ];

  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-primary/20">
            <th className="text-left py-3 px-4 font-semibold text-foreground">ฟีเจอร์</th>
            <th className="text-center py-3 px-2 font-semibold text-foreground w-24">VIEWER</th>
            <th className="text-center py-3 px-2 font-semibold text-foreground w-24">EDITOR</th>
            <th className="text-center py-3 px-2 font-semibold text-foreground w-24">ADMIN</th>
          </tr>
        </thead>
        <tbody>
          {features.map((f, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-primary/[0.03] transition-colors">
              <td className="py-2.5 px-4 text-muted-foreground">{f.name}</td>
              <td className="text-center py-2.5 px-2">{f.viewer ? <CheckCircle2 className="h-4 w-4 text-success mx-auto" /> : <span className="text-muted-foreground/30">—</span>}</td>
              <td className="text-center py-2.5 px-2">{f.editor ? <CheckCircle2 className="h-4 w-4 text-success mx-auto" /> : <span className="text-muted-foreground/30">—</span>}</td>
              <td className="text-center py-2.5 px-2">{f.admin ? <CheckCircle2 className="h-4 w-4 text-success mx-auto" /> : <span className="text-muted-foreground/30">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Reusable content components ────────────────────────────
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 my-4">
      <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-warning/20 bg-warning/[0.04] p-4 my-4">
      <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="my-4 space-y-3">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            {i + 1}
          </span>
          <span className="text-sm text-muted-foreground leading-relaxed pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 py-1">
      <span className="font-medium text-foreground text-sm whitespace-nowrap">{label}:</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-border/60 p-4 hover:border-primary/30 transition-colors">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-[18px] w-[18px] text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Section data ───────────────────────────────────────────
const sections: Section[] = [
  {
    id: 'introduction',
    title: 'ส่วนนำและข้อมูลทั่วไป',
    icon: BookOpen,
    subsections: [
      {
        id: 'intro-about',
        title: 'เกี่ยวกับระบบ SSO Cancer Care',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">SSO Cancer Care</strong> เป็นระบบบริหารจัดการโปรโตคอลการรักษามะเร็ง
              สำหรับโรงพยาบาลในเครือข่ายสำนักงานประกันสังคม (สปส.) พัฒนาเพื่อช่วยให้บุคลากรทางการแพทย์
              สามารถจัดการข้อมูลการรักษามะเร็งได้อย่างมีประสิทธิภาพ ครอบคลุม 23 ตำแหน่งมะเร็ง
              พร้อมข้อมูลสูตรยา การจัดระยะโรค และราคายาตามบัญชีของ สปส.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              ระบบทำงานผ่านเว็บเบราว์เซอร์โดยไม่ต้องติดตั้งซอฟต์แวร์เพิ่มเติม
              ข้อมูลในฐานข้อมูล (เช่น ชื่อมะเร็ง ชื่อโปรโตคอล) เก็บทั้งภาษาไทยและอังกฤษ
              แต่หน้าจอการใช้งานปัจจุบันแสดงเป็นภาษาไทยเป็นหลัก
            </p>
            <div className="mt-6 rounded-xl border border-border/60 p-4 bg-card/50">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                <History className="h-3.5 w-3.5 text-primary" />
                ประวัติเวอร์ชัน
              </p>
              <div className="space-y-2">
                {MANUAL_CHANGELOG.map((log) => (
                  <div key={log.version} className="flex items-baseline gap-3 text-xs">
                    <span className="font-mono text-primary font-semibold">v{log.version}</span>
                    <span className="text-muted-foreground/60">{log.date}</span>
                    <span className="text-muted-foreground">{log.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ),
      },
      {
        id: 'intro-key-features',
        title: 'ความสามารถหลักของระบบ',
        content: (
          <>
            <div className="grid gap-3 sm:grid-cols-2 my-4">
              <FeatureCard icon={LayoutDashboard} title="แดชบอร์ดสรุปข้อมูล" description="ภาพรวมสถิติระบบ กราฟ และตัวเลขสำคัญในหน้าเดียว" />
              <FeatureCard icon={Users} title="บริหารจัดการผู้ป่วย" description="ลงทะเบียน เปิดเคส ติดตามการรักษา จัดการเบิกจ่าย" />
              <FeatureCard icon={SearchCheck} title="วิเคราะห์โปรโตคอล" description="จับคู่การรักษาจริงกับโปรโตคอลมาตรฐาน สปส. อัตโนมัติ" />
              <FeatureCard icon={Sparkles} title="AI แนะนำโปรโตคอล" description="ใช้ปัญญาประดิษฐ์ช่วยวิเคราะห์และแนะนำโปรโตคอลที่เหมาะสม" />
              <FeatureCard icon={Upload} title="นำเข้าข้อมูล" description="รองรับ CSV/Excel และเชื่อมต่อระบบ HIS โดยตรง" />
              <FeatureCard icon={FileArchive} title="ส่งออก SSOP 0.93" description="สร้างไฟล์เบิกจ่ายตามมาตรฐาน สปส. พร้อมส่ง" />
              <FeatureCard icon={Database} title="ข้อมูลอ้างอิงครบครัน" description="โปรโตคอล สูตรยา บัญชียา AIPN ตำแหน่งมะเร็ง 23 ตำแหน่ง" />
              <FeatureCard icon={Shield} title="ระบบความปลอดภัย" description="สิทธิ์ผู้ใช้ 4 ระดับ, บันทึกกิจกรรม, สำรองข้อมูล" />
            </div>
          </>
        ),
      },
      {
        id: 'intro-roles',
        title: 'บทบาทผู้ใช้งานในระบบ',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ระบบแบ่งบทบาทผู้ใช้งานออกเป็น 4 ระดับ โดยแต่ละระดับมีสิทธิ์การเข้าถึงที่แตกต่างกัน:
            </p>
            <div className="grid gap-3 sm:grid-cols-2 mt-4 mb-2">
              <div className="rounded-xl border border-border/60 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">VIEWER (ผู้ดู)</span>
                </div>
                <p className="text-xs text-muted-foreground">ดูข้อมูลทั้งหมดได้ แต่ไม่สามารถแก้ไข เพิ่ม หรือลบข้อมูลใดๆ</p>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/[0.02] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">EDITOR (ผู้แก้ไข)</span>
                </div>
                <p className="text-xs text-muted-foreground">สิทธิ์ VIEWER + เพิ่ม/แก้ไข/ลบข้อมูล นำเข้า ส่งออก วิเคราะห์โปรโตคอล</p>
              </div>
              <div className="rounded-xl border border-accent/30 bg-accent/[0.02] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold text-foreground">ADMIN (ผู้ดูแล)</span>
                </div>
                <p className="text-xs text-muted-foreground">สิทธิ์ EDITOR + จัดการผู้ใช้งาน ดูบันทึกกิจกรรม ดาวน์โหลดสำรองข้อมูล</p>
              </div>
              <div className="rounded-xl border border-warning/30 bg-warning/[0.02] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-4 w-4 text-warning" />
                  <span className="text-sm font-semibold text-foreground">SUPER_ADMIN</span>
                </div>
                <p className="text-xs text-muted-foreground">สิทธิ์สูงสุด — ตั้งค่าระบบ กู้คืนข้อมูล (ไม่ครอบคลุมในคู่มือนี้)</p>
              </div>
            </div>
            <RoleTable />
          </>
        ),
      },
      {
        id: 'intro-system-requirements',
        title: 'ข้อกำหนดของระบบ',
        content: (
          <>
            <div className="space-y-1 my-2">
              <KeyValue label="เบราว์เซอร์" value="Google Chrome, Mozilla Firefox, Microsoft Edge หรือ Safari เวอร์ชันล่าสุด" />
              <KeyValue label="หน้าจอ" value="แนะนำขนาด 1280 x 800 พิกเซลขึ้นไป (รองรับมือถือและแท็บเล็ต)" />
              <KeyValue label="อินเทอร์เน็ต" value="เชื่อมต่อเครือข่ายโรงพยาบาลหรืออินเทอร์เน็ต" />
              <KeyValue label="ซอฟต์แวร์" value="ไม่ต้องติดตั้งเพิ่มเติม — ทำงานผ่านเว็บเบราว์เซอร์" />
            </div>
            <Tip>หากใช้หน้าจอขนาดเล็ก (มือถือ) แถบด้านข้าง (Sidebar) จะซ่อนอัตโนมัติ กดไอคอนเมนู (☰) ที่มุมบนซ้ายเพื่อเปิด</Tip>
          </>
        ),
      },
    ],
  },
  {
    id: 'getting-started',
    title: 'การเริ่มต้นใช้งาน',
    icon: LogIn,
    subsections: [
      {
        id: 'gs-login',
        title: 'การเข้าสู่ระบบ',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">เปิดเว็บเบราว์เซอร์แล้วไปที่ URL ของระบบ จะเห็นหน้า Login</p>
            <StepList steps={[
              'กรอกอีเมลของคุณในช่อง "อีเมล"',
              'กรอกรหัสผ่านในช่อง "รหัสผ่าน"',
              'กดปุ่ม "เข้าสู่ระบบ" หรือกด Enter',
              'ระบบจะนำคุณไปยังหน้าแดชบอร์ดอัตโนมัติ',
            ]} />
            <Warning>
              หากกรอกรหัสผ่านผิดติดต่อกัน 5 ครั้ง บัญชีจะถูกล็อกเป็นเวลา 15 นาที
              รอจนครบเวลาแล้วลองใหม่ หรือติดต่อผู้ดูแลระบบ (ADMIN) เพื่อปลดล็อก
            </Warning>
            <Tip>ระบบจดจำ session ไว้ 7 วัน — ไม่ต้องเข้าสู่ระบบซ้ำหากไม่ปิดเบราว์เซอร์ แต่หากไม่มีการใช้งานเป็นเวลา 30 นาที session จะหมดอายุอัตโนมัติ</Tip>
          </>
        ),
      },
      {
        id: 'gs-first-login',
        title: 'การเข้าสู่ระบบครั้งแรก',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              เมื่อเข้าสู่ระบบครั้งแรกด้วยรหัสผ่านที่ผู้ดูแลตั้งให้ แนะนำให้เปลี่ยนรหัสผ่านทันทีเพื่อความปลอดภัย
            </p>
            <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
              <p className="font-medium text-foreground mb-2">ข้อกำหนดรหัสผ่าน:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>ความยาวอย่างน้อย 8 ตัวอักษร</li>
                <li>มีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว (A-Z)</li>
                <li>มีตัวอักษรพิมพ์เล็กอย่างน้อย 1 ตัว (a-z)</li>
                <li>มีตัวเลขอย่างน้อย 1 ตัว (0-9)</li>
                <li>ห้ามใช้รหัสผ่านเดียวกับ 5 ครั้งล่าสุด</li>
              </ul>
            </div>
          </>
        ),
      },
      {
        id: 'gs-change-password',
        title: 'การเปลี่ยนรหัสผ่าน',
        content: (
          <>
            <StepList steps={[
              'คลิกที่ชื่อผู้ใช้ (มุมบนขวาของหน้าจอ) เพื่อเปิดเมนูผู้ใช้',
              'เลือก "เปลี่ยนรหัสผ่าน"',
              'กรอกรหัสผ่านปัจจุบันในช่อง "รหัสผ่านปัจจุบัน"',
              'กรอกรหัสผ่านใหม่ในช่อง "รหัสผ่านใหม่" (ต้องผ่านข้อกำหนดรหัสผ่าน)',
              'กรอกรหัสผ่านใหม่อีกครั้งในช่อง "ยืนยันรหัสผ่านใหม่"',
              'กดปุ่ม "บันทึก"',
            ]} />
            <Warning>หลังเปลี่ยนรหัสผ่านสำเร็จ ระบบจะบังคับออกจากระบบทุก session ทันที (รวมถึงอุปกรณ์อื่น) คุณจะต้องเข้าสู่ระบบใหม่ด้วยรหัสผ่านใหม่</Warning>
          </>
        ),
      },
      {
        id: 'gs-logout',
        title: 'การออกจากระบบ',
        content: (
          <>
            <StepList steps={[
              'คลิกที่ชื่อผู้ใช้ (มุมบนขวาของหน้าจอ)',
              'เลือก "ออกจากระบบ" (ข้อความสีแดง)',
              'ระบบจะนำคุณกลับไปหน้า Login',
            ]} />
            <Tip>แนะนำให้ออกจากระบบทุกครั้งเมื่อใช้งานเสร็จ โดยเฉพาะเครื่องคอมพิวเตอร์ที่ใช้ร่วมกัน</Tip>
          </>
        ),
      },
    ],
  },
  {
    id: 'user-interface',
    title: 'ส่วนประกอบของหน้าจอ',
    icon: MonitorSmartphone,
    subsections: [
      {
        id: 'ui-layout',
        title: 'โครงสร้างหน้าจอหลัก',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">หลังเข้าสู่ระบบ หน้าจอหลักประกอบด้วย 3 ส่วนสำคัญ:</p>
            <div className="my-4 rounded-xl border border-border/60 overflow-hidden">
              <div className="bg-primary/5 border-b border-border/60 px-4 py-2 text-xs font-mono text-muted-foreground flex items-center gap-2">
                <Layers className="h-3.5 w-3.5" />
                โครงสร้างหน้าจอ
              </div>
              <div className="p-4 font-mono text-xs text-muted-foreground leading-loose whitespace-pre">{
`┌─────────────────────────────────────────────┐
│ Topbar: breadcrumb │ ธีม │ ผู้ใช้    │
├──────────┬──────────────────────────────────┤
│          │                                  │
│ Sidebar  │     พื้นที่เนื้อหาหลัก           │
│ (เมนู)   │     (Main Content)               │
│          │                                  │
│          │                                  │
│          │                                  │
└──────────┴──────────────────────────────────┘`
              }</div>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div><strong className="text-foreground">1. แถบด้านข้าง (Sidebar)</strong> — อยู่ทางซ้าย แสดงเมนูนำทางไปยังฟีเจอร์ต่างๆ สามารถย่อ/ขยายได้</div>
              <div><strong className="text-foreground">2. แถบด้านบน (Topbar)</strong> — แสดง breadcrumb (ตำแหน่งปัจจุบัน) ปุ่มสลับธีม และเมนูผู้ใช้</div>
              <div><strong className="text-foreground">3. พื้นที่เนื้อหาหลัก</strong> — ตรงกลาง แสดงข้อมูลตามเมนูที่เลือก</div>
            </div>
          </>
        ),
      },
      {
        id: 'ui-sidebar',
        title: 'แถบนำทางด้านข้าง (Sidebar)',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">Sidebar แสดงเมนูนำทางหลักของระบบ:</p>
            <div className="my-4 space-y-1">
              {[
                { icon: LayoutDashboard, name: 'แดชบอร์ด', desc: 'หน้าภาพรวมระบบ' },
                { icon: Users, name: 'ผู้ป่วยมะเร็ง', desc: 'จัดการข้อมูลผู้ป่วย' },
                { icon: FileText, name: 'โปรโตคอล', desc: 'แนวทางการรักษามาตรฐาน' },
                { icon: Pill, name: 'ยา', desc: 'ฐานข้อมูลยา' },
                { icon: FlaskConical, name: 'สูตรยา', desc: 'ชุดยาที่ใช้ร่วมกัน' },
                { icon: Microscope, name: 'ตำแหน่งมะเร็ง', desc: 'ข้อมูลอ้างอิง 23 ตำแหน่ง' },
                { icon: SearchCheck, name: 'วิเคราะห์โปรโตคอล', desc: 'จับคู่การรักษากับมาตรฐาน' },
                { icon: Settings, name: 'ตั้งค่า', desc: 'ADMIN+ — ผู้ใช้ AI บัญชียา บันทึก สำรอง' },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm">
                  <item.icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground">{item.name}</span>
                  <span className="text-xs text-muted-foreground">— {item.desc}</span>
                </div>
              ))}
            </div>
            <Tip>คลิกปุ่มลูกศร (◀) ที่ด้านล่าง Sidebar เพื่อย่อ/ขยาย บนมือถือกดไอคอน ☰ ที่ Topbar เพื่อเปิด Sidebar</Tip>
          </>
        ),
      },
      {
        id: 'ui-topbar',
        title: 'แถบด้านบน (Topbar)',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">Topbar แสดงข้อมูลและตัวเลือกสำคัญ:</p>
            <div className="my-3 space-y-2 text-sm text-muted-foreground">
              <div><strong className="text-foreground">Breadcrumb</strong> — แสดงเส้นทางของหน้าปัจจุบัน เช่น หน้าหลัก &gt; โปรโตคอล &gt; แก้ไข</div>
              <div><strong className="text-foreground">ปุ่มสลับธีม</strong> — ไอคอนดวงอาทิตย์ (โหมดสว่าง) หรือพระจันทร์ (โหมดมืด) คลิกเพื่อสลับ</div>
              <div><strong className="text-foreground">เมนูผู้ใช้</strong> — แสดงชื่อและบทบาท คลิกเพื่อดูตัวเลือก: คู่มือใช้งาน, เปลี่ยนรหัสผ่าน, ออกจากระบบ</div>
            </div>
          </>
        ),
      },
      {
        id: 'ui-common-patterns',
        title: 'รูปแบบการใช้งานที่พบบ่อย',
        content: (
          <>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">ตารางข้อมูล (DataTable)</p>
                <p>ใช้ทั่วทั้งระบบ มีช่องค้นหา ตัวกรอง (Filter) การเรียงลำดับ (คลิกหัวคอลัมน์) และการแบ่งหน้า (Pagination) ระบบจดจำการตั้งค่าไว้แม้เปลี่ยนหน้า</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">ฟอร์มกรอกข้อมูล</p>
                <p>มีการตรวจสอบข้อมูล (Validation) แจ้งเตือนเมื่อกรอกไม่ถูกต้อง ช่องที่จำเป็นจะมีเครื่องหมาย * กำกับ</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">กล่องยืนยัน (Confirm Dialog)</p>
                <p>ก่อนดำเนินการสำคัญ (ลบ, ยืนยัน) จะมีกล่องถามยืนยันเสมอ เพื่อป้องกันการกดผิด</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">การแจ้งเตือน (Toast)</p>
                <p>ข้อความสั้นมุมบนขวาของหน้าจอ แจ้งผลสำเร็จ (สีเขียว) หรือข้อผิดพลาด (สีแดง) จะหายไปอัตโนมัติ</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Badge สถานะ</p>
                <p>แสดงสถานะด้วยสีต่างๆ: เขียว = ใช้งาน (Active) แดง = ปิดใช้งาน (Inactive) เหลือง = รอดำเนินการ</p>
              </div>
            </div>
          </>
        ),
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'แดชบอร์ด',
    icon: LayoutDashboard,
    subsections: [
      {
        id: 'dash-overview',
        title: 'ภาพรวมแดชบอร์ด',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              แดชบอร์ดคือหน้าแรกหลังเข้าสู่ระบบ แสดงสรุปข้อมูลสำคัญของระบบในรูปแบบภาพ (Visual)
              เหมาะสำหรับดูภาพรวมอย่างรวดเร็ว
            </p>
            <Tip>ข้อมูลแดชบอร์ดมีการ cache 5 นาที — ตัวเลขอาจไม่ใช่ข้อมูล realtime หากต้องการข้อมูลล่าสุด ให้ refresh หน้า</Tip>
          </>
        ),
      },
      {
        id: 'dash-stat-cards',
        title: 'การ์ดสถิติ (Stat Cards)',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ด้านบนของแดชบอร์ดแสดงการ์ดสถิติ 3 กลุ่ม พร้อมตัวเลขแบบ animation นับขึ้น:
            </p>
            <div className="my-3 space-y-2 text-sm text-muted-foreground">
              <div><strong className="text-foreground">กลุ่ม Z51x Billing</strong> — Visit Z51x ทั้งหมด, Z51x เรียกเก็บสำเร็จ, Z51x รอดำเนินการ</div>
              <div><strong className="text-foreground">กลุ่มภาพรวมข้อมูล</strong> — Visit ทั้งหมด, มะเร็งอันดับ 1 (โดย Visit), สูตรยาที่ไม่มียา</div>
              <div><strong className="text-foreground">กลุ่ม AI Analytics</strong> — AI Suggestion ทั้งหมด, Token ที่ใช้ทั้งหมด, ผู้ใช้ AI สูงสุด</div>
            </div>
          </>
        ),
      },
      {
        id: 'dash-charts',
        title: 'กราฟและแผนภูมิ',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ด้านล่างของการ์ดสถิติแสดงกราฟ 4 แผนภูมิ:
            </p>
            <div className="my-3 space-y-2 text-sm text-muted-foreground">
              <div><strong className="text-foreground">1. Top 10 ตำแหน่งมะเร็ง</strong> — แท่งแนวนอนแสดงจำนวน visit ของตำแหน่งมะเร็งที่พบมากที่สุด</div>
              <div><strong className="text-foreground">2. Top 10 ยาที่ใช้บ่อยที่สุด</strong> — แท่งแนวนอนแสดงยาที่พบมากที่สุด มีปุ่มกรองตามหมวดยา (ทั้งหมด, Protocol, Chemo, Hormonal, Immuno, Targeted)</div>
              <div><strong className="text-foreground">3. อัตราการเรียกเก็บสำเร็จ</strong> — แผนภูมิวงกลมแสดงสัดส่วน Z51x ที่เรียกเก็บสำเร็จ/รอดำเนินการ/ถูกปฏิเสธ</div>
              <div><strong className="text-foreground">4. อัตราการยืนยันโปรโตคอล</strong> — แผนภูมิวงกลมแสดงสัดส่วน visit ที่ยืนยันโปรโตคอลแล้วเทียบกับทั้งหมด</div>
            </div>
            <Tip>เลื่อนเมาส์ไปบนกราฟ (hover) เพื่อดูค่าของจุดข้อมูลที่ต้องการ กราฟแสดงข้อมูลรวมทั้งหมด (ไม่มีตัวกรองวันที่)</Tip>
          </>
        ),
      },
      {
        id: 'dash-tables',
        title: 'ตารางข้อมูลในแดชบอร์ด',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ด้านล่างกราฟอาจแสดงตารางเพิ่มเติม (ขึ้นกับข้อมูลในระบบ):
            </p>
            <div className="my-3 space-y-2 text-sm text-muted-foreground">
              <div><strong className="text-foreground">สูตรยาที่ต้องตรวจสอบ</strong> — แสดงสูตรยาที่ยังไม่มียา (แสดงเมื่อมี) คลิก &quot;เพิ่มยา&quot; เพื่อไปหน้าแก้ไข</div>
              <div><strong className="text-foreground">ผู้ป่วยที่ต้องสร้างเคส</strong> — แสดงผู้ป่วยที่มี visit แต่ยังไม่มีเคสรักษา คลิกเพื่อไปหน้ารายละเอียด</div>
              <div><strong className="text-foreground">Visit Z51x ที่ต้องดำเนินการ</strong> — ตารางหลัก แสดง visit Z51x ที่ยังไม่ได้เรียกเก็บ/ถูกปฏิเสธ มีตัวกรอง 3 ประเภท: รหัส Z51 ย่อย (Z510/Z511), สถานะการเบิก, และ<strong className="text-foreground">ช่วงวันที่</strong> แสดงเวลาที่ผ่านไปพร้อมนับวันคงเหลือก่อนครบ 2 ปี</div>
            </div>
            <Tip>ตัวกรองช่วงวันที่มีเฉพาะในตาราง &quot;Visit Z51x ที่ต้องดำเนินการ&quot; เท่านั้น — กราฟไม่มีตัวกรองวันที่</Tip>
          </>
        ),
      },
    ],
  },
  {
    id: 'cancer-patients',
    title: 'ผู้ป่วยมะเร็ง',
    icon: Users,
    subsections: [
      {
        id: 'cp-patient-list',
        title: 'รายการผู้ป่วย',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              หน้ารายการผู้ป่วยแสดงตารางข้อมูลผู้ป่วยทั้งหมด พร้อม HN ชื่อ-สกุล เลขบัตรประชาชน ตำแหน่งมะเร็ง
              สถานะเคส และจำนวน visit
            </p>
            <div className="my-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">วิธีค้นหาผู้ป่วย:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>พิมพ์ HN, ชื่อ-สกุล, หรือเลขบัตรประชาชนในช่องค้นหา</li>
                <li>ใช้ตัวกรองตำแหน่งมะเร็ง (Cancer Site filter) เพื่อแสดงเฉพาะผู้ป่วยมะเร็งตำแหน่งนั้น</li>
                <li>คลิกที่แถวเพื่อเข้าดูรายละเอียดผู้ป่วย</li>
              </ul>
            </div>
          </>
        ),
      },
      {
        id: 'cp-create-patient',
        title: 'ลงทะเบียนผู้ป่วยใหม่',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">สิทธิ์: EDITOR ขึ้นไป</p>
            <StepList steps={[
              'ที่หน้ารายการผู้ป่วย คลิกปุ่ม "เพิ่มผู้ป่วย"',
              'กรอก HN (เลขประจำตัวผู้ป่วยของโรงพยาบาล)',
              'กรอกชื่อ-สกุล (ไทย/อังกฤษ), เลขบัตรประชาชน 13 หลัก, วันเกิด, เพศ',
              'กรอกข้อมูลติดต่อ (ที่อยู่, โทรศัพท์) ถ้ามี',
              'กดปุ่ม "บันทึก" — ระบบตรวจสอบว่า HN/เลขบัตรประชาชนซ้ำหรือไม่',
            ]} />
            <Tip>ผู้ป่วยที่นำเข้าจาก Excel/CSV หรือระบบ HIS จะถูกสร้างอัตโนมัติจาก HN โดยไม่ต้องลงทะเบียนซ้ำ</Tip>
          </>
        ),
      },
      {
        id: 'cp-case-management',
        title: 'การจัดการเคสรักษา',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ผู้ป่วย 1 คนสามารถมีหลายเคส (กรณีมะเร็งมากกว่า 1 ตำแหน่ง หรือเปิดเคสใหม่หลังเปลี่ยนโปรโตคอล)
            </p>
            <div className="my-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">เปิดเคสใหม่:</p>
            </div>
            <StepList steps={[
              'ที่หน้ารายละเอียดผู้ป่วย คลิก "เปิดเคสใหม่"',
              'เลือกตำแหน่งมะเร็ง',
              'เลือกโปรโตคอลการรักษา (ค้นหาได้ จัดกลุ่มตามตำแหน่งมะเร็ง)',
              'เลือกโรงพยาบาล (ค้นหาได้)',
              'กรอก VCR Code (รหัสอนุมัติจาก สปส.) และ Case Number (เลขที่เคส)',
              'กดบันทึก',
            ]} />
            <div className="mt-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">การดำเนินการอื่น:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li><strong>แก้ไขเคส</strong> — เปลี่ยนโปรโตคอล โรงพยาบาล หรือข้อมูลอื่น</li>
                <li><strong>ปิดเคส</strong> — เมื่อรักษาเสร็จสิ้นหรือเปลี่ยนแผนการรักษา</li>
              </ul>
            </div>
          </>
        ),
      },
      {
        id: 'cp-visit-timeline',
        title: 'ไทม์ไลน์การรับบริการ',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ในหน้ารายละเอียดผู้ป่วย ส่วนล่างแสดง visit ทั้งหมดเรียงตามวันที่ (ล่าสุดอยู่บน)
            </p>
            <div className="my-3 text-sm text-muted-foreground">
              <ul className="space-y-1 ml-4 list-disc">
                <li>แต่ละ visit แสดง VN, วันที่, รหัส ICD-10 หลัก</li>
                <li>กดขยายเพื่อดู: ICD-10 รอง, รายการยาที่ได้รับ (ชื่อยา ปริมาณ หน่วย)</li>
                <li>ระบบจดจำสถานะขยาย/ย่อของแต่ละ visit (เปิดหน้าใหม่ก็ยังเหมือนเดิม)</li>
              </ul>
            </div>
          </>
        ),
      },
      {
        id: 'cp-billing-claims',
        title: 'การเบิกจ่ายค่ารักษา',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">สิทธิ์: EDITOR ขึ้นไป</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ในแต่ละ visit สามารถเพิ่มรายการเบิกจ่ายได้หลายรอบ (round) เพื่อติดตามว่า visit ใดเบิกจ่ายแล้ว/ยังไม่ได้เบิก
            </p>
            <StepList steps={[
              'ขยาย visit ที่ต้องการ',
              'คลิก "เพิ่มรอบเบิก"',
              'กรอกวันที่เบิก เลือกสถานะ (รอเบิก/เบิกแล้ว/ปฏิเสธ)',
              'กดบันทึก',
            ]} />
          </>
        ),
      },
      {
        id: 'cp-excel-export',
        title: 'ส่งออกข้อมูลเป็น Excel',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">สิทธิ์: EDITOR ขึ้นไป</p>
            <StepList steps={[
              'ที่หน้ารายการผู้ป่วย คลิกปุ่ม "ส่งออก Excel"',
              'เลือกฟิลด์ (คอลัมน์) ที่ต้องการส่งออก',
              'กดดาวน์โหลด — ระบบจะสร้างไฟล์ Excel (.xlsx) ให้',
            ]} />
            <Tip>ใช้สำหรับรายงาน วิเคราะห์ข้อมูลนอกระบบ หรือส่งต่อหน่วยงานอื่น</Tip>
          </>
        ),
      },
    ],
  },
  {
    id: 'protocol-analysis',
    title: 'วิเคราะห์โปรโตคอล',
    icon: SearchCheck,
    subsections: [
      {
        id: 'pa-overview',
        title: 'ภาพรวม',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ระบบวิเคราะห์โปรโตคอลเป็นหัวใจสำคัญของ SSO Cancer Care ทำหน้าที่จับคู่ข้อมูลการรักษาจริงของผู้ป่วย
              กับโปรโตคอลมาตรฐานของ สปส. โดยวิเคราะห์จากรหัส ICD-10 ยาที่ได้รับ และระยะโรค
              แล้วเสนอโปรโตคอลที่เหมาะสมพร้อมคะแนนความเข้ากัน
            </p>
          </>
        ),
      },
      {
        id: 'pa-three-column-layout',
        title: 'รูปแบบหน้าจอ 3 คอลัมน์',
        content: (
          <>
            <div className="my-4 rounded-xl border border-border/60 overflow-hidden">
              <div className="bg-primary/5 border-b border-border/60 px-4 py-2 text-xs font-mono text-muted-foreground flex items-center gap-2">
                <Layers className="h-3.5 w-3.5" />
                รูปแบบ 3 คอลัมน์
              </div>
              <div className="p-4 font-mono text-xs text-muted-foreground leading-loose whitespace-pre">{
`┌──────────┬──────────┬────────────────────┐
│  รายการ  │  รายการ  │                    │
│  HN      │  VN      │  รายละเอียด visit  │
│          │          │  ยาที่ได้รับ        │
│  (ค้นหา  │  (วันที่ │  ผลจับคู่โปรโตคอล  │
│  เลือก)  │  สถานะ)  │  คำแนะนำ AI        │
└──────────┴──────────┴────────────────────┘`
              }</div>
            </div>
            <StepList steps={[
              'คลิกเลือก HN (ผู้ป่วย) ในคอลัมน์ซ้าย',
              'เลือก VN (visit) ในคอลัมน์กลาง',
              'ดูรายละเอียดและผลวิเคราะห์ในคอลัมน์ขวา',
            ]} />
          </>
        ),
      },
      {
        id: 'pa-protocol-matching',
        title: 'ผลการจับคู่โปรโตคอล',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ระบบจะแสดงรายการโปรโตคอลที่แนะนำ เรียงตามคะแนนสูงสุด (top 10) โดยให้คะแนนจาก:
            </p>
            <div className="my-3 space-y-2 text-sm text-muted-foreground">
              <div><strong className="text-foreground">ยาที่ตรงกัน</strong> — ยิ่งยาตรงกันมากคะแนนยิ่งสูง (สูงสุด 50 คะแนน)</div>
              <div><strong className="text-foreground">ระยะโรค</strong> — ระยะตรงกันได้ 25 คะแนน</div>
              <div><strong className="text-foreground">ประเภทการรักษา</strong> — ฉายแสง/เคมีบำบัดตรงกันได้คะแนนเพิ่ม</div>
              <div><strong className="text-foreground">โปรโตคอลแนะนำ</strong> — โปรโตคอลที่กำหนดเป็น preferred ได้คะแนนพิเศษ</div>
              <div><strong className="text-foreground">ความสอดคล้องกับบัญชียา สปส.</strong> — ยาอยู่ในบัญชี สปส. ได้คะแนนเพิ่ม</div>
              <div><strong className="text-foreground">ประวัติผู้ป่วย</strong> — โปรโตคอลที่เคยยืนยันให้ผู้ป่วยคนเดียวกันได้คะแนนโบนัส</div>
            </div>
            <Tip>กรณีพบยาเคมีบำบัดที่ไม่อยู่ในโปรโตคอลมาตรฐาน ระบบจะแสดง &quot;Non-Protocol&quot; เป็นตัวเลือกด้วย</Tip>
          </>
        ),
      },
      {
        id: 'pa-confirmation',
        title: 'การยืนยันโปรโตคอล',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">สิทธิ์: EDITOR ขึ้นไป</p>
            <StepList steps={[
              'ดูผลการจับคู่โปรโตคอลในคอลัมน์ขวา',
              'เลือกโปรโตคอลที่ถูกต้อง',
              'กดปุ่ม "ยืนยัน" (Confirm) — สถานะจะเปลี่ยนเป็นเครื่องหมายถูกสีเขียว',
            ]} />
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              สามารถยกเลิกการยืนยัน (Unconfirm) ได้หากต้องการเปลี่ยนโปรโตคอล การยืนยันจะส่งผลต่อคะแนน
              ของ visit อื่นของผู้ป่วยคนเดียวกัน (visit ถัดไปจะได้คะแนน history bonus)
            </p>
          </>
        ),
      },
      {
        id: 'pa-ai-suggestion',
        title: 'คำแนะนำจาก AI',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">สิทธิ์: EDITOR ขึ้นไป | ต้องเปิดใช้ AI ในตั้งค่า</p>
            <StepList steps={[
              'เลือก visit ที่ต้องการ',
              'กดปุ่ม "ขอคำแนะนำ AI" ที่ส่วนล่างของรายละเอียด',
              'รอ AI ประมวลผล (อาจใช้เวลาหลายวินาที)',
              'AI จะแนะนำโปรโตคอลพร้อมเหตุผล (แสดงเป็นภาษาไทย)',
            ]} />
            <Tip>AI ไม่ได้รับข้อมูลส่วนตัวของผู้ป่วย (ไม่ส่ง HN หรือชื่อ) — ส่งเฉพาะข้อมูลทางการแพทย์ (ICD-10, ยา)</Tip>
          </>
        ),
      },
    ],
  },
  {
    id: 'protocol-analysis-import',
    title: 'นำเข้าข้อมูลผู้ป่วย',
    icon: Upload,
    subsections: [
      {
        id: 'pai-file-format',
        title: 'รูปแบบไฟล์ที่รองรับ',
        content: (
          <>
            <div className="my-2 space-y-1 text-sm text-muted-foreground">
              <KeyValue label="รูปแบบ" value="CSV (.csv) หรือ Excel (.xlsx)" />
              <KeyValue label="ขนาดสูงสุด" value="10 MB" />
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">คอลัมน์ที่จำเป็น:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li><code className="font-mono text-xs bg-primary/5 px-1.5 py-0.5 rounded">HN</code> — เลขผู้ป่วย</li>
                <li><code className="font-mono text-xs bg-primary/5 px-1.5 py-0.5 rounded">VN</code> — เลขรับบริการ</li>
                <li><code className="font-mono text-xs bg-primary/5 px-1.5 py-0.5 rounded">วันที่</code> — วันที่ visit (vsdate/visitDate/visit_date)</li>
                <li><code className="font-mono text-xs bg-primary/5 px-1.5 py-0.5 rounded">วินิจฉัยหลัก</code> — primaryDiagnosis (รหัส ICD-10)</li>
              </ul>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">คอลัมน์เพิ่มเติม (ไม่บังคับ):</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>วินิจฉัยรอง, HPI, หมายเหตุจากแพทย์, รายการยาที่ได้รับ</li>
              </ul>
            </div>
            <Tip>รองรับหัวคอลัมน์ทั้งภาษาไทยและอังกฤษ</Tip>
          </>
        ),
      },
      {
        id: 'pai-upload-steps',
        title: 'ขั้นตอนการนำเข้าไฟล์',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">สิทธิ์: EDITOR ขึ้นไป</p>
            <StepList steps={[
              'ไปที่เมนู "วิเคราะห์โปรโตคอล" แล้วคลิกปุ่ม "นำเข้าข้อมูล"',
              'เลือกไฟล์ CSV/Excel หรือลากวาง (drag & drop)',
              'ระบบแสดงตัวอย่างข้อมูล (preview) — ตรวจสอบจำนวนแถว คอลัมน์ที่พบ ข้อผิดพลาด',
              'กด "ยืนยันนำเข้า"',
              'ระบบจับคู่ยาอัตโนมัติ (3 ระดับ: exact → startsWith → contains) สร้าง visit และผูกกับผู้ป่วย',
              'ดูผลสรุป: นำเข้าสำเร็จกี่รายการ ข้ามกี่รายการ',
            ]} />
          </>
        ),
      },
      {
        id: 'pai-his-integration',
        title: 'นำเข้าจากระบบ HIS โดยตรง',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">สิทธิ์: EDITOR ขึ้นไป | ต้องตั้งค่า HIS API ก่อน</p>
            <StepList steps={[
              'ค้นหาผู้ป่วย — พิมพ์ HN เลขบัตรประชาชน หรือชื่อผู้ป่วย',
              'เลือกช่วงวันที่ ดูจำนวน visit (ทั้งหมด / เกี่ยวกับมะเร็ง / นำเข้าแล้ว / ใหม่)',
              'กด "นำเข้า" — ระบบดึงเฉพาะ visit มะเร็ง (ICD-10: C, D0, Z51) พร้อมรายการยาและเบิกจ่าย',
            ]} />
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              <strong className="text-foreground">ค้นหาขั้นสูง:</strong> ค้นด้วยช่วงวันที่ + รหัส ICD-10 + ตำแหน่งมะเร็ง + ยา (สูงสุด 31 วันต่อครั้ง)
            </p>
            <Warning>ต้องตั้งค่า URL และ API key ของ HIS ที่หน้า "ตั้งค่าระบบ" ก่อนใช้งาน</Warning>
          </>
        ),
      },
    ],
  },
  {
    id: 'protocols',
    title: 'โปรโตคอล',
    icon: FileText,
    subsections: [
      {
        id: 'prot-overview',
        title: 'ภาพรวม',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              โปรโตคอลคือแนวทางการรักษามะเร็งมาตรฐานที่กำหนดโดย สปส. แต่ละโปรโตคอลประกอบด้วย ชื่อ (ไทย/อังกฤษ)
              ตำแหน่งมะเร็ง ระยะโรคที่ครอบคลุม สูตรยาที่ใช้ และประเภทการรักษา ระบบมีข้อมูลประมาณ 169 โปรโตคอล
            </p>
          </>
        ),
      },
      {
        id: 'prot-list',
        title: 'รายการโปรโตคอล',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ตารางแสดงโปรโตคอลทั้งหมด พร้อมรหัส ชื่อ ตำแหน่งมะเร็ง จำนวนสูตรยา สถานะ
              ค้นหาด้วยชื่อ/รหัส กรองตามตำแหน่งมะเร็ง คลิกแถวเพื่อดูรายละเอียด
            </p>
          </>
        ),
      },
      {
        id: 'prot-create-edit',
        title: 'สร้างและแก้ไขโปรโตคอล',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">สิทธิ์: EDITOR ขึ้นไป</p>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">สร้างใหม่:</p>
            </div>
            <StepList steps={[
              'คลิกปุ่ม "เพิ่มโปรโตคอล"',
              'กรอกชื่อไทย/อังกฤษ เลือกตำแหน่งมะเร็ง ประเภทการรักษา',
              'ตั้งค่า preferred/active แล้วกดบันทึก',
            ]} />
            <div className="text-sm text-muted-foreground mt-3">
              <p className="font-medium text-foreground mb-2">เชื่อมโยงสูตรยา:</p>
              <p>ในหน้าแก้ไขโปรโตคอล คลิก &quot;เพิ่มสูตรยา&quot; เลือกจากรายการ สามารถจัดการยาในสูตร (เพิ่ม/ลบ/แก้ไขขนาดยา) ผ่าน modal โดยไม่ต้องออกจากหน้า</p>
            </div>
          </>
        ),
      },
    ],
  },
  {
    id: 'regimens',
    title: 'สูตรยา',
    icon: FlaskConical,
    subsections: [
      {
        id: 'reg-overview',
        title: 'ภาพรวม',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              สูตรยา (Regimen) คือชุดของยาที่ใช้ร่วมกันในการรักษาตามโปรโตคอล เช่น FOLFOX (5-FU + Leucovorin + Oxaliplatin)
              แต่ละสูตรยาประกอบด้วยรายการยาพร้อมขนาด หน่วย เส้นทางการให้ และรอบการรักษา
              สูตรยา 1 ตัวสามารถเชื่อมโยงกับหลายโปรโตคอล
            </p>
          </>
        ),
      },
      {
        id: 'reg-create-edit',
        title: 'สร้างและแก้ไขสูตรยา',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">สิทธิ์: EDITOR ขึ้นไป</p>
            <StepList steps={[
              'คลิกปุ่ม "เพิ่มสูตรยา" กรอกชื่อสูตร คำอธิบาย กดบันทึก',
              'เพิ่มยาในสูตร: คลิก "เพิ่มยา" เลือกยา (ค้นหาได้) กรอกขนาด หน่วย เส้นทางการให้',
              'แก้ไข/ลบยาในสูตรได้ตลอดเวลา',
            ]} />
          </>
        ),
      },
    ],
  },
  {
    id: 'drugs',
    title: 'ยา',
    icon: Pill,
    subsections: [
      {
        id: 'drug-overview',
        title: 'ภาพรวม',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ระบบเก็บข้อมูลยา: ชื่อสามัญ (generic name), หมวดหมู่ (chemotherapy, hormonal, targeted therapy, immunotherapy, supportive),
              ราคา, รูปแบบยา (form), ขนาด (strength), และชื่อการค้า (trade names)
              ระบบมีข้อมูลประมาณ 98 ยาและ 380 ชื่อการค้า
            </p>
          </>
        ),
      },
      {
        id: 'drug-create-edit',
        title: 'สร้างและแก้ไขข้อมูลยา',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">สิทธิ์: EDITOR ขึ้นไป</p>
            <StepList steps={[
              'คลิกปุ่ม "เพิ่มยา"',
              'กรอกชื่อสามัญ เลือกหมวดหมู่ กรอกราคา รูปแบบยา ขนาด หน่วย',
              'กดบันทึก แล้วเพิ่มชื่อการค้า (Trade Names) ได้: ชื่อ ผู้ผลิต ราคา',
            ]} />
          </>
        ),
      },
    ],
  },
  {
    id: 'cancer-sites',
    title: 'ตำแหน่งมะเร็ง',
    icon: Microscope,
    subsections: [
      {
        id: 'cs-overview',
        title: 'ภาพรวม',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ข้อมูลอ้างอิง 23 ตำแหน่งมะเร็งตามที่ สปส. กำหนด (อ่านอย่างเดียว — ไม่สามารถแก้ไข)
              แต่ละตำแหน่งมีชื่อไทย/อังกฤษ รหัส ICD-10 และระยะโรค ใช้อ้างอิงในหลายส่วนของระบบ
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'ssop-export',
    title: 'ส่งออก SSOP 0.93',
    icon: FileArchive,
    subsections: [
      {
        id: 'ssop-overview',
        title: 'ภาพรวม',
        content: (
          <>
            <Warning>
              ฟีเจอร์ส่งออก SSOP 0.93 ยังไม่แสดงในเมนูหลัก (Sidebar) เข้าถึงได้โดยพิมพ์ URL โดยตรง: <code className="font-mono text-xs bg-primary/5 px-1.5 py-0.5 rounded">/ssop-export</code> หรือเลือกจากเมนู End-to-End workflow ในคู่มือนี้
            </Warning>
            <p className="text-sm text-muted-foreground leading-relaxed">
              SSOP 0.93 คือรูปแบบไฟล์อิเล็กทรอนิกส์มาตรฐานสำหรับเบิกจ่ายค่ารักษาพยาบาลกับ สปส.
              ประกอบด้วย 3 ส่วน: BILLTRAN (ข้อมูลการเงิน), BILLDISP (ข้อมูลการจ่ายยา), OPServices (บริการและวินิจฉัย)
              ระบบสร้างไฟล์ ZIP ตามมาตรฐานพร้อมส่ง
            </p>
          </>
        ),
      },
      {
        id: 'ssop-create-export',
        title: 'สร้างไฟล์ส่งออก',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">สิทธิ์: EDITOR ขึ้นไป | ขั้นตอน 3 ขั้น:</p>
            <div className="my-3 space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">ขั้นที่ 1: เลือกข้อมูล (Select)</p>
                <p>เลือกช่วงวันที่ด้วยปฏิทินพุทธศักราช ค้นหาและเลือก visit ที่มีข้อมูลเบิกจ่าย (checkbox)</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">ขั้นที่ 2: ตรวจสอบ (Preview)</p>
                <p>ระบบตรวจสอบข้อมูล แยกเป็น visit ที่ผ่าน (valid) และไม่ผ่าน (invalid) พร้อมรายการปัญหา</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">ขั้นที่ 3: สร้างไฟล์ (Generate)</p>
                <p>กดสร้าง ดาวน์โหลดไฟล์ ZIP อัตโนมัติ (encoding Windows-874 ตามมาตรฐาน สปส.)</p>
              </div>
            </div>
          </>
        ),
      },
      {
        id: 'ssop-export-history',
        title: 'ประวัติการส่งออก',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              แท็บ &quot;ประวัติ&quot; แสดงรายการไฟล์ที่เคยสร้างทั้งหมด พร้อมวันที่ เลขลำดับ จำนวน visit
              สามารถดาวน์โหลดซ้ำได้ (ระบบเก็บไฟล์ไว้ในฐานข้อมูล) ใช้ตรวจสอบย้อนหลัง
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'settings',
    title: 'ตั้งค่าระบบ',
    icon: Settings,
    subsections: [
      {
        id: 'set-users',
        title: 'จัดการผู้ใช้งาน',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">สิทธิ์: ADMIN ขึ้นไป</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              แสดงรายการผู้ใช้ทั้งหมด พร้อมชื่อ อีเมล บทบาท สถานะ วันที่เข้าสู่ระบบล่าสุด
              ADMIN สามารถ: เพิ่มผู้ใช้ใหม่, เปลี่ยนบทบาท, รีเซ็ตรหัสผ่าน (สร้างรหัสชั่วคราว),
              ปิด/เปิดใช้งานบัญชี, ลบ session ที่ค้าง
            </p>
          </>
        ),
      },
      {
        id: 'set-app-settings',
        title: 'ตั้งค่าระบบ (App Settings)',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              แสดงการตั้งค่าแบบจัดกลุ่ม: <strong className="text-foreground">hospital</strong> (รหัสโรงพยาบาล, HIS URL, API key),
              <strong className="text-foreground"> ssop</strong> (รหัสบัญชีดูแล)
              ADMIN ดูค่าได้แต่แก้ไขไม่ได้ (อ่านอย่างเดียว) ค่า sensitive เช่น API key จะแสดงเป็น ****
            </p>
          </>
        ),
      },
      {
        id: 'set-ai-settings',
        title: 'ตั้งค่า AI',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ตั้งค่าการใช้งาน AI: เปิด/ปิด AI, เลือก provider (Gemini/Claude/OpenAI), ตั้ง API key, เลือกโมเดล,
              ปรับ max_tokens/temperature ต้องตั้งค่าก่อนจึงจะใช้ฟีเจอร์ AI แนะนำโปรโตคอลได้
            </p>
          </>
        ),
      },
      {
        id: 'set-aipn-catalog',
        title: 'บัญชียา AIPN',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              รายการยา/เวชภัณฑ์ในบัญชียาหลัก สปส. (~1,200 รายการ) อ่านอย่างเดียว ค้นด้วยรหัสหรือชื่อ
              แสดงรหัส AIPN, TMT, ชื่อ, หมวด, อัตราเบิก ใช้ตรวจสอบรหัสยาสำหรับ SSOP Export
            </p>
          </>
        ),
      },
      {
        id: 'set-audit-logs',
        title: 'บันทึกกิจกรรม',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">สิทธิ์: ADMIN ขึ้นไป</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ระบบบันทึกทุกการเปลี่ยนแปลง (สร้าง/แก้ไข/ลบ) อัตโนมัติ แสดงวันเวลา ผู้ดำเนินการ ประเภท ทรัพยากร
              คลิกขยายเพื่อดู diff (ค่าก่อน/หลัง) ส่งออกเป็น CSV ได้
            </p>
          </>
        ),
      },
      {
        id: 'set-backup',
        title: 'สำรองข้อมูล',
        content: (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">สิทธิ์: ADMIN ขึ้นไป (ดาวน์โหลด)</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              แสดงจำนวนแถวในแต่ละตาราง กด &quot;ดาวน์โหลดสำรองข้อมูล&quot; สร้างไฟล์ .json.gz พร้อม checksum
              เลือกว่าจะรวม audit log หรือไม่ แนะนำให้สำรองเป็นประจำ (เช่น ทุกสัปดาห์)
            </p>
            <Tip>ส่วนกู้คืน (Restore) สงวนสิทธิ์เฉพาะ SUPER_ADMIN</Tip>
          </>
        ),
      },
    ],
  },
  {
    id: 'workflows',
    title: 'ขั้นตอนการทำงาน End-to-End',
    icon: Workflow,
    subsections: [
      {
        id: 'wf-new-patient-full',
        title: 'รับผู้ป่วยใหม่ครบวงจร',
        content: (
          <>
            <StepList steps={[
              'ลงทะเบียนผู้ป่วย — หน้าผู้ป่วยมะเร็ง > เพิ่มผู้ป่วย (หรือนำเข้าจาก HIS)',
              'เปิดเคสรักษา — หน้ารายละเอียดผู้ป่วย > เปิดเคส > เลือกตำแหน่ง/โปรโตคอล/โรงพยาบาล',
              'นำเข้าข้อมูล visit — จาก Excel/CSV หรือระบบ HIS',
              'วิเคราะห์โปรโตคอล — หน้าวิเคราะห์ > เลือกผู้ป่วย > ดูผล > ยืนยัน',
              'จัดการเบิกจ่าย — หน้ารายละเอียดผู้ป่วย > visit > เพิ่มรอบเบิก',
              'ส่งออก SSOP — ไปที่ /ssop-export > เลือก > ตรวจสอบ > สร้างไฟล์ ZIP',
            ]} />
          </>
        ),
      },
      {
        id: 'wf-import-analyze',
        title: 'นำเข้าและวิเคราะห์โปรโตคอล',
        content: (
          <>
            <StepList steps={[
              'เตรียมไฟล์ Excel/CSV ตามรูปแบบ (หรือเลือกนำเข้าจาก HIS)',
              'อัปโหลดที่หน้านำเข้าข้อมูล > ตรวจสอบ preview > ยืนยัน',
              'ไปหน้าวิเคราะห์โปรโตคอล > เลือก visit ใหม่',
              'ดูผลจับคู่ > ขอคำแนะนำ AI (ถ้าเปิดใช้) > ยืนยันโปรโตคอล',
            ]} />
            <Tip>แนะนำให้นำเข้าทีละชุดไม่ใหญ่เกิน และตรวจสอบข้อมูลก่อนยืนยัน</Tip>
          </>
        ),
      },
      {
        id: 'wf-ssop-billing',
        title: 'ส่งออกเบิกจ่าย SSOP',
        content: (
          <>
            <StepList steps={[
              'ตรวจสอบว่า visit มีข้อมูลเบิกจ่าย (VisitBillingItem) ครบถ้วน',
              'ไปที่ /ssop-export (พิมพ์ URL โดยตรง) > แท็บสร้างไฟล์ > เลือกช่วงวันที่',
              'เลือก visit ที่ต้องการ (checkbox)',
              'กด Preview — ตรวจสอบว่าผ่าน validate > แก้ไขข้อมูลที่มีปัญหา',
              'กด Generate — ดาวน์โหลด ZIP > ส่งให้ สปส. ผ่านช่องทางที่กำหนด',
            ]} />
            <Tip>เลขลำดับ (session number) จะถูกจ่ายต่อเนื่องอัตโนมัติโดยระบบ</Tip>
          </>
        ),
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'การแก้ไขปัญหาเบื้องต้น',
    icon: AlertTriangle,
    subsections: [
      {
        id: 'ts-login-issues',
        title: 'ปัญหาการเข้าสู่ระบบ',
        content: (
          <>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">ลืมรหัสผ่าน</p>
                <p>ติดต่อผู้ดูแลระบบ (ADMIN) เพื่อรีเซ็ตรหัสผ่าน</p>
              </div>
              <div>
                <p className="font-medium text-foreground">บัญชีถูกล็อก</p>
                <p>รอ 15 นาทีแล้วลองใหม่ หรือติดต่อผู้ดูแลระบบ</p>
              </div>
              <div>
                <p className="font-medium text-foreground">ถูก redirect กลับหน้า Login</p>
                <p>Session อาจหมดอายุ — refresh หน้า หรือ clear cookies แล้ว login ใหม่</p>
              </div>
              <div>
                <p className="font-medium text-foreground">ข้อความ &quot;session หมดอายุ&quot;</p>
                <p>เกิดจากไม่มีการใช้งาน 30 นาที — login ใหม่</p>
              </div>
            </div>
          </>
        ),
      },
      {
        id: 'ts-data-display',
        title: 'ปัญหาการแสดงข้อมูล',
        content: (
          <>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">ข้อมูลไม่อัปเดต</p>
                <p>Dashboard มี cache 5 นาที — รอหรือ refresh (Ctrl+R)</p>
              </div>
              <div>
                <p className="font-medium text-foreground">ตารางว่างเปล่า</p>
                <p>ตรวจสอบตัวกรอง (filter) ว่าไม่ได้กรองจนไม่เหลือข้อมูล ลอง clear filter</p>
              </div>
              <div>
                <p className="font-medium text-foreground">หน้าจอ error / ขาวเปล่า</p>
                <p>Refresh หน้า (Ctrl+R) หากยังไม่ได้ให้ clear browser cache</p>
              </div>
            </div>
          </>
        ),
      },
      {
        id: 'ts-import-issues',
        title: 'ปัญหาการนำเข้าข้อมูล',
        content: (
          <>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">ไฟล์อัปโหลดไม่ได้</p>
                <p>ตรวจสอบขนาดไฟล์ (สูงสุด 10 MB) และรูปแบบ (.csv/.xlsx เท่านั้น)</p>
              </div>
              <div>
                <p className="font-medium text-foreground">หัวคอลัมน์ไม่รู้จัก</p>
                <p>ตรวจสอบว่าหัวคอลัมน์ตรงตามรูปแบบ: HN, VN, วันที่, วินิจฉัยหลัก</p>
              </div>
              <div>
                <p className="font-medium text-foreground">ยาจับคู่ไม่ได้ (unresolved)</p>
                <p>ชื่อยาในไฟล์ไม่ตรงกับฐานข้อมูล — อาจต้องเพิ่มชื่อการค้าหรือตรวจสอบสะกด</p>
              </div>
              <div>
                <p className="font-medium text-foreground">HIS เชื่อมต่อไม่ได้</p>
                <p>ตรวจสอบ URL และ API key ในตั้งค่าระบบ</p>
              </div>
            </div>
          </>
        ),
      },
      {
        id: 'ts-ssop-issues',
        title: 'ปัญหาการส่งออก SSOP',
        content: (
          <>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Visit ไม่ผ่าน validation</p>
                <p>ดูรายการปัญหาใน preview — แก้ไขข้อมูลที่ขาด/ผิด เช่น ICD-10 รหัสโรงพยาบาล รหัส TMT</p>
              </div>
              <div>
                <p className="font-medium text-foreground">ไฟล์ดาวน์โหลดไม่ได้</p>
                <p>Refresh แล้วดาวน์โหลดซ้ำจากแท็บ &quot;ประวัติ&quot;</p>
              </div>
              <div>
                <p className="font-medium text-foreground">สกส. ปฏิเสธไฟล์</p>
                <p>ตรวจสอบรหัสโรงพยาบาลและบัญชีดูแลในตั้งค่าระบบ</p>
              </div>
            </div>
          </>
        ),
      },
      {
        id: 'ts-permission-issues',
        title: 'ปัญหาเรื่องสิทธิ์',
        content: (
          <>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">ไม่เห็นเมนูบางรายการ</p>
                <p>เมนูแสดงตามบทบาท — VIEWER เห็นน้อยกว่า EDITOR/ADMIN</p>
              </div>
              <div>
                <p className="font-medium text-foreground">กดปุ่มแก้ไข/เพิ่ม/ลบไม่ได้</p>
                <p>ต้องมีบทบาทอย่างน้อย EDITOR — ติดต่อผู้ดูแลเพื่อปรับบทบาท</p>
              </div>
            </div>
          </>
        ),
      },
    ],
  },
  {
    id: 'glossary',
    title: 'อภิธานศัพท์',
    icon: BookMarked,
    subsections: [
      {
        id: 'gl-medical-terms',
        title: 'ศัพท์ทางการแพทย์',
        content: (
          <>
            <div className="space-y-2 text-sm">
              {[
                ['ICD-10', 'รหัสวินิจฉัยโรคสากล (International Classification of Diseases)'],
                ['โปรโตคอล (Protocol)', 'แนวทางการรักษามาตรฐานที่กำหนดโดย สปส.'],
                ['สูตรยา (Regimen)', 'ชุดยาที่ใช้ร่วมกันในการรักษาตามโปรโตคอล'],
                ['ตำแหน่งมะเร็ง (Cancer Site)', 'อวัยวะหรือตำแหน่งที่เกิดมะเร็ง'],
                ['ระยะโรค (Stage)', 'การจำแนกความรุนแรงของมะเร็ง'],
                ['เคมีบำบัด (Chemotherapy)', 'การรักษาด้วยยาเคมีเพื่อทำลายเซลล์มะเร็ง'],
                ['ฮอร์โมนบำบัด (Hormonal)', 'การรักษาด้วยยาที่ส่งผลต่อฮอร์โมน'],
                ['เป้าหมายบำบัด (Targeted)', 'การรักษาด้วยยาที่มุ่งเป้าเซลล์มะเร็งโดยเฉพาะ'],
                ['ภูมิคุ้มกันบำบัด (Immunotherapy)', 'การรักษาด้วยยากระตุ้นระบบภูมิคุ้มกัน'],
                ['ยาประคับประคอง (Supportive)', 'ยาบรรเทาอาการข้างเคียงจากการรักษา'],
                ['OPD', 'ผู้ป่วยนอก (Out-Patient Department)'],
                ['HPI', 'ประวัติการเจ็บป่วยปัจจุบัน (History of Present Illness)'],
              ].map(([term, def]) => (
                <div key={term} className="flex gap-2">
                  <span className="font-medium text-foreground whitespace-nowrap min-w-[180px]">{term}</span>
                  <span className="text-muted-foreground">{def}</span>
                </div>
              ))}
            </div>
          </>
        ),
      },
      {
        id: 'gl-system-terms',
        title: 'ศัพท์เฉพาะของระบบ',
        content: (
          <>
            <div className="space-y-2 text-sm">
              {[
                ['HN (Hospital Number)', 'เลขประจำตัวผู้ป่วยของโรงพยาบาล'],
                ['VN (Visit Number)', 'เลขรับบริการ / เลข visit แต่ละครั้ง'],
                ['VCR Code', 'รหัสอนุมัติการรักษาจาก สปส.'],
                ['Case Number', 'เลขที่เคสการรักษามะเร็ง'],
                ['AIPN', 'รหัสยาและเวชภัณฑ์มาตรฐานของ สปส.'],
                ['TMT', 'รหัสยาแห่งชาติ (Thai Medicines Terminology)'],
                ['Drug Matching', 'การจับคู่ชื่อยาจากโรงพยาบาลกับฐานข้อมูลกลาง'],
                ['Protocol Matching', 'การเปรียบเทียบการรักษาจริงกับมาตรฐาน สปส.'],
                ['Score', 'คะแนนความสอดคล้องของ visit กับโปรโตคอล'],
              ].map(([term, def]) => (
                <div key={term} className="flex gap-2">
                  <span className="font-medium text-foreground whitespace-nowrap min-w-[180px]">{term}</span>
                  <span className="text-muted-foreground">{def}</span>
                </div>
              ))}
            </div>
          </>
        ),
      },
      {
        id: 'gl-sso-terms',
        title: 'ศัพท์ประกันสังคม',
        content: (
          <>
            <div className="space-y-2 text-sm">
              {[
                ['สปส. (SSO)', 'สำนักงานประกันสังคม'],
                ['สกส.', 'สำนักงานกลางสารสนเทศบริการสุขภาพ'],
                ['SSOP 0.93', 'รูปแบบไฟล์อิเล็กทรอนิกส์สำหรับเบิกจ่าย'],
                ['BILLTRAN', 'ข้อมูลรายการเบิก (ส่วนการเงิน)'],
                ['BILLDISP', 'ข้อมูลการจ่ายยา (ส่วนเภสัชกรรม)'],
                ['OPServices', 'ข้อมูลบริการและวินิจฉัย'],
                ['HIS', 'ระบบสารสนเทศโรงพยาบาล (Hospital Information System)'],
                ['PayPlan 80', 'แผนสิทธิ์มะเร็ง สปส.'],
                ['CareAccount', 'บัญชีดูแล (1=ทั่วไป, 9=เฉพาะทาง)'],
              ].map(([term, def]) => (
                <div key={term} className="flex gap-2">
                  <span className="font-medium text-foreground whitespace-nowrap min-w-[180px]">{term}</span>
                  <span className="text-muted-foreground">{def}</span>
                </div>
              ))}
            </div>
          </>
        ),
      },
    ],
  },
];

// ─── Main Component ─────────────────────────────────────────
export default function UserManualPage() {
  const [activeSection, setActiveSection] = useState('introduction');
  const [activeSubsection, setActiveSubsection] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['introduction']));
  const [searchQuery, setSearchQuery] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Toggle section expand in ToC
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Scroll to element
  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Handle hash on load
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      // Find which section contains this subsection
      for (const section of sections) {
        if (section.id === hash) {
          setExpandedSections((prev) => new Set([...prev, section.id]));
          setActiveSection(section.id);
          setTimeout(() => scrollToSection(hash), 100);
          break;
        }
        const sub = section.subsections.find((s) => s.id === hash);
        if (sub) {
          setExpandedSections((prev) => new Set([...prev, section.id]));
          setActiveSection(section.id);
          setActiveSubsection(sub.id);
          setTimeout(() => scrollToSection(hash), 100);
          break;
        }
      }
    }
  }, [scrollToSection]);

  // Intersection observer for active tracking
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            // Find parent section
            for (const section of sections) {
              if (section.id === id) {
                setActiveSection(id);
                setActiveSubsection('');
                break;
              }
              const sub = section.subsections.find((s) => s.id === id);
              if (sub) {
                setActiveSection(section.id);
                setActiveSubsection(sub.id);
                break;
              }
            }
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    // Observe all section and subsection headings
    const elements = document.querySelectorAll('[data-manual-section]');
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);

  // Back to top visibility
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter sections by search
  const filteredSections = searchQuery
    ? sections
        .map((section) => ({
          ...section,
          subsections: section.subsections.filter(
            (sub) =>
              sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              section.title.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
        }))
        .filter((section) => section.subsections.length > 0)
    : sections;

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              คู่มือใช้งาน
            </h1>
            <p className="text-xs text-muted-foreground">
              เวอร์ชัน {MANUAL_VERSION} — ปรับปรุงล่าสุด {MANUAL_DATE}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Table of Contents — Sidebar */}
        <aside
          className={cn(
            'hidden lg:block shrink-0 transition-all duration-200',
            tocOpen ? 'w-[280px]' : 'w-0 overflow-hidden',
          )}
        >
          <div className="sticky top-20">
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              {/* Search */}
              <div className="p-3 border-b border-border/50">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาหัวข้อ..."
                    className="w-full rounded-lg bg-background border border-border/60 py-2 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* ToC Items */}
              <nav className="p-2 max-h-[calc(100vh-220px)] overflow-y-auto">
                <ul className="space-y-0.5">
                  {filteredSections.map((section) => {
                    const Icon = section.icon;
                    const isExpanded = expandedSections.has(section.id);
                    const isActive = activeSection === section.id;

                    return (
                      <li key={section.id}>
                        <button
                          onClick={() => {
                            toggleSection(section.id);
                            scrollToSection(section.id);
                          }}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors',
                            isActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground',
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="flex-1 text-left truncate">{section.title}</span>
                          <ChevronDown
                            className={cn(
                              'h-3 w-3 shrink-0 transition-transform',
                              !isExpanded && '-rotate-90',
                            )}
                          />
                        </button>

                        {isExpanded && (
                          <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-border/40 pl-2">
                            {section.subsections.map((sub) => (
                              <li key={sub.id}>
                                <button
                                  onClick={() => scrollToSection(sub.id)}
                                  className={cn(
                                    'block w-full text-left rounded-md px-2 py-1.5 text-[11px] transition-colors',
                                    activeSubsection === sub.id
                                      ? 'text-primary font-medium bg-primary/5'
                                      : 'text-muted-foreground hover:text-foreground',
                                  )}
                                >
                                  {sub.title}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0" ref={contentRef}>
          <div className="space-y-12">
            {filteredSections.map((section) => {
              const Icon = section.icon;
              return (
                <section key={section.id} id={section.id} data-manual-section>
                  {/* Section heading */}
                  <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-primary/15">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-[18px] w-[18px] text-primary" />
                    </div>
                    <h2 className="font-heading text-xl font-bold text-foreground">
                      {section.title}
                    </h2>
                  </div>

                  {/* Subsections */}
                  <div className="space-y-8">
                    {section.subsections.map((sub) => (
                      <div
                        key={sub.id}
                        id={sub.id}
                        data-manual-section
                        className="scroll-mt-24"
                      >
                        <h3 className="font-heading text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 text-primary/60" />
                          {sub.title}
                        </h3>
                        <div className="pl-6">{sub.content}</div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-16 pt-6 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">
              SSO Cancer Care — คู่มือใช้งานเวอร์ชัน {MANUAL_VERSION}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              หากพบปัญหาหรือมีข้อสงสัย กรุณาติดต่อผู้ดูแลระบบ (ADMIN)
            </p>
          </div>
        </main>
      </div>

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary-hover transition-colors"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
