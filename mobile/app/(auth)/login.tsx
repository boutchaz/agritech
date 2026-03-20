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
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const router = useRouter();

  const signIn = useAuthStore((s) => s.signIn);
  const authenticateWithBiometric = useAuthStore((s) => s.authenticateWithBiometric);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authenticatedHome = '/(drawer)/(tabs)' as Href;

  useEffect(() => {
    if (isAuthenticated) {
      console.log('[Login] User authenticated, redirecting to tabs...');
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
        Alert.alert('Biometric Failed', 'Please use your email and password.');
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

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

     setIsSubmitting(true);
     try {
       console.log('[Login] Attempting sign in...');
       await signIn(email.trim().toLowerCase(), password.trim());
       console.log('[Login] Sign in successful, navigating...');
       router.replace(authenticatedHome);
    } catch (error) {
      console.error('[Login] Sign in failed:', error);
      const message = error instanceof Error ? error.message : 'Login failed';
      Alert.alert('Login Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  }

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
            <Text style={styles.title}>AgroGina</Text>
            <Text style={styles.subtitle}>Agricultural Operations Mobile App</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={colors.gray[400]}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.gray[400]}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.gray[400]}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.gray[400]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCorrect={false}
                autoCapitalize="none"
                editable={!isSubmitting}
              />
              <TouchableOpacity
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

            <TouchableOpacity
              style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {hasBiometric && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                disabled={isSubmitting}
              >
                <Ionicons
                  name="finger-print"
                  size={24}
                  color={colors.white}
                />
                <Text style={styles.biometricText}>Use Biometric</Text>
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
