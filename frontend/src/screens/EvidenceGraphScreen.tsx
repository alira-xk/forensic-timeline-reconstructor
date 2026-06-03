import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { ArrowLeft, RefreshCcw } from 'lucide-react-native';

import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import {
  EvidenceGraphData,
  EvidenceGraphNode,
  GraphNodeType,
  getEvidenceGraphByCase,
} from '../services/timelineService';

type Props = NativeStackScreenProps<RootStackParamList, 'EvidenceGraph'>;

type PositionedNode = EvidenceGraphNode & {
  x: number;
  y: number;
};

const NODE_COLORS: Record<GraphNodeType, string> = {
  case: '#2457D6',
  file: '#0F9F8F',
  event: '#F59E0B',
  author: '#16A34A',
  gps: '#DC2626',
  timestamp: '#7C3AED',
};

const NODE_TYPES: GraphNodeType[] = ['case', 'file', 'event', 'author', 'gps', 'timestamp'];

const truncate = (value: string, max = 24) => {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}...`;
};

const layoutNodes = (nodes: EvidenceGraphNode[], width: number, height: number): PositionedNode[] => {
  const centerX = width / 2;
  const centerY = height / 2;
  const byType: Record<GraphNodeType, EvidenceGraphNode[]> = {
    case: [],
    file: [],
    event: [],
    author: [],
    gps: [],
    timestamp: [],
  };

  for (const node of nodes) {
    byType[node.type].push(node);
  }

  const layout: PositionedNode[] = [];
  const caseNode = byType.case[0];
  if (caseNode) {
    layout.push({ ...caseNode, x: centerX, y: centerY });
  }

  const rings: Array<{ type: GraphNodeType; radius: number }> = [
    { type: 'file', radius: 160 },
    { type: 'event', radius: 260 },
    { type: 'author', radius: 360 },
    { type: 'gps', radius: 450 },
    { type: 'timestamp', radius: 540 },
  ];

  for (const ring of rings) {
    const set = byType[ring.type];
    const total = set.length;
    if (!total) {
      continue;
    }

    set.forEach((node, index) => {
      const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
      const x = centerX + ring.radius * Math.cos(angle);
      const y = centerY + ring.radius * Math.sin(angle);
      layout.push({ ...node, x, y });
    });
  }

  return layout;
};

export const EvidenceGraphScreen: React.FC<Props> = ({ route, navigation }) => {
  const { caseId } = route.params;
  const { theme } = useTheme();

  const [graph, setGraph] = useState<EvidenceGraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Record<GraphNodeType, boolean>>({
    case: true,
    file: true,
    event: true,
    author: true,
    gps: true,
    timestamp: true,
  });

  const loadGraph = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      const data = await getEvidenceGraphByCase(caseId);
      setGraph(data);
      setSelectedNodeId(null);
    } catch (error: any) {
      Alert.alert('Graph Error', error.message || 'Failed to load relationship graph.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGraph(true);
    }, [caseId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGraph(false);
  };

  const canvasSize = useMemo(() => {
    const base = 1300;
    const extra = graph ? Math.min(500, Math.max(0, graph.nodes.length - 100) * 3) : 0;
    return { width: base + extra, height: base + extra };
  }, [graph]);

  const positionedNodes = useMemo(() => {
    if (!graph) {
      return [];
    }
    const filtered = graph.nodes.filter((node) => visibleTypes[node.type]);
    return layoutNodes(filtered, canvasSize.width, canvasSize.height);
  }, [graph, canvasSize.height, canvasSize.width, visibleTypes]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    for (const node of positionedNodes) {
      map.set(node.id, node);
    }
    return map;
  }, [positionedNodes]);

  const visibleLinks = useMemo(() => {
    if (!graph) {
      return [];
    }
    return graph.links.filter((link) => nodeMap.has(link.source) && nodeMap.has(link.target));
  }, [graph, nodeMap]);

  const selectedNeighborIds = useMemo(() => {
    if (!selectedNodeId) {
      return new Set<string>();
    }
    const neighbors = new Set<string>();
    for (const link of visibleLinks) {
      if (link.source === selectedNodeId) {
        neighbors.add(link.target);
      } else if (link.target === selectedNodeId) {
        neighbors.add(link.source);
      }
    }
    return neighbors;
  }, [selectedNodeId, visibleLinks]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) {
      return null;
    }
    return positionedNodes.find((node) => node.id === selectedNodeId) || null;
  }, [positionedNodes, selectedNodeId]);

  const toggleType = (type: GraphNodeType) => {
    setVisibleTypes((current) => {
      const next = { ...current, [type]: !current[type] };
      const hasAny = Object.values(next).some(Boolean);
      if (!hasAny) {
        return current;
      }
      return next;
    });
    setSelectedNodeId(null);
  };

  if (loading && !graph) {
    return (
      <ScreenWrapper withSidebar>
        <View style={[styles.centerState, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.centerText, { color: theme.colors.text.secondary }]}>
            Building relationship graph...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper withSidebar>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <ArrowLeft size={18} color={theme.colors.text.secondary} />
              <Text style={[styles.backText, { color: theme.colors.text.secondary }]}>Back to Case</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: theme.colors.border }]}
              onPress={() => loadGraph(true)}
              activeOpacity={0.85}
            >
              <RefreshCcw size={16} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: theme.colors.text.primary }]}>Evidence Relationship Graph</Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            Links case, files, extracted events, authors, GPS points, and timestamps.
          </Text>

          <View style={[styles.statsRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.stat, { color: theme.colors.text.secondary }]}>Files: {graph?.stats.files ?? 0}</Text>
            <Text style={[styles.stat, { color: theme.colors.text.secondary }]}>Events: {graph?.stats.events ?? 0}</Text>
            <Text style={[styles.stat, { color: theme.colors.text.secondary }]}>Nodes: {graph?.stats.nodes ?? 0}</Text>
            <Text style={[styles.stat, { color: theme.colors.text.secondary }]}>Links: {graph?.stats.links ?? 0}</Text>
          </View>

          <View style={styles.filterRow}>
            {NODE_TYPES.map((type) => {
              const active = visibleTypes[type];
              return (
                <Pressable
                  key={type}
                  onPress={() => toggleType(type)}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: active ? NODE_COLORS[type] : theme.colors.border,
                      backgroundColor: active ? `${NODE_COLORS[type]}20` : theme.colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      {
                        color: active ? NODE_COLORS[type] : theme.colors.text.secondary,
                      },
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selectedNode ? (
            <View style={[styles.focusCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.focusTitle, { color: theme.colors.text.primary }]}>
                Focus Node: {selectedNode.type}
              </Text>
              <Text style={[styles.focusLabel, { color: theme.colors.text.secondary }]}>{selectedNode.label}</Text>
            </View>
          ) : null}

          <View style={styles.legendRow}>
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <View key={type} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: color }]} />
                <Text style={[styles.legendText, { color: theme.colors.text.secondary }]}>{type}</Text>
              </View>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View
                style={[
                  styles.canvasShell,
                  {
                    width: canvasSize.width,
                    height: canvasSize.height,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
              >
                <Svg width={canvasSize.width} height={canvasSize.height}>
                  <Circle
                    cx={canvasSize.width / 2}
                    cy={canvasSize.height / 2}
                    r={160}
                    fill="none"
                    stroke={theme.colors.border}
                    strokeOpacity={0.35}
                    strokeWidth={1}
                  />
                  <Circle
                    cx={canvasSize.width / 2}
                    cy={canvasSize.height / 2}
                    r={260}
                    fill="none"
                    stroke={theme.colors.border}
                    strokeOpacity={0.2}
                    strokeWidth={1}
                  />
                  <Circle
                    cx={canvasSize.width / 2}
                    cy={canvasSize.height / 2}
                    r={360}
                    fill="none"
                    stroke={theme.colors.border}
                    strokeOpacity={0.15}
                    strokeWidth={1}
                  />

                  {visibleLinks.map((link, index) => {
                    const source = nodeMap.get(link.source);
                    const target = nodeMap.get(link.target);
                    if (!source || !target) {
                      return null;
                    }

                    const isSelectedPath =
                      !!selectedNodeId &&
                      (link.source === selectedNodeId ||
                        link.target === selectedNodeId ||
                        (selectedNeighborIds.has(link.source) && selectedNeighborIds.has(link.target)));

                    return (
                      <Line
                        key={`${link.source}-${link.target}-${index}`}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke={isSelectedPath ? theme.colors.primary : theme.colors.border}
                        strokeWidth={isSelectedPath ? 2 : 1}
                        strokeOpacity={selectedNodeId ? (isSelectedPath ? 0.9 : 0.2) : 0.55}
                      />
                    );
                  })}

                  {positionedNodes.map((node) => {
                    const color = NODE_COLORS[node.type] || theme.colors.primary;
                    const isSelected = selectedNodeId === node.id;
                    const isNeighbor = selectedNeighborIds.has(node.id);
                    const radius = node.type === 'case' ? 19 : node.type === 'event' ? 12 : 10;
                    const muted = selectedNodeId && !isSelected && !isNeighbor;
                    const opacity = muted ? 0.35 : 0.95;

                    return (
                      <G key={node.id} onPress={() => setSelectedNodeId(node.id)}>
                        {isSelected ? (
                          <Circle cx={node.x} cy={node.y} r={radius + 7} fill={color} fillOpacity={0.2} />
                        ) : null}
                        <Circle
                          cx={node.x}
                          cy={node.y}
                          r={radius}
                          fill={color}
                          fillOpacity={opacity}
                          stroke={isSelected ? '#FFFFFF' : color}
                          strokeWidth={isSelected ? 2 : 0}
                        />
                        <SvgText
                          x={node.x}
                          y={node.y + radius + 14}
                          fill={muted ? theme.colors.text.muted : theme.colors.text.primary}
                          fontSize={isSelected ? '12' : '11'}
                          textAnchor="middle"
                          fontWeight={isSelected ? '700' : '500'}
                        >
                          {truncate(node.label, isSelected ? 30 : 22)}
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>
              </View>
            </ScrollView>
          </ScrollView>
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 1400,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 5,
    marginBottom: 12,
  },
  statsRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  stat: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  focusCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  focusTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  focusLabel: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 12,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  canvasShell: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    marginTop: 10,
    fontSize: 14,
  },
});
