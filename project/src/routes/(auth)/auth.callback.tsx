import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/button';

type AuthFlowType = 'signup' | 'invite' | 'recovery' | 'magiclink' | 'email_change' | 'unknown';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type OAuthCallbackResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: {
    id: string;
    email?: string;
  };
};

export const Route = createFileRoute('/(auth)/auth/callback')({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [flowType, setFlowType] = useState<AuthFlowType>('unknown');
  const [nextPath, setNextPath] = useState('/dashboard');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') ?? params.get('token_hash');
    const typeParam = params.get('type');
    const nextParam = params.get('next');

    const mappedType = mapAuthType(typeParam);
    const resolvedNext = sanitizeNext(nextParam, mappedType);

    setFlowType(mappedType);
    setNextPath(resolvedNext);

    if (!code) {
      setStatus('error');
      setError(t('auth.callbackPage.errorMissingCode'));
      return;
    }

    let isCancelled = false;
    let redirectTimer: number | undefined;

    const exchangeSession = async () => {
      const exchangeResult = await exchangeCodeForSessionViaApi(code, t);

      if (isCancelled) return;

      if (!exchangeResult.ok) {
        setError(exchangeResult.message);
        setStatus('error');
        return;
      }

      setStatus('ready');

      if (mappedType !== 'recovery') {
        redirectTimer = window.setTimeout(() => {
          window.location.href = resolvedNext;
        }, 1500);
      }
    };

    exchangeSession();

    return () => {
      isCancelled = true;
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [t]);

  useEffect(() => {
    if (passwordUpdated) {
      const timer = window.setTimeout(() => {
        window.location.href = nextPath;
      }, 1800);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [passwordUpdated, nextPath]);

  const handlePasswordUpdate = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);

    if (password.length < 8) {
      setPasswordError(t('auth.callbackPage.errorPasswordMinLength'));
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError(t('auth.callbackPage.errorPasswordMismatch'));
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { getAccessToken } = await import('@/stores/authStore');
      const token = getAccessToken();

      if (!token) {
        throw new Error(t('auth.callbackPage.errorSessionExpired'));
      }

      const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword: password }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }

      setPasswordUpdated(true);
    } catch (updateErr) {
      const message = updateErr instanceof Error ? updateErr.message : t('auth.callbackPage.errorPasswordUpdate');
      setPasswordError(message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-900">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-lg shadow-emerald-500/10 dark:border-gray-800 dark:bg-gray-950">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('auth.callbackPage.loadingTitle')}</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('auth.callbackPage.loadingMessage')}
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('auth.callbackPage.errorTitle')}</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {error ?? t('auth.callbackPage.errorDefault')}
              </p>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                window.location.href = '/login';
              }}
            >
              {t('auth.callbackPage.backToLogin')}
            </Button>
          </div>
        )}

        {status === 'ready' && flowType !== 'recovery' && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('auth.callbackPage.verifiedTitle')}</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('auth.callbackPage.verifiedMessage')}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                window.location.href = nextPath;
              }}
            >
              {t('auth.callbackPage.continueButton')}
            </Button>
          </div>
        )}

        {status === 'ready' && flowType === 'recovery' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('auth.callbackPage.recoveryTitle')}</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('auth.callbackPage.recoveryMessage')}
              </p>
            </div>

            {passwordError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                {passwordError}
              </div>
            )}

            {passwordUpdated ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('auth.callbackPage.updatedTitle')}</h2>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {t('auth.callbackPage.updatedMessage')}
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    window.location.href = nextPath;
                  }}
                >
                  {t('auth.callbackPage.continueButton')}
                </Button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handlePasswordUpdate}>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('auth.callbackPage.newPasswordLabel')}
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    required
                    minLength={8}
                    autoFocus
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t('auth.callbackPage.passwordPlaceholder')}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('auth.callbackPage.confirmPasswordLabel')}
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    required
                    minLength={8}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={t('auth.callbackPage.passwordPlaceholder')}
                    className="h-11"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isUpdatingPassword}>
                  {isUpdatingPassword ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('auth.callbackPage.updating')}
                    </span>
                  ) : (
                    t('auth.callbackPage.updateButton')
                  )}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

async function exchangeCodeForSessionViaApi(code: string, t: TFunction): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const data = await apiClient.post<OAuthCallbackResponse>('/api/v1/auth/oauth/callback', { code });

    if (!data?.access_token || !data?.refresh_token || !data?.expires_in) {
      return {
        ok: false,
        message: t('auth.callbackPage.errorInvalidOAuth'),
      };
    }

    useAuthStore.getState().setTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    });

    if (data.user?.id) {
      useAuthStore.getState().setUser({
        id: data.user.id,
        email: data.user.email ?? '',
      });
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : t('auth.callbackPage.errorVerifyLink');
    const fallbackMessage =
      message.includes('404') || message.includes('Not Found')
        ? t('auth.callbackPage.errorOAuthUnavailable')
        : message;

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/oauth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        const data = (await response.json()) as OAuthCallbackResponse;

        if (!data?.access_token || !data?.refresh_token || !data?.expires_in) {
          return {
            ok: false,
            message: t('auth.callbackPage.errorInvalidOAuth'),
          };
        }

        useAuthStore.getState().setTokens({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
        });

        if (data.user?.id) {
          useAuthStore.getState().setUser({
            id: data.user.id,
            email: data.user.email ?? '',
          });
        }

        return { ok: true };
      }
    } catch {
      /* oauth code exchange failed — fall through to error return */
    }

    return {
      ok: false,
      message: fallbackMessage || t('auth.callbackPage.errorVerifyLink'),
    };
  }
}

function mapAuthType(typeParam: string | null): AuthFlowType {
  switch (typeParam) {
    case 'signup':
      return 'signup';
    case 'invite':
      return 'invite';
    case 'recovery':
      return 'recovery';
    case 'magiclink':
      return 'magiclink';
    case 'email_change_current':
    case 'email_change_new':
      return 'email_change';
    default:
      return 'unknown';
  }
}

function sanitizeNext(nextParam: string | null, flowType: AuthFlowType): string {
  const fallback = flowType === 'recovery' ? '/dashboard' : '/dashboard';

  if (!nextParam) {
    return fallback;
  }

  if (!nextParam.startsWith('/')) {
    return fallback;
  }

  return nextParam;
}
