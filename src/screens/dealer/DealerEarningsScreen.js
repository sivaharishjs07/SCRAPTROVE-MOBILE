/**
 * DealerEarningsScreen — Shows the dealer's earnings summary and recent completed pickups.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';
import { getDealerAnalytics } from '../../services/api';

const C = {
  bg:      '#FFFFFF',
  green:   '#22C55E',
  greenMid:'#16A34A',
  mint:    '#F0FDF4',
  mintBdr: '#DCFCE7',
  text:    '#0A1628',
  sub:     '#6B7280',
  light:   '#9CA3AF',
  bdr:     '#E5E7EB',
  card:    '#FFFFFF',
  surface: '#F9FAFB',
};

const MATERIAL_ICON = {
  iron: '🔩', copper: '🔶', paper: '📰', plastic: '🧴',
  electronics: '📱', mixed: '♻️', aluminium: '🥫', brass: '🪙',
};

export default function DealerEarningsScreen({ navigation }) {
  const { language } = useApp();
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const res = await getDealerAnalytics();
      setStats(res?.data || null);
      setError('');
    } catch {
      setError(language === 'ta' ? 'தரவு ஏற்றுவதில் பிழை' : 'Could not load earnings data');
    }
  }, [language]);

  useEffect(() => {
    setLoading(true);
    fetchStats().finally(() => setLoading(false));
  }, [fetchStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const dateLabel = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    } catch { return iso; }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'ta' ? 'சம்பாத்தியம்' : 'Earnings'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.greenMid} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryText}>
              {language === 'ta' ? 'மீண்டும் முயற்சி' : 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.greenMid} />}
          contentContainerStyle={styles.scroll}
        >
          {/* Hero earnings card */}
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>
              {language === 'ta' ? 'மொத்த சம்பாத்தியம்' : 'Total Earnings'}
            </Text>
            <Text style={styles.heroAmount}>₹{fmt(stats?.earnings)}</Text>
            <Text style={styles.heroSub}>
              {language === 'ta' ? 'முடிக்கப்பட்ட பிக்கப்களிலிருந்து' : 'From completed pickups'}
            </Text>

            <View style={styles.heroStats}>
              {[
                {
                  value: stats?.todayPickups || 0,
                  label: language === 'ta' ? 'இன்று' : 'Today',
                },
                {
                  value: stats?.weekPickups || 0,
                  label: language === 'ta' ? '7 நாட்கள்' : '7 Days',
                },
                {
                  value: stats?.completed || 0,
                  label: language === 'ta' ? 'மொத்தம்' : 'All Time',
                },
              ].map((s, i) => (
                <View key={i} style={styles.heroStatCell}>
                  <Text style={styles.heroStatValue}>{s.value}</Text>
                  <Text style={styles.heroStatLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Rating */}
          <View style={styles.ratingCard}>
            <Text style={styles.ratingEmoji}>⭐</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.ratingTitle}>
                {language === 'ta' ? 'மதிப்பீடு' : 'Your Rating'}
              </Text>
              <Text style={styles.ratingValue}>{(stats?.rating || 4.5).toFixed(1)} / 5.0</Text>
            </View>
            <Text style={styles.ratingBadge}>
              {(stats?.rating || 4.5) >= 4.5 ? '🏆 Top Rated' : (stats?.rating || 0) >= 4.0 ? '✅ Good' : '📈 Improving'}
            </Text>
          </View>

          {/* Recent pickups */}
          <Text style={styles.sectionTitle}>
            {language === 'ta' ? 'சமீபத்திய பிக்கப்கள்' : 'Recent Pickups'}
          </Text>

          {(stats?.recentOrders || []).length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>📭</Text>
              <Text style={styles.emptyTitle}>
                {language === 'ta' ? 'இன்னும் எந்த முடிக்கப்பட்ட ஆர்டரும் இல்லை' : 'No completed pickups yet'}
              </Text>
              <Text style={styles.emptySub}>
                {language === 'ta'
                  ? 'முடிக்கப்பட்ட ஆர்டர்கள் இங்கு காட்டப்படும்'
                  : 'Completed orders will appear here'}
              </Text>
            </View>
          ) : (
            (stats?.recentOrders || []).map((order, i) => {
              const matKey = String(order.material || '').toLowerCase();
              const icon = MATERIAL_ICON[matKey] || '♻️';
              return (
                <View key={order.id || i} style={styles.orderCard}>
                  <View style={styles.orderIconWrap}>
                    <Text style={{ fontSize: 22 }}>{icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderRef}>{order.order_ref || `#${order.id}`}</Text>
                    <Text style={styles.orderDetail}>
                      {order.material || 'Mixed'} · {order.estimated_weight || '—'}
                    </Text>
                    <Text style={styles.orderSeller}>
                      📍 {order.seller_name || 'Seller'}{order.city ? `, ${order.city}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.orderAmount}>
                      {order.amount_paid ? `₹${fmt(order.amount_paid)}` : '—'}
                    </Text>
                    <Text style={styles.orderDate}>{dateLabel(order.completed_at)}</Text>
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.bdr,
  },
  backBtn:     { width: 36, height: 36, justifyContent: 'center' },
  backText:    { fontFamily: FONTS.bold, fontSize: 22, color: C.greenMid },
  headerTitle: { fontFamily: FONTS.extraBold, fontSize: 17, color: C.text },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontFamily: FONTS.medium, fontSize: 14, color: '#EF4444', textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: C.greenMid, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { fontFamily: FONTS.bold, fontSize: 14, color: '#fff' },

  scroll: { padding: 16 },

  heroCard: {
    backgroundColor: C.greenMid, borderRadius: 22, padding: 20, marginBottom: 14,
    shadowColor: C.greenMid, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  heroLabel:  { fontFamily: FONTS.semiBold, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  heroAmount: { fontFamily: FONTS.black, fontSize: 38, color: '#FFFFFF', marginBottom: 4 },
  heroSub:    { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 18 },
  heroStats:  { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 14 },
  heroStatCell:  { flex: 1, alignItems: 'center' },
  heroStatValue: { fontFamily: FONTS.black, fontSize: 22, color: '#FFFFFF' },
  heroStatLabel: { fontFamily: FONTS.medium, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  ratingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.bdr, marginBottom: 24,
  },
  ratingEmoji: { fontSize: 28 },
  ratingTitle: { fontFamily: FONTS.semiBold, fontSize: 12, color: C.sub },
  ratingValue: { fontFamily: FONTS.black, fontSize: 18, color: C.text },
  ratingBadge: { fontFamily: FONTS.bold, fontSize: 11, color: C.greenMid },

  sectionTitle: { fontFamily: FONTS.extraBold, fontSize: 16, color: C.text, marginBottom: 14 },

  emptyCard: {
    backgroundColor: C.mint, borderRadius: 16, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: C.mintBdr,
  },
  emptyTitle: { fontFamily: FONTS.extraBold, fontSize: 15, color: C.text, textAlign: 'center', marginBottom: 8 },
  emptySub:   { fontFamily: FONTS.regular, fontSize: 13, color: C.sub, textAlign: 'center' },

  orderCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.bdr,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  orderIconWrap: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: C.mint,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.mintBdr,
  },
  orderRef:    { fontFamily: FONTS.extraBold, fontSize: 13, color: C.text },
  orderDetail: { fontFamily: FONTS.regular, fontSize: 12, color: C.sub, marginTop: 2 },
  orderSeller: { fontFamily: FONTS.regular, fontSize: 11, color: C.light, marginTop: 2 },
  orderAmount: { fontFamily: FONTS.black, fontSize: 15, color: C.greenMid },
  orderDate:   { fontFamily: FONTS.regular, fontSize: 11, color: C.light, marginTop: 2 },
});
