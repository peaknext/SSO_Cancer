'use client';

import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — teal gradient (60%) */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/5" />
          <div className="absolute top-1/3 right-12 h-64 w-64 rounded-full bg-white/5" />
          <div className="absolute bottom-12 left-1/4 h-48 w-48 rounded-full bg-white/5" />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
                </svg>
              </div>
              <span className="font-heading text-lg font-semibold tracking-tight">
                SSO Cancer Care
              </span>
            </div>
          </div>

          <div className="max-w-lg">
            <h1 className="font-heading text-4xl font-bold leading-tight mb-4">
              ระบบจัดการโปรโตคอล
              <br />
              รักษามะเร็ง
            </h1>
            <p className="text-lg text-teal-100 leading-relaxed mb-8">
              Cancer Treatment Protocol Management System
            </p>
            <div className="flex flex-col gap-3 text-sm text-teal-200">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  </svg>
                </div>
                <span>จัดการข้อมูลโปรโตคอลรักษามะเร็งตามมาตรฐาน สปส.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="m9 12 2 2 4-4" />
                    <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
                  </svg>
                </div>
                <span>ครอบคลุม 23 ตำแหน่งมะเร็ง และสูตรยาเคมีบำบัด</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <span>รองรับการจัดการสิทธิ์ผู้ใช้งานหลายระดับ</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-teal-300/60">
            สำนักงานประกันสังคม — Social Security Office
          </div>
        </div>
      </div>

      {/* Right panel — login form (40%) */}
      <div className="flex w-full lg:w-[40%] items-center justify-center bg-background p-6 sm:p-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
              </svg>
            </div>
            <span className="font-heading text-lg font-semibold">SSO Cancer Care</span>
          </div>

          <div className="mb-8">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              เข้าสู่ระบบ
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your account
            </p>
          </div>

          <Suspense fallback={<div className="h-[260px]" />}>
            <LoginForm />
          </Suspense>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            หากลืมรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </div>
      </div>
    </div>
  );
}
