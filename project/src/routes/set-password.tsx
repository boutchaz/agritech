import React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, Leaf, Shield } from 'lucide-react';
import { authSupabase } from '../lib/auth-supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Label } from '../components/ui/label';

export const Route = createFileRoute('/set-password')({
  component: SetPasswordPage,
});

function SetPasswordPage() {
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
    // Check if user needs to set password
    if (!user) {
      navigate({ to: '/login' });
      return;
    }

    // If password is already set, redirect to dashboard
    if (profile?.password_set) {
      navigate({ to: '/dashboard' });
    }
  }, [user, profile, navigate]);

  useEffect(() => {
    // Calculate password strength
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

    // Validation
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordStrength === 'weak') {
      setError('Veuillez choisir un mot de passe plus fort');
      return;
    }

    setLoading(true);

    try {
      // Update user password
      const { error: updateError } = await authSupabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      // Mark password as set in user profile
      await authSupabase
        .from('user_profiles')
        .upsert({
          id: user!.id,
          password_set: true,
          updated_at: new Date().toISOString(),
        });

      // Refresh user data to update the profile in the auth context
      await refreshUserData();

      // Redirect to dashboard
      navigate({ to: '/dashboard' });
    } catch (err: any) {
      console.error('Error setting password:', err);
      setError(err.message || 'Une erreur est survenue lors de la configuration du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-lg">
        {/* Logo/Brand */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="p-3 bg-green-600 rounded-2xl shadow-lg">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              AgriTech
            </h1>
          </div>
        </div>

        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Définir votre mot de passe
            </CardTitle>
            <CardDescription className="text-center">
              Créez un mot de passe sécurisé pour protéger votre compte
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSetPassword} className="space-y-5">
              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Nouveau mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez votre mot de passe"
                    className="pr-12 h-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            passwordStrength === 'weak'
                              ? 'w-1/3 bg-red-500'
                              : passwordStrength === 'medium'
                              ? 'w-2/3 bg-yellow-500'
                              : 'w-full bg-green-500'
                          }`}
                        />
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          passwordStrength === 'weak'
                            ? 'text-red-600 dark:text-red-400'
                            : passwordStrength === 'medium'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {passwordStrength === 'weak'
                          ? 'Faible'
                          : passwordStrength === 'medium'
                          ? 'Moyen'
                          : 'Fort'}
                      </span>
                    </div>

                    {/* Password Requirements */}
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Exigences :</p>
                      <div className="grid gap-1.5">
                        <div className={`flex items-center gap-2 text-xs ${password.length >= 8 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Au moins 8 caractères</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Lettres majuscules et minuscules</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${/\d/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Au moins un chiffre</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Caractère spécial (optionnel, renforce la sécurité)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmer le mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmez votre mot de passe"
                    className="pr-12 h-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Les mots de passe ne correspondent pas
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium shadow-lg shadow-green-600/20"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Configuration en cours...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Définir le mot de passe
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center border-t pt-6">
            <p className="text-xs text-muted-foreground text-center">
              Vous serez redirigé vers le tableau de bord après avoir défini votre mot de passe
            </p>
          </CardFooter>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 AgriTech Platform. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
