'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Phone, MapPin, Building2, CreditCard, Hash } from 'lucide-react';

interface HisPatientSearchResult {
  hn: string;
  citizenId: string;
  titleName?: string;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  phoneNumber?: string;
  insuranceType?: string;
  mainHospitalCode?: string;
}

interface Props {
  patient: HisPatientSearchResult;
  existingPatientId: number | null;
}

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function HisPatientCard({ patient, existingPatientId }: Props) {
  return (
    <Card>
      <CardContent className="py-5 px-5">
        {/* Top: name + badges */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-foreground leading-tight">
                {patient.fullName}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {patient.gender && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {patient.gender === 'M' ? 'ชาย' : patient.gender === 'F' ? 'หญิง' : patient.gender}
                  </Badge>
                )}
                {patient.dateOfBirth && (
                  <span className="text-xs text-muted-foreground">
                    {calculateAge(patient.dateOfBirth)} ปี
                  </span>
                )}
              </div>
            </div>
          </div>
          {existingPatientId !== null && (
            <Badge variant="secondary" className="text-[10px] shrink-0 bg-primary/10 text-primary border-primary/20">
              มีในระบบแล้ว
            </Badge>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div>
              <span className="text-xs text-muted-foreground">HN </span>
              <span className="font-mono text-xs font-medium">{patient.hn}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div>
              <span className="text-xs text-muted-foreground">CID </span>
              <span className="font-mono text-xs font-medium">{patient.citizenId}</span>
            </div>
          </div>
          {patient.insuranceType && (
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground">สิทธิ </span>
                <span className="text-xs">{patient.insuranceType}</span>
              </div>
            </div>
          )}
          {patient.mainHospitalCode && (
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground">รพ.หลัก </span>
                <span className="font-mono text-xs">{patient.mainHospitalCode}</span>
              </div>
            </div>
          )}
          {patient.phoneNumber && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs">{patient.phoneNumber}</span>
            </div>
          )}
          {patient.address && (
            <div className="flex items-center gap-2 col-span-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground line-clamp-1">{patient.address}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
