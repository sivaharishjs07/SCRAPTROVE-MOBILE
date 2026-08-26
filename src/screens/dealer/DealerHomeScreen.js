import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';
import { getDealerOrders, updateDealerStatus, getDealerAnalytics } from '../../services/api';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      '#FFFFFF',
  green:   '#22C55E',
  greenDk: '#15803D',
  greenMid:'#16A34A',
  mint:    '#F0FDF4',
  mintBdr: '#DCFCE7',
  text:    '#0A1628',
  sub:     '#6B7280',
  light:   '#9CA3AF',
  bdr:     '#E5E7EB',
  card:    '#FFFFFF',
  red:     '#EF4444',
  redBg:   '#FEF2F2',
  redBdr:  '#FECACA',
};

const BENEFITS = [
  { icon: '🚚', title: 'Priority route matching', sub: 'Jobs sorted by distance every morning' },
  { icon: '⚖️', title: 'Digital weigh tracking',  sub: 'Every kg logged — no disputes' },
  { icon: '💰', title: 'Instant UPI settlement',  sub: 'Paid within 24 hrs of completion' },
  { icon: '⭐', title: 'Reputation score',         sub: 'Higher score = more high-value jobs' },
];

export default function DealerHomeScreen({ navigation }) {
  const { language, user, isOnline, setIsOnline } = useApp();
  const [incomingOrders, setIncomingOrders]   = useState([]);
  const [analytics, setAnalytics]             = useState({ todayPickups: 0, collected: 0, sellers: 0 });
  const [totalEarnings, setTotalEarnings]     = useState(0);
  const [refreshing, setRefreshing]           = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase();

  // Load orders + analytics on mount
  useEffect(() => {
    onRefresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isOnline && incomingOrders.length > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.02, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isOnline, incomingOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [ordersRes, analyticsRes] = await Promise.all([getDealerOrders(), getDealerAnalytics()]);
      if (ordersRes?.data?.orders) {
        const pending = ordersRes.data.orders
          .filter(o => o.status === 'pending')
          .map(o => ({
            ...o,
            material:      o.material || (o.items?.[0]?.name) || 'Mixed',
            material_ta:   o.material_ta || o.material || 'மிக்ஸட்',
            estimatedQty:  o.estimated_weight || '—',
            locationText:  o.address ? o.address.slice(0, 30) : '—',
            distance:      o.distance || '—',
            eta:           o.eta || '—',
          }));
        setIncomingOrders(pending);
      }
      if (analyticsRes?.data) {
        setAnalytics(analyticsRes.data);
        if (analyticsRes.data.earnings) setTotalEarnings(analyticsRes.data.earnings);
      }
    } catch {}
    setRefreshing(false);
  }, []);

  const toggleOnline = async () => {
    const next = !isOnline;
    setIsOnline(next);
    try { await updateDealerStatus(next); } catch {}
  };

  const initials = (user?.name || 'DL').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.greenMid} />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.dealerLabel}>
                {(language === 'ta' ? 'டீலர் · சென்னை' : 'DEALER · CHENNAI')}
              </Text>
              <Text style={styles.dealerName}>{user?.name || 'Dealer'}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.onlineToggle, isOnline ? styles.onlineToggleOn : styles.onlineToggleOff]}
            onPress={toggleOnline}
          >
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? C.green : C.red }]} />
            <Text style={[styles.onlineText, { color: isOnline ? C.greenMid : C.red }]}>
              {isOnline
                ? (language === 'ta' ? 'ஆன்லைன்' : 'Online')
                : (language === 'ta' ? 'ஆஃப்லைன்' : 'Offline')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats hero card (green) ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroCircle} />

          {/* Top row: date + rating label */}
          <View style={styles.heroTopRow}>
            <Text style={styles.heroDate}>{today}</Text>
            <Text style={styles.heroRatingLabel}>{language === 'ta' ? 'மதிப்பு' : 'RATING'}</Text>
          </View>

          {/* Earnings */}
          <Text style={styles.heroEarnings}>₹{totalEarnings.toLocaleString('en-IN')}</Text>
          <Text style={styles.heroEarningsSub}>
            {language === 'ta' ? 'வருவாய் · 6 வாரங்களில் தொடங்கும்' : 'Earnings · launch in 6 weeks'}
          </Text>

          {/* Mini stats */}
          <View style={styles.heroStats}>
            {[
              { value: analytics.todayPickups, label: language === 'ta' ? 'பிக்கப்' : 'Pickups' },
              { value: `${analytics.collected || 0} kg`, label: language === 'ta' ? 'சேகரித்தது' : 'Collected' },
              { value: analytics.sellers || 0, label: language === 'ta' ? 'விற்பனையாளர்கள்' : 'Sellers' },
            ].map((s, i) => (
              <View key={i} style={styles.heroStatCell}>
                <Text style={styles.heroStatValue}>{s.value}</Text>
                <Text style={styles.heroStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Pickup queue ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {language === 'ta' ? 'பிக்கப் வரிசை' : 'Pickup queue'}
              </Text>
              <Text style={styles.sectionSub}>
                {language === 'ta' ? 'நாங்கள் தொடங்கும் நாள் வேலைகள் நேரடியாகும்' : 'Jobs go live the day we launch'}
              </Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.historyLink}>
                {language === 'ta' ? 'வரலாறு →' : 'History →'}
              </Text>
            </TouchableOpacity>
          </View>

          {!isOnline ? (
            // Offline state
            <TouchableOpacity style={styles.goOnlineCard} onPress={toggleOnline}>
              <Text style={{ fontSize: 32, marginBottom: 10 }}>📡</Text>
              <Text style={styles.goOnlineTitle}>
                {language === 'ta' ? 'ஆர்டர்கள் பெற ஆன்லைன் ஆகுங்கள்' : 'Go online to receive orders'}
              </Text>
              <View style={styles.goOnlineBtn}>
                <Text style={styles.goOnlineBtnText}>
                  ⚡ {language === 'ta' ? 'ஆன்லைன் ஆகு' : 'Go Online'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : incomingOrders.length === 0 ? (
            // Empty state
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48, marginBottom: 14 }}>📭</Text>
              <Text style={styles.emptyTitle}>
                {language === 'ta' ? 'இன்னும் எந்த வேலையும் இல்லை' : 'No jobs assigned yet'}
              </Text>
              <Text style={styles.emptySub}>
                {language === 'ta'
                  ? 'ஒவ்வொரு ஷிப்டு காலையிலும் உங்கள் வழியில் புதிய புக்கிங்குகள் தோன்றும்.'
                  : "You'll see new bookings here the morning of every shift, sorted by your route."}
              </Text>

              {/* Example card */}
              <View style={styles.exampleCard}>
                <View style={styles.exampleBadge}>
                  <Text style={styles.exampleBadgeText}>EXAMPLE</Text>
                </View>
                <View style={styles.exampleLeft}>
                  <Text style={{ fontSize: 24 }}>📰</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exampleTitle}>
                    {language === 'ta' ? 'செய்தித்தாள் · 8 கி.கி. தோராயமாக' : 'Newspaper · 8 kg approx.'}
                  </Text>
                  <Text style={styles.exampleSub}>📍 Anna Nagar · 1.2 km · 10:30 AM</Text>
                </View>
              </View>
            </View>
          ) : (
            // Order cards
            incomingOrders.map(order => (
              <Animated.View key={order.id} style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={styles.orderCard}
                  onPress={() => navigation.navigate('IncomingOrder', { order })}
                  activeOpacity={0.88}
                >
                  <View style={styles.orderCardTop}>
                    <View>
                      <Text style={styles.orderMaterial}>
                        {language === 'ta' ? order.material_ta : order.material}
                      </Text>
                      <Text style={styles.orderQty}>{order.estimatedQty}</Text>
                    </View>
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  </View>
                  <Text style={styles.orderLocation}>📍 {order.locationText} · {order.distance} km · ETA {order.eta} min</Text>
                  <View style={styles.orderActions}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => navigation.navigate('IncomingOrder', { order })}
                    >
                      <Text style={styles.acceptBtnText}>
                        ✓ {language === 'ta' ? 'ஏற்றுக்கொள்' : 'Accept'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.declineBtn}>
                      <Text style={styles.declineBtnText}>
                        ✕ {language === 'ta' ? 'மறு' : 'Decline'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </View>

        {/* ── Dealer benefits ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'ta' ? 'Scrap Trove உடன் டீலர் நன்மைகள்' : 'Dealer benefits by Scrap Trove'}
          </Text>
          {BENEFITS.map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Text style={{ fontSize: 20 }}>{b.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitSub}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },

  // Header
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: C.mint, borderWidth: 1, borderColor: C.mintBdr, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FONTS.extraBold, fontSize: 16, color: C.greenMid },
  dealerLabel:{ fontFamily: FONTS.bold, fontSize: 10, color: C.greenMid, textTransform: 'uppercase', letterSpacing: 0.8 },
  dealerName: { fontFamily: FONTS.black, fontSize: 18, color: C.text },
  onlineToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  onlineToggleOn:  { backgroundColor: C.mint, borderColor: C.mintBdr },
  onlineToggleOff: { backgroundColor: C.redBg, borderColor: C.redBdr },
  onlineDot:  { width: 7, height: 7, borderRadius: 4 },
  onlineText: { fontFamily: FONTS.bold, fontSize: 12 },

  // Hero card
  heroCard: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: C.greenMid,
    borderRadius: 22, padding: 20, overflow: 'hidden',
    shadowColor: C.greenMid, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  heroCircle: { position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.07)' },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heroDate:         { fontFamily: FONTS.bold, fontSize: 11, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.8 },
  heroRatingLabel:  { fontFamily: FONTS.bold, fontSize: 11, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.8 },
  heroEarnings:     { fontFamily: FONTS.black, fontSize: 36, color: '#FFFFFF', marginBottom: 4 },
  heroEarningsSub:  { fontFamily: FONTS.medium, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 18 },
  heroStats:        { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 14 },
  heroStatCell:     { flex: 1, alignItems: 'center' },
  heroStatValue:    { fontFamily: FONTS.black, fontSize: 20, color: '#FFFFFF' },
  heroStatLabel:    { fontFamily: FONTS.medium, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  // Section
  section:       { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  sectionTitle:  { fontFamily: FONTS.extraBold, fontSize: 17, color: C.text },
  sectionSub:    { fontFamily: FONTS.regular, fontSize: 12, color: C.sub, marginTop: 2 },
  historyLink:   { fontFamily: FONTS.bold, fontSize: 13, color: C.greenMid, marginTop: 2 },

  // Go online card
  goOnlineCard: {
    backgroundColor: C.mint, borderRadius: 16, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: C.mintBdr,
  },
  goOnlineTitle: { fontFamily: FONTS.bold, fontSize: 15, color: C.text, marginBottom: 16, textAlign: 'center' },
  goOnlineBtn:   { backgroundColor: C.greenMid, borderRadius: 50, paddingHorizontal: 24, paddingVertical: 12 },
  goOnlineBtnText:{ fontFamily: FONTS.extraBold, fontSize: 14, color: '#FFFFFF' },

  // Empty state
  emptyState: { backgroundColor: C.mint, borderRadius: 16, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: C.mintBdr },
  emptyTitle: { fontFamily: FONTS.extraBold, fontSize: 16, color: C.text, marginBottom: 8, textAlign: 'center' },
  emptySub:   { fontFamily: FONTS.regular, fontSize: 13, color: C.sub, textAlign: 'center', lineHeight: 20, marginBottom: 18 },

  // Example card
  exampleCard: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.bdr, position: 'relative',
  },
  exampleBadge: {
    position: 'absolute', top: -8, right: 10,
    backgroundColor: '#F97316', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
  },
  exampleBadgeText: { fontFamily: FONTS.extraBold, fontSize: 9, color: '#FFFFFF', letterSpacing: 0.5 },
  exampleLeft:   { width: 36, height: 36, borderRadius: 10, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  exampleTitle:  { fontFamily: FONTS.bold, fontSize: 13, color: C.text },
  exampleSub:    { fontFamily: FONTS.regular, fontSize: 11, color: C.sub, marginTop: 2 },

  // Order card
  orderCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: C.mintBdr,
    shadowColor: C.greenMid, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  orderCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  orderMaterial: { fontFamily: FONTS.black, fontSize: 18, color: C.text },
  orderQty:      { fontFamily: FONTS.medium, fontSize: 13, color: C.sub, marginTop: 2 },
  newBadge:      { backgroundColor: C.mint, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.mintBdr },
  newBadgeText:  { fontFamily: FONTS.extraBold, fontSize: 10, color: C.greenMid },
  orderLocation: { fontFamily: FONTS.medium, fontSize: 12, color: C.sub, marginBottom: 14 },
  orderActions:  { flexDirection: 'row', gap: 10 },
  acceptBtn: { flex: 1, backgroundColor: C.greenMid, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  acceptBtnText: { fontFamily: FONTS.extraBold, fontSize: 13, color: '#FFFFFF' },
  declineBtn: { flex: 1, backgroundColor: C.bg, borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: C.bdr },
  declineBtnText: { fontFamily: FONTS.extraBold, fontSize: 13, color: C.sub },

  // Benefits
  benefitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: C.card, borderRadius: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.bdr,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  benefitIcon:  { width: 42, height: 42, borderRadius: 13, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.mintBdr },
  benefitTitle: { fontFamily: FONTS.extraBold, fontSize: 14, color: C.text },
  benefitSub:   { fontFamily: FONTS.regular, fontSize: 12, color: C.sub, marginTop: 2 },
});
