'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'กรุณากรอกอีเมล')
    .email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z
    .string()
    .min(1, 'กรุณากรอกรหัสผ่าน'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [shakeError, setShakeError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values);
      toast.success('เข้าสู่ระบบสำเร็จ', {
        description: 'Welcome back!',
      });
      // Validate redirect param — only allow relative paths (prevent open redirect)
      const raw = searchParams.get('redirect') || '/';
      const redirect = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
      router.push(redirect);
    } catch (error: unknown) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 650);

      const apiError = error as { error?: { message?: string; code?: string } };
      if (apiError?.error?.code === 'ACCOUNT_LOCKED') {
        toast.error('บัญชีถูกล็อก', {
          description: 'กรุณาติดต่อผู้ดูแลระบบ',
        });
      } else if (apiError?.error?.code === 'INVALID_CREDENTIALS') {
        toast.error('อีเมลหรือรหัสผ่านไม่ถูกต้อง', {
          description: 'Invalid email or password',
        });
      } else {
        toast.error('เกิดข้อผิดพลาด', {
          description: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้',
        });
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn('space-y-5', shakeError && 'animate-shake')}
    >
      <div className="space-y-2">
        <Label htmlFor="email">อีเมล</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
          autoFocus
          disabled={isSubmitting}
          {...register('email')}
          className={cn(errors.email && 'border-destructive focus-visible:ring-destructive')}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">รหัสผ่าน</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isSubmitting}
            {...register('password')}
            className={cn(
              'pr-10',
              errors.password && 'border-destructive focus-visible:ring-destructive',
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            กำลังเข้าสู่ระบบ...
          </>
        ) : (
          'เข้าสู่ระบบ'
        )}
      </Button>
    </form>
  );
}
