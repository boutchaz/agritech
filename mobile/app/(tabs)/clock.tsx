import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, spacing, borderRadius, fontSize, shadows } from '@/constants/theme';

type ClockStatus = 'clocked_out' | 'clocked_in';

interface TimeEntry {
  id: string;
  clockIn: Date;
  clockOut?: Date;
  location: string;
}

export default function ClockScreen() {
  const [status, setStatus] = useState<ClockStatus>('clocked_out');
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [location, setLocation] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'clocked_in' && currentEntry) {
      interval = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - currentEntry.clockIn.getTime()) / 1000
        );
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, currentEntry]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for clock-in');
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const locationStr = address
        ? `${address.name || ''}, ${address.city || ''}`
        : `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`;

      setLocation(locationStr);
      return locationStr;
    } catch (error) {
      console.error('Location error:', error);
      return 'Unknown location';
    } finally {
      setIsLocating(false);
    }
  };

  const handleClockIn = async () => {
    const loc = await getCurrentLocation();
    if (!loc) return;

    const entry: TimeEntry = {
      id: Date.now().toString(),
      clockIn: new Date(),
      location: loc,
    };

    setCurrentEntry(entry);
    setStatus('clocked_in');
    setElapsedTime(0);
  };

  const handleClockOut = () => {
    Alert.alert(
      'Clock Out',
      'Are you sure you want to clock out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clock Out',
          style: 'destructive',
          onPress: () => {
            setStatus('clocked_out');
            setCurrentEntry(null);
            setElapsedTime(0);
          },
        },
      ]
    );
  };

  const todayHours = 4.5;
  const weekHours = 32;

  return (
    <View style={styles.container}>
      <View style={styles.clockCard}>
        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: status === 'clocked_in' ? colors.primary[500] : colors.gray[300] },
            ]}
          />
          <Text style={styles.statusText}>
            {status === 'clocked_in' ? 'Currently Working' : 'Not Clocked In'}
          </Text>
        </View>

        <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>

        {location && status === 'clocked_in' && (
          <View style={styles.locationInfo}>
            <Ionicons name="location" size={16} color={colors.gray[500]} />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.clockButton,
            status === 'clocked_in' ? styles.clockOutButton : styles.clockInButton,
          ]}
          onPress={status === 'clocked_in' ? handleClockOut : handleClockIn}
          disabled={isLocating}
        >
          {isLocating ? (
            <Text style={styles.clockButtonText}>Getting Location...</Text>
          ) : (
            <>
              <Ionicons
                name={status === 'clocked_in' ? 'stop-circle' : 'play-circle'}
                size={28}
                color={colors.white}
              />
              <Text style={styles.clockButtonText}>
                {status === 'clocked_in' ? 'Clock Out' : 'Clock In'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Time Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="today" size={24} color={colors.primary[600]} />
            <Text style={styles.statValue}>{todayHours}h</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color={colors.blue[600]} />
            <Text style={styles.statValue}>{weekHours}h</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
        </View>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Entries</Text>
        <View style={styles.entryCard}>
          <View style={styles.entryRow}>
            <Text style={styles.entryDate}>Today</Text>
            <Text style={styles.entryHours}>4.5 hours</Text>
          </View>
          <View style={styles.entryTimes}>
            <Text style={styles.entryTime}>08:00 - 12:30</Text>
            <View style={styles.entryLocation}>
              <Ionicons name="location-outline" size={12} color={colors.gray[400]} />
              <Text style={styles.entryLocationText}>Farm A, Main Field</Text>
            </View>
          </View>
        </View>
        <View style={styles.entryCard}>
          <View style={styles.entryRow}>
            <Text style={styles.entryDate}>Yesterday</Text>
            <Text style={styles.entryHours}>8 hours</Text>
          </View>
          <View style={styles.entryTimes}>
            <Text style={styles.entryTime}>08:00 - 17:00</Text>
            <View style={styles.entryLocation}>
              <Ionicons name="location-outline" size={12} color={colors.gray[400]} />
              <Text style={styles.entryLocationText}>Farm A, Greenhouse</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
    padding: spacing.md,
  },
  clockCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    fontWeight: '500',
  },
  timer: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.gray[900],
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.md,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginLeft: spacing.xs,
  },
  clockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    minWidth: 180,
  },
  clockInButton: {
    backgroundColor: colors.primary[600],
  },
  clockOutButton: {
    backgroundColor: colors.red[600],
  },
  clockButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  statsSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: -spacing.xs,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
    ...shadows.sm,
  },
  statValue: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  recentSection: {
    marginTop: spacing.lg,
  },
  entryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  entryDate: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  entryHours: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.primary[600],
  },
  entryTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryTime: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  entryLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryLocationText: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    marginLeft: spacing.xs,
  },
});
