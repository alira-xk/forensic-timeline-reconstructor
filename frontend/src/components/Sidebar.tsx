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
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <SettingsPopup visible={showSettings} onClose={() => setShowSettings(false)} anchorPosition={{ bottom: 80, left: 24 }} />

      {/* Header / Logo */}
      <View style={styles.header}>
        <AppLogo />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Navigation Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.text.muted }]}>NAVIGATION</Text>
          {navItems.map((item) => {
            const active = isActiveRoute(item.route);
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.route}
                style={[
                  styles.navItem,
                  active && { backgroundColor: `${theme.colors.primary}15` }
                ]}
                onPress={() => handleNavigation(item.route)}
                activeOpacity={0.7}
              >
                <Icon size={20} color={active ? theme.colors.primary : theme.colors.text.secondary} />
                <Text style={[
                  styles.navText,
                  { color: active ? theme.colors.primaryStrong : theme.colors.text.primary, fontWeight: active ? '700' : '500' }
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Global Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surfaceHighlight, borderColor: theme.colors.border }]}>
          <Text style={[styles.summaryTitle, { color: theme.colors.text.primary }]}>Workspace Summary</Text>
          {loading && cases.length === 0 ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 16 }} />
          ) : (
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Database size={16} color={theme.colors.accent} />
                <View style={styles.statContent}>
                  <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>{cases.length}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Total Cases</Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <FileText size={16} color={theme.colors.primary} />
                <View style={styles.statContent}>
                  <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>{files.length}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Evidence Files</Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <Activity size={16} color={theme.colors.status.success} />
                <View style={styles.statContent}>
                  <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>{timelineEvents.length}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Events</Text>
                </View>
              </View>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }} />
      </ScrollView>

      {/* Footer Area */}
      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <View style={styles.themeToggle}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isDark ? <Moon size={18} color={theme.colors.text.secondary} /> : <Sun size={18} color={theme.colors.text.secondary} />}
            <Text style={[styles.themeLabel, { color: theme.colors.text.secondary }]}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}44` }}
            thumbColor={isDark ? theme.colors.primary : '#fff'}
          />
        </View>

        <View
          style={[
            styles.userSection,
            {
              backgroundColor: theme.colors.surfaceHighlight,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.userIdentity}>
            <View style={[styles.avatar, { backgroundColor: `${theme.colors.primary}22` }]}>
              <User size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: theme.colors.text.primary }]} numberOfLines={1}>{displayName}</Text>
              <Text style={[styles.userRole, { color: theme.colors.text.secondary }]} numberOfLines={1}>Forensic Tech</Text>
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={handleSignOut}
            style={[
              styles.logoutBtn,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceRaised,
              },
            ]}
            activeOpacity={0.78}
          >
            <Text style={[styles.logoutText, { color: theme.colors.text.secondary }]}>
              Sign out
            </Text>
            <LogOut size={20} color={theme.colors.text.muted} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: 280, height: '100%', borderRightWidth: 1, zIndex: 10 },
  header: { padding: 24, paddingBottom: 16 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, paddingHorizontal: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 4 },
  navText: { fontSize: 15, marginLeft: 12 },
  summaryCard: { padding: 16, borderRadius: 16, borderWidth: 1 },
  summaryTitle: { fontSize: 13, fontWeight: '700', marginBottom: 16 },
  summaryStats: { gap: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statContent: { flex: 1 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 12 },
  footer: { padding: 16, borderTopWidth: 1 },
  themeToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, marginBottom: 8 },
  themeLabel: { fontSize: 14, fontWeight: '500', marginLeft: 12 },
  userSection: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  userIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 14, fontWeight: '700' },
  userRole: { fontSize: 12, marginTop: 2 },
  logoutBtn: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
