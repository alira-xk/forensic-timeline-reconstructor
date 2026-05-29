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

      const fileResults = await Promise.all(
        casesData.map((caseItem) => getFilesByCase(caseItem._id))
      );

      const timelineResults = await Promise.all(
        casesData.map((caseItem) => getTimelineByCase(caseItem._id))
      );

      setCases(casesData);
      setFiles(fileResults.flat());
      setTimelineEvents(timelineResults.flat());
    } catch {
      // Keep sidebar quiet if backend is temporarily unavailable.
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadSidebarSummary();
    }, [])
  );

  const processedFiles = files.filter((file) => file.status === 'processed').length;
  const pendingFiles = files.filter((file) => file.status === 'pending').length;
  const failedFiles = files.filter((file) => file.status === 'failed').length;

 const handleNavigation = (targetRoute: string) => {
  if (targetRoute === 'Dashboard') {
    navigation.navigate('Main', {
      screen: 'Dashboard',
    });
    return;
  }

  if (targetRoute === 'CasesList') {
    navigation.navigate('Main', {
      screen: 'CasesList',
    });
    return;
  }

  if (targetRoute === 'Timeline') {
    const latestCase = cases[0];

    if (latestCase) {
      navigation.navigate('Timeline', { caseId: latestCase._id });
    } else {
      navigation.navigate('Main', {
        screen: 'Timeline',
      });
    }

    return;
  }

  navigation.navigate(targetRoute);
};

  const handleLogout = async () => {
    await signOut();
  };
  
const isActiveRoute = (targetRoute: string) => {
  if (targetRoute === 'Dashboard') {
    return route.name === 'Dashboard';
  }

  if (targetRoute === 'CasesList') {
    return route.name === 'CasesList';
  }

  if (targetRoute === 'Timeline') {
    return route.name === 'Timeline';
  }

  return route.name === targetRoute;
};
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderRightColor: theme.colors.border,
        },
      ]}
    >
      <SettingsPopup
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        anchorPosition={{ bottom: 90, left: 24 }}
      />

      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <AppLogo size={32} />
        </View>

        <View>
          <Text style={[styles.brandTitle, { color: theme.colors.text.primary }]}>
            Forensic
          </Text>
          <Text style={[styles.brandSubtitle, { color: theme.colors.text.secondary }]}>
            Timeline
          </Text>
        </View>
      </View>

      <View style={styles.navContainer}>
        {navItems.map((item) => {
          const active = isActiveRoute(item.route);
          const Icon = item.icon;

          return (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.navItem,
                {
                  backgroundColor: active
                    ? theme.colors.surfaceHighlight
                    : 'transparent',
                },
              ]}
              onPress={() => handleNavigation(item.route)}
              activeOpacity={0.8}
            >
              <Icon
                size={20}
                color={active ? theme.colors.primary : theme.colors.text.secondary}
              />

              <Text
                style={[
                  styles.navLabel,
                  {
                    color: active ? theme.colors.primary : theme.colors.text.secondary,
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.middleScroll}
        contentContainerStyle={styles.middleContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statsWidget, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.statsTitle, { color: theme.colors.text.muted }]}>
            Case Summary
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
                Loading...
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
                  Total Cases
                </Text>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {cases.length}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
                  Evidence Files
                </Text>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {files.length}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
                  Timeline Events
                </Text>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {timelineEvents.length}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.colors.text.muted }]}>
                  Processed
                </Text>
                <Text style={[styles.statValueSmall, { color: theme.colors.status.success }]}>
                  {processedFiles}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.colors.text.muted }]}>
                  Pending
                </Text>
                <Text style={[styles.statValueSmall, { color: theme.colors.status.warning }]}>
                  {pendingFiles}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.colors.text.muted }]}>
                  Failed
                </Text>
                <Text style={[styles.statValueSmall, { color: theme.colors.status.error }]}>
                  {failedFiles}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={[styles.systemWidget, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.statsTitle, { color: theme.colors.text.muted }]}>
            System Status
          </Text>

          <View style={styles.systemRow}>
            <Server size={14} color={theme.colors.status.success} />
            <Text style={[styles.systemLabel, { color: theme.colors.text.secondary }]}>
              Backend Active
            </Text>
          </View>

          <View style={styles.systemRow}>
            <Database size={14} color={theme.colors.status.success} />
            <Text style={[styles.systemLabel, { color: theme.colors.text.secondary }]}>
              MongoDB Connected
            </Text>
          </View>

          <View style={styles.systemRow}>
            <FileText size={14} color={theme.colors.status.success} />
            <Text style={[styles.systemLabel, { color: theme.colors.text.secondary }]}>
              Extractor Ready
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <View style={[styles.themeToggle, { borderColor: theme.colors.border }]}>
          <View style={styles.themeToggleLeft}>
            {isDark ? (
              <Moon size={15} color={theme.colors.primary} />
            ) : (
              <Sun size={15} color={theme.colors.primary} />
            )}
            <Text style={[styles.themeToggleText, { color: theme.colors.text.primary }]}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>

          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        <TouchableOpacity
          style={styles.profileItem}
          onPress={() => setShowSettings(true)}
          activeOpacity={0.85}
        >
          <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceHighlight }]}>
            <User size={16} color={theme.colors.primary} />
          </View>

          <View style={styles.profileText}>
            <Text
              numberOfLines={1}
              style={[styles.userName, { color: theme.colors.text.primary }]}
            >
              {displayName}
            </Text>

            <Text
              numberOfLines={1}
              style={[styles.userEmail, { color: theme.colors.text.muted }]}
            >
              {displayEmail}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: theme.colors.border }]}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <LogOut size={15} color={theme.colors.status.error} />
          <Text style={[styles.logoutText, { color: theme.colors.status.error }]}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 268,
    height: '100%',
    borderRightWidth: 1,
    paddingVertical: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 28,
  },
  logoBadge: {
    marginRight: 14,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 20,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 18,
  },
  navContainer: {
    paddingHorizontal: 18,
    gap: 4,
    marginBottom: 18,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    marginLeft: 12,
  },
  middleScroll: {
    flex: 1,
  },
  middleContent: {
    paddingBottom: 16,
  },
  statsWidget: {
    marginHorizontal: 18,
    borderRadius: 6,
    padding: 14,
  },
  systemWidget: {
    marginHorizontal: 18,
    marginTop: 10,
    borderRadius: 6,
    padding: 14,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 12,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 11,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  statValueSmall: {
    fontSize: 12,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    marginTop: 2,
    marginBottom: 12,
  },
  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 10,
  },
  systemLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    marginHorizontal: 18,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  themeToggle: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 6,
    paddingLeft: 12,
    paddingRight: 8,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '900',
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileText: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 11,
    marginTop: 2,
  },
  logoutButton: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '900',
  },
});
