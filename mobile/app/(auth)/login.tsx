import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const { t } = useTranslation(['common', 'auth']);
  const router = useRouter();

  const signIn = useAuthStore((s) => s.signIn);
  const authenticateWithBiometric = useAuthStore((s) => s.authenticateWithBiometric);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authenticatedHome = '/(drawer)/(tabs)' as Href;
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(authenticatedHome);
    }
  }, [authenticatedHome, isAuthenticated, router]);

  const handleBiometricLogin = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const success = await authenticateWithBiometric();
      if (success) {
        router.replace(authenticatedHome);
      } else {
        Alert.alert(
          t('login.biometricFailed', { ns: 'auth', defaultValue: 'Biometric Failed' }),
          t('login.biometricFallback', { ns: 'auth', defaultValue: 'Please use your email and password.' }),
        );
      }
    } catch (error) {
      console.error('Biometric error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [authenticateWithBiometric, authenticatedHome, router]);

  const checkBiometric = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setHasBiometric(hasHardware && isEnrolled && biometricEnabled);

    if (hasHardware && isEnrolled && biometricEnabled) {
      await handleBiometricLogin();
    }
  }, [biometricEnabled, handleBiometricLogin]);

  useEffect(() => {
    void checkBiometric();
  }, [checkBiometric]);

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      await signIn(data.email.trim().toLowerCase(), data.password.trim());
      router.replace(authenticatedHome);
    } catch (error) {
      console.error('[Login] Sign in failed:', error);
      const message = error instanceof Error ? error.message : 'Login failed';
      Alert.alert(t('login.failedTitle', { ns: 'auth', defaultValue: 'Login Failed' }), message);
    } finally {
      setIsSubmitting(false);
    }
  });

  const loginButtonLabel = isSubmitting
    ? t('login.submitting', { ns: 'auth', defaultValue: 'Signing in...' })
    : t('login.submit', { ns: 'auth', defaultValue: 'Sign In' });
  const biometricButtonLabel = t('login.useBiometric', { ns: 'auth', defaultValue: 'Use Biometric' });

  return (
    <LinearGradient
      colors={[colors.primary[600], colors.primary[800]]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="leaf" size={48} color={colors.white} />
            </View>
            <Text style={styles.title}>{t('app.name', 'AgroGina')}</Text>
            <Text style={styles.subtitle}>
              {t('login.subtitle', { ns: 'auth', defaultValue: 'Agricultural Operations Mobile App' })}
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              name="email"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={colors.gray[400]}
                      style={styles.inputIcon}
                    />
                     <TextInput
                       style={styles.input}
                       accessibilityLabel={t('login.email', { ns: 'auth', defaultValue: 'Email' })}
                       placeholder={t('login.email', { ns: 'auth', defaultValue: 'Email' })}
                       placeholderTextColor={colors.gray[400]}
                       value={value}
                       onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      editable={!isSubmitting}
                    />
                  </View>
                  {errors.email ? <Text style={styles.fieldError}>{errors.email.message}</Text> : null}
                </>
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={colors.gray[400]}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      accessibilityLabel={t('login.password', { ns: 'auth', defaultValue: 'Password' })}
                       placeholder={t('login.password', { ns: 'auth', defaultValue: 'Password' })}
                      placeholderTextColor={colors.gray[400]}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                      autoCorrect={false}
                      autoCapitalize="none"
                      editable={!isSubmitting}
                    />
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword
                          ? t('login.hidePassword', { ns: 'auth', defaultValue: 'Hide password' })
                          : t('login.showPassword', { ns: 'auth', defaultValue: 'Show password' })
                      }
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color={colors.gray[400]}
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.password ? <Text style={styles.fieldError}>{errors.password.message}</Text> : null}
                </>
              )}
            />

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={loginButtonLabel}
              style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
              onPress={onSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                 <Text style={styles.loginButtonText}>{t('login.submit', { ns: 'auth', defaultValue: 'Sign In' })}</Text>
              )}
            </TouchableOpacity>

            {hasBiometric && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={biometricButtonLabel}
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                disabled={isSubmitting}
              >
                <Ionicons
                  name="finger-print"
                  size={24}
                  color={colors.white}
                />
                 <Text style={styles.biometricText}>{t('login.useBiometric', { ns: 'auth', defaultValue: 'Use Biometric' })}</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.version}>v1.0.0</Text>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: 'rgba(255,255,255,0.8)',
  },
  form: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.gray[900],
  },
  fieldError: {
    color: colors.red[600],
    fontSize: fontSize.xs,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  eyeIcon: {
    padding: spacing.xs,
  },
  loginButton: {
    backgroundColor: colors.primary[600],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  biometricText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  version: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing['2xl'],
    fontSize: fontSize.sm,
  },
});
