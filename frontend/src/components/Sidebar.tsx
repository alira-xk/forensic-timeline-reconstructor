import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import {
  Activity,
  Database,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Moon,
  Server,
  Sun,
  User,
} from 'lucide-react-native';

import { useTheme } from '../theme/ThemeContext';
import { SettingsPopup } from './SettingsPopup';
import { AppLogo } from './AppLogo';
import { useAuth } from '../auth/AuthContext';
import { getCases, CaseItem } from '../services/caseService';
import { getFilesByCase, EvidenceFile } from '../services/fileService';
import { getTimelineByCase, TimelineEvent } from '../services/timelineService';
import { confirmDialog } from '../utils/confirm';

export const Sidebar: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute();

  const [showSettings, setShowSettings] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [cases, setCases] = React.useState<CaseItem[]>([]);
  const [files, setFiles] = React.useState<EvidenceFile[]>([]);
  const [timelineEvents, setTimelineEvents] = React.useState<TimelineEvent[]>([]);

  const loggedInUser = user as any;

  const displayName =
    loggedInUser?.name ||
    loggedInUser?.fullName ||
    loggedInUser?.username ||
    loggedInUser?.email?.split('@')[0] ||
    'Investigator';

  const displayEmail = loggedInUser?.email || 'Logged in user';

  const navItems = [
    { label: 'Overview', icon: LayoutDashboard, route: 'Dashboard' },
    { label: 'Cases', icon: FolderOpen, route: 'CasesList' },
    { label: 'Timeline', icon: Activity, route: 'Timeline' },
  ];

  const loadSidebarSummary = async () => {
    try {
      setLoading(true);
      const casesData = await getCases();
      const fileResults = await Promise.all(casesData.map((c) => getFilesByCase(c._id)));
      const timelineResults = await Promise.all(casesData.map((c) => getTimelineByCase(c._id)));
      setCases(casesData);
      setFiles(fileResults.flat());
      setTimelineEvents(timelineResults.flat());
    } catch {
      // Background retry silently
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(React.useCallback(() => { loadSidebarSummary(); }, []));

  const processedFiles = files.filter((f) => f.status === 'processed').length;

  const handleNavigation = (targetRoute: string) => {
    if (targetRoute === 'Dashboard') {
        navigation.navigate('Main', { screen: 'Dashboard' }); return;
    }
    if (targetRoute === 'CasesList') {
        navigation.navigate('Main', { screen: 'CasesList' }); return;
    }
    if (targetRoute === 'Timeline') {
      const latestCase = cases[0];
      if (latestCase) {
        navigation.navigate('Timeline', { caseId: latestCase._id });
      } else {
        navigation.navigate('Main', { screen: 'Timeline' });
      }
      return;
    }
    navigation.navigate(targetRoute);
  };

  const handleSignOut = async () => {
    const confirmed = await confirmDialog(
      'Sign out?',
      'You will need to log in again to access your forensic workspace.',
      { confirmLabel: 'Sign out', destructive: false }
    );

    if (confirmed) {
      await signOut();
    }
  };

  const isActiveRoute = (t: string) => route.name === t;

  return (
    <View style={[styles.container, { backgroundColor: theme.dark ? '#080d16' : '#0b1423', borderColor: '#223049' }]}>
      <SettingsPopup visible={showSettings} onClose={() => setShowSettings(false)} anchorPosition={{ bottom: 80, left: 24 }} />

      {/* Header / Logo */}
      <View style={styles.header}>
        <AppLogo size={38} />
        <Text style={styles.brandName}>Forensic Timeline</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Navigation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Workspace</Text>
          {navItems.map((item) => {
            const active = isActiveRoute(item.route);
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.route}
                style={[
                  styles.navItem,
                  active && { backgroundColor: '#2159d5' }
                ]}
                onPress={() => handleNavigation(item.route)}
                activeOpacity={0.7}
              >
                <Icon size={19} color={active ? '#ffffff' : '#9eacc1'} />
                <Text style={[
                  styles.navText,
                  { color: active ? '#ffffff' : '#d5ddea', fontWeight: active ? '700' : '600' }
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Global Summary */}
        <View style={[styles.summaryCard, { backgroundColor: '#111d2f', borderColor: '#26354a' }]}>
          <View style={styles.summaryHeading}>
            <Text style={styles.summaryTitle}>Workspace</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>
          {loading && cases.length === 0 ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 16 }} />
          ) : (
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Database size={15} color="#4fd1c5" />
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{cases.length}</Text>
                  <Text style={styles.statLabel}>Total Cases</Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <FileText size={15} color="#75a0ff" />
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{files.length}</Text>
                  <Text style={styles.statLabel}>Evidence Files</Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <Activity size={15} color="#49c986" />
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{timelineEvents.length}</Text>
                  <Text style={styles.statLabel}>Events</Text>
                </View>
              </View>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }} />
      </ScrollView>

      {/* Footer Area */}
      <View style={[styles.footer, { borderTopColor: '#223049' }]}>
        <View style={styles.themeToggle}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isDark ? <Moon size={17} color="#9eacc1" /> : <Sun size={17} color="#9eacc1" />}
            <Text style={styles.themeLabel}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#2c3a50', true: '#2857a7' }}
            thumbColor={isDark ? theme.colors.primary : '#fff'}
          />
        </View>

        <View
          style={[
            styles.userSection,
            {
              backgroundColor: '#111d2f',
              borderColor: '#26354a',
            },
          ]}
        >
          <View style={styles.userIdentity}>
            <View style={[styles.avatar, { backgroundColor: '#2159d5' }]}>
              <User size={19} color="#ffffff" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.userRole} numberOfLines={1}>Investigator</Text>
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={handleSignOut}
            style={[
              styles.logoutBtn,
              {
                borderColor: '#30415a',
                backgroundColor: 'transparent',
              },
            ]}
            activeOpacity={0.78}
          >
            <Text style={styles.logoutText}>
              Sign out
            </Text>
            <LogOut size={18} color="#9eacc1" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: 252, height: '100%', borderRightWidth: 1, zIndex: 10 },
  header: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 22, flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandName: { color: '#f5f8fc', fontSize: 17, fontWeight: '800' },
  scrollContent: { paddingHorizontal: 14, paddingBottom: 22, flexGrow: 1 },
  section: { marginBottom: 26 },
  sectionLabel: { color: '#718097', fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, paddingHorizontal: 10 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, minHeight: 46, borderRadius: 7, marginBottom: 5 },
  navText: { fontSize: 14, marginLeft: 12 },
  summaryCard: { padding: 15, borderRadius: 8, borderWidth: 1 },
  summaryHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  summaryTitle: { color: '#f3f6fb', fontSize: 12, fontWeight: '800' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3ddc84' },
  onlineText: { color: '#9eacc1', fontSize: 10, fontWeight: '600' },
  summaryStats: { gap: 13 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statContent: { flex: 1 },
  statValue: { color: '#f3f6fb', fontSize: 14, fontWeight: '800' },
  statLabel: { color: '#9eacc1', fontSize: 11 },
  footer: { padding: 14, borderTopWidth: 1 },
  themeToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 9, marginBottom: 7 },
  themeLabel: { color: '#b4c0d0', fontSize: 13, fontWeight: '600', marginLeft: 10 },
  userSection: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  userIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { color: '#f3f6fb', fontSize: 13, fontWeight: '800' },
  userRole: { color: '#9eacc1', fontSize: 11, marginTop: 2 },
  logoutBtn: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  logoutText: {
    color: '#d5ddea',
    fontSize: 12,
    fontWeight: '700',
  },
});
