import React, { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/lib/api/users';
import { getAccessToken } from '@/stores/authStore';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

export const Route = createFileRoute('/(auth)/set-password')({
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, refreshUserData } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);

  useEffect(() => {
    if (!user) {
      navigate({ to: '/login', search: { redirect: '/dashboard' } });
      return;
    }
    if (profile?.password_set) {
      navigate({ to: '/dashboard' });
    }
  }, [user, profile, navigate]);

  useEffect(() => {
    if (!password) {
      setPasswordStrength(null);
      return;
    }
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    if (strength <= 2) setPasswordStrength('weak');
    else if (strength <= 4) setPasswordStrength('medium');
    else setPasswordStrength('strong');
  }, [password]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t('auth.setPasswordPage.errorMinLength', 'Password must be at least 8 characters'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.setPasswordPage.errorMismatch', 'Passwords do not match'));
      return;
    }
    if (passwordStrength === 'weak') {
      setError(t('auth.setPasswordPage.errorWeak', 'Password is too weak'));
      return;
    }
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const accessToken = getAccessToken();
      const response = await fetch(`${API_URL}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword: password }),
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: t('auth.setPasswordPage.errorUpdateFailed', 'Failed to update password') }));
        throw new Error(errorData.message || t('auth.setPasswordPage.errorUpdateFailed', 'Failed to update password'));
      }
      await usersApi.updateMe({ password_set: true });
      await refreshUserData();
      navigate({ to: '/dashboard' });
    } catch (err: unknown) {
      console.error('Error setting password:', err);
      setError(err instanceof Error ? err.message : t('auth.setPasswordPage.errorGeneric', 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.setPasswordPage.title', 'Choose your password')}
      subtitle={t('auth.setPasswordPage.eyebrow', 'First-time setup')}
      helperText={t(
        'auth.setPasswordPage.description',
        'Pick a strong password to secure your account. You won’t need the temporary one again.',
      )}
    >
      <form className="space-y-5" onSubmit={handleSetPassword}>
        <FormField
          label={t('auth.setPasswordPage.newPasswordLabel', 'New password')}
          htmlFor="password"
          required
        >
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.setPasswordPage.newPasswordPlaceholder', 'At least 8 characters')}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 pr-11 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-emerald-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {password && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full transition-all ${
                      passwordStrength === 'weak'
                        ? 'w-1/3 bg-red-500'
                        : passwordStrength === 'medium'
                          ? 'w-2/3 bg-amber-500'
                          : 'w-full bg-emerald-500'
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest ${
                    passwordStrength === 'weak'
                      ? 'text-red-600'
                      : passwordStrength === 'medium'
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                  }`}
                >
                  {passwordStrength === 'weak'
                    ? t('auth.setPasswordPage.strengthWeak', 'Weak')
                    : passwordStrength === 'medium'
                      ? t('auth.setPasswordPage.strengthMedium', 'Medium')
                      : t('auth.setPasswordPage.strengthStrong', 'Strong')}
                </span>
              </div>
              <ul className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs">
                <Req ok={password.length >= 8} label={t('auth.setPasswordPage.reqMinLength', 'At least 8 characters')} />
                <Req
                  ok={/[A-Z]/.test(password) && /[a-z]/.test(password)}
                  label={t('auth.setPasswordPage.reqUpperLower', 'Upper and lower case letters')}
                />
                <Req ok={/\d/.test(password)} label={t('auth.setPasswordPage.reqNumber', 'At least one number')} />
                <Req
                  ok={/[!@#$%^&*(),.?":{}|<>]/.test(password)}
                  label={t('auth.setPasswordPage.reqSpecial', 'At least one special character')}
                />
              </ul>
            </div>
          )}
        </FormField>

        <FormField
          label={t('auth.setPasswordPage.confirmPasswordLabel', 'Confirm password')}
          htmlFor="confirmPassword"
          required
        >
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth.setPasswordPage.confirmPasswordPlaceholder', 'Re-enter your password')}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 pr-11 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-emerald-600"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-red-600">
              <AlertCircle className="h-3 w-3" />
              {t('auth.setPasswordPage.mismatchInline', 'Passwords do not match')}
            </p>
          )}
        </FormField>

        {error && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !password || !confirmPassword || password !== confirmPassword}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-lime-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('auth.setPasswordPage.submitting', 'Saving…')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t('auth.setPasswordPage.submitButton', 'Set password')}
            </span>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}

function Req({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
      <CheckCircle className="h-3.5 w-3.5" />
      <span>{label}</span>
    </li>
  );
}
