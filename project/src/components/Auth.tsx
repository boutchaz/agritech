import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, User } from 'lucide-react';
import { setupNewUser, checkUserNeedsOnboarding } from '../utils/authSetup';

interface AuthProps {
  onAuthSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              email_confirm: false
            }
          }
        });

        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            throw new Error('Un compte existe déjà avec cette adresse email');
          }
          if (signUpError.message.includes('Error sending confirmation email')) {
            // Try to sign in directly if email confirmation fails
            const { data: signInData } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (signInData?.user) {
              // Setup new user account
              await setupNewUser({
                userId: signInData.user.id,
                email: signInData.user.email!,
              });
              onAuthSuccess();
              return;
            }

            throw new Error('Inscription réussie mais l\'envoi d\'email a échoué. Essayez de vous connecter.');
          }
          throw signUpError;
        }

        if (data?.user) {
          // Setup new user with profile and organization
          const setupResult = await setupNewUser({
            userId: data.user.id,
            email: data.user.email!,
          });

          if (!setupResult.success) {
            console.error('User setup failed:', setupResult.error);
            setError('Compte créé mais configuration incomplète. Essayez de vous reconnecter.');
            return;
          }

          if (data.user.email_confirmed_at) {
            // Reload to refresh auth state after setup
            window.location.href = '/';
          } else {
            setError('Vérifiez votre email pour confirmer votre inscription');
          }
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('Email ou mot de passe incorrect');
          }
          throw signInError;
        }

        if (data?.user) {
          // Check if user needs onboarding (missing profile or organization)
          const needsOnboarding = await checkUserNeedsOnboarding(data.user.id);

          if (needsOnboarding) {
            console.log('User needs onboarding, setting up account...');
            await setupNewUser({
              userId: data.user.id,
              email: data.user.email!,
            });
          }

          onAuthSuccess();
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'authentification');
    } finally {
      setLoading(false);
    }
  };

  const getErrorClass = () => {
    if (!error) return '';
    return error.includes('Vérifiez votre email') 
      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
      : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Lock className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {isSignUp ? 'Créer un compte' : 'Connexion'}
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          {error && (
            <div className={`p-4 rounded-md ${getErrorClass()}`}>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Adresse email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  placeholder="Adresse email"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  placeholder="Mot de passe"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </span>
              ) : null}
              {isSignUp ? 'Créer un compte' : 'Se connecter'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-sm text-green-600 hover:text-green-500"
            >
              {isSignUp
                ? 'Déjà un compte ? Se connecter'
                : "Pas de compte ? S'inscrire"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;