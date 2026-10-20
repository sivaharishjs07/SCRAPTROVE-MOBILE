import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';
import { getSellerOrders, getScrapRates } from '../../services/api';
import ProductIconChip from '../../components/ProductIconChip';

// ─── Design tokens (white + green) ────────────────────────────────────────────
const C = {
  bg:       '#FFFFFF',
  green:    '#22C55E',
  greenDk:  '#15803D',
  greenMid: '#16A34A',
  mint:     '#F0FDF4',
  mintBdr:  '#DCFCE7',
  text:     '#0A1628',
  sub:      '#6B7280',
  light:    '#9CA3AF',
  bdr:      '#E5E7EB',
  card:     '#FFFFFF',
};

// How-it-works steps. Each entry has both English and Tamil copy so we can
// render whichever the user has selected without touching translations.js.
const STEPS = [
  {
    icon:    '📋',
    title:   'Tell us what you have',
    desc:    'Pick scrap categories — newspaper, metal, e-waste, mixed',
    title_ta:'உங்களிடம் உள்ளதை சொல்லுங்கள்',
    desc_ta: 'ஸ்கிராப் வகைகளை தேர்ந்தெடுங்கள் — செய்தித்தாள், உலோகம், மின்னணு, கலவை',
  },
  {
    icon:    '⚖️',
    title:   'Our trained team at your door',
    desc:    'Calibrated digital scale, you watch every kilo land',
    title_ta:'எங்கள் பயிற்சி பெற்ற குழு உங்கள் வீட்டிற்கே',
    desc_ta: 'சரியான டிஜிட்டல் தராசு, ஒவ்வொரு கிலோவையும் நீங்களே பாருங்கள்',
  },
  {
    icon:    '💰',
    title:   'Get paid on the spot',
    desc:    'UPI or cash — the moment we weigh, you earn',
    title_ta:'இடத்திலேயே பணம் பெறுங்கள்',
    desc_ta: 'UPI அல்லது ரொக்கம் — நாங்கள் எடை போட்டவுடன் பணம் உங்கள் கையில்',
  },
];

export default function SellerHomeScreen({ navigation }) {
  const { language, user, activeOrder } = useApp();
  const [rates, setRates] = useState([]);
  const [totalPickups, setTotalPickups] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const hour = new Date().getHours();
  const greetLabel =
    hour < 12 ? (language === 'ta' ? 'காலை வணக்கம்' : 'Good morning')
    : hour < 17 ? (language === 'ta' ? 'மாலை வணக்கம்' : 'Good afternoon')
    : (language === 'ta' ? 'இரவு வணக்கம்' : 'Good evening');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [ratesRes, ordersRes] = await Promise.all([getScrapRates(), getSellerOrders()]);
      // Backend returns a plain array from /api/market-prices
      const ratesData = Array.isArray(ratesRes?.data) ? ratesRes.data : [];
      if (ratesData.length > 0) {
        // Keep icon_url — that's the photo uploaded in admin → Market
        // Prices, and it's what the chip shows in preference to an icon.
        setRates(ratesData.map(r => ({
          name:     r.name    || '',
          name_ta:  r.name_ta || r.name || '',
          cat:      r.cat     || '',
          price:    r.market_price ?? r.p1 ?? 0,
          unit:     r.unit    || 'kg',
          emoji:    r.icon    || '♻️',
          icon_url: r.icon_url || null,
        })));
      }
      // GET /api/orders/seller returns a PLAIN ARRAY. This used to read
      // `data.orders`, which never exists, so Pickups and Earned were
      // permanently stuck at zero while the Pickups tab showed the real
      // figures. Accept both shapes so it can't silently break again.
      const ordersData = Array.isArray(ordersRes?.data)
        ? ordersRes.data
        : (ordersRes?.data?.orders || []);
      {
        const done = ordersData.filter(o => o.status === 'completed');
        setTotalPickups(done.length);
        // Only money actually handed over counts as earned. est_max is an
        // upper estimate, not a payment, so it must never be summed here.
        setTotalEarned(done.reduce((s, o) =>
          s + (Number(o.amount_paid) || Number(o.amount) || 0), 0));
      }
    } catch { /* keep current state */ }
    setRefreshing(false);
  }, []);

  // Load rates + orders on screen mount, and refetch every time the tab
  // gains focus so a newly-placed order or an admin status change lands
  // on the dashboard without needing pull-to-refresh.
  useEffect(() => { onRefresh(); }, []);
  useEffect(() => {
    const unsub = navigation.addListener('focus', onRefresh);
    return unsub;
  }, [navigation, onRefresh]);

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      <ScrollView
        style={styles.scroll}
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
              <Text style={styles.welcomeLabel}>
                {language === 'ta' ? 'மீண்டும் வரவேற்கிறோம்' : 'WELCOME BACK'}
              </Text>
              <Text style={styles.userName}>
                {language === 'ta' ? `வணக்கம் ${user?.name?.split(' ')[0] || ''}` : `Hi, ${user?.name?.split(' ')[0] || 'Founding Seller'}`}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => {}}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* ── Active order banner ── */}
        {activeOrder && (
          <TouchableOpacity
            style={styles.activeBanner}
            onPress={() => navigation.navigate('OrderStatus', { order: activeOrder })}
          >
            <Text style={{ fontSize: 20 }}>⚡</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeBannerTitle}>
                {language === 'ta' ? 'உங்கள் ஆர்டர் செயலில் உள்ளது' : 'Your order is active'}
              </Text>
              <Text style={styles.activeBannerSub}>
                {language === 'ta' ? 'எங்கள் குழு வருகிறது' : 'Our team is on the way'}
              </Text>
            </View>
            <Text style={styles.activeBannerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* ── Hero card (green) ── */}
        <View style={styles.heroCard}>
          {/* Decorative circle */}
          <View style={styles.heroCircle} />
          <Text style={styles.heroEyebrow}>
            {language === 'ta' ? 'நீங்கள் தயாரா இருக்கும் போது' : 'READY WHEN YOU ARE'}
          </Text>
          <Text style={styles.heroTitle}>
            {language === 'ta' ? 'இலவச பிக்கப் பதிவு செய்யுங்கள்' : 'Book a free pickup'}
          </Text>
          <Text style={styles.heroSub}>
            {language === 'ta'
              ? 'எங்கள் சொந்த குழு, டிஜிட்டல் தராசு, UPI பணம்'
              : 'Our own trained team, on-site digital scale, instant UPI'}
          </Text>
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => navigation.navigate('PostStep1')}
              activeOpacity={0.88}
            >
              <Text style={{ fontSize: 16 }}>♻️</Text>
              <Text style={styles.bookBtnText}>
                {language === 'ta' ? 'இப்போதே பதிவு →' : 'Book Now →'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scheduleBtn} onPress={() => navigation.navigate('PostStep1')}>
              <Text style={{ fontSize: 20 }}>📅</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          {[
            { icon: '📦', value: totalPickups.toString(), label: language === 'ta' ? 'பிக்கப்' : 'Pickups' },
            { icon: '💰', value: `₹${totalEarned}`,       label: language === 'ta' ? 'சம்பாதித்தது' : 'Earned' },
          ].map((s, i) => (
            <View key={i} style={styles.statPill}>
              <Text style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Info banner ── */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            {language === 'ta'
              ? 'முதல் பிக்கப் பிறகு புள்ளிவிவரங்கள் தொடங்கும் ♻️'
              : 'Stats start counting after your first pickup ♻️'}
          </Text>
        </View>

        {/* ── Today's Prices (small sellers only) ──
            Bulk sellers don't see the market-rates strip. Their pricing
            is per-lift on WhatsApp, not published. They see the same
            'What We Buy' category grid rendered on the Products tab. */}
        {user?.seller_type !== 'bulk' ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {language === 'ta' ? 'இன்றைய விலைகள்' : "Today's Prices"}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('ScrapRates')}>
                <Text style={styles.seeAll}>{language === 'ta' ? 'எல்லாம் பார் →' : 'See all →'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.ratesGrid}>
              {rates.slice(0, 6).map((r, i) => (
                <View key={i} style={styles.rateCard}>
                  <ProductIconChip product={r} size={22} chipSize={40} style={{ marginBottom: 6 }} />
                  <Text style={styles.rateName}>{language === 'ta' ? r.name_ta : r.name}</Text>
                  <Text style={styles.ratePrice}>₹{r.price}</Text>
                  <Text style={styles.rateUnit}>/{r.unit}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {language === 'ta' ? 'நாங்கள் வாங்கும் பொருட்கள்' : 'What We Buy'}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('BulkProducts')}>
                <Text style={styles.seeAll}>{language === 'ta' ? 'எல்லாம் பார் →' : 'See all →'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bulkGrid}>
              {[
                { icon: '🔩', en: 'Iron',       ta: 'இரும்பு' },
                { icon: '🪛', en: 'Mild Steel', ta: 'மைல்டு ஸ்டீல்' },
                { icon: '⚙️', en: 'Mixed Iron / Cast Iron', ta: 'கலவை இரும்பு' },
                { icon: '✨', en: 'Stainless Steel', ta: 'ஸ்டெயின்லெஸ் ஸ்டீல்' },
                { icon: '🟠', en: 'Copper',     ta: 'செம்பு' },
                { icon: '🟡', en: 'Brass',      ta: 'பித்தளை' },
              ].map((cat, i) => (
                <View key={i} style={styles.bulkCard}>
                  <Text style={{ fontSize: 26, marginBottom: 6 }}>{cat.icon}</Text>
                  <Text style={styles.bulkCardName} numberOfLines={2}>{language === 'ta' ? cat.ta : cat.en}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.bulkAskBtn}
              onPress={() => navigation.navigate('BulkProducts')}
              activeOpacity={0.85}
            >
              <Text style={styles.bulkAskBtnTxt}>
                💬 {language === 'ta' ? "இன்றைய விலைகள் WhatsApp-இல் கேளுங்கள்" : "Ask today's rates on WhatsApp"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── How a pickup works ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'ta' ? 'எப்படி வேலை செய்கிறது?' : 'How a pickup works'}
          </Text>
          <Text style={styles.sectionSub}>
            {language === 'ta'
              ? '60 நொடியில் பதிவு · நிறுத்தும் நேரத்தில் பணம்'
              : '60 seconds to book · paid the moment we weigh'}
          </Text>
          {STEPS.map((step, i) => (
            <View key={i} style={styles.stepCard}>
              <View style={styles.stepIconBox}>
                <Text style={{ fontSize: 22 }}>{step.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{language === 'ta' ? step.title_ta : step.title}</Text>
                <Text style={styles.stepDesc}>{language === 'ta' ? step.desc_ta : step.desc}</Text>
              </View>
              <Text style={styles.stepNum}>{i + 1}</Text>
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
  scroll: { flex: 1 },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: C.mint, borderWidth: 1, borderColor: C.mintBdr, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontFamily: FONTS.extraBold, fontSize: 16, color: C.greenMid },
  welcomeLabel: { fontFamily: FONTS.bold, fontSize: 10, color: C.greenMid, textTransform: 'uppercase', letterSpacing: 0.8 },
  userName:     { fontFamily: FONTS.black, fontSize: 18, color: C.text },
  bellBtn:      { width: 42, height: 42, borderRadius: 21, backgroundColor: C.mint, borderWidth: 1, borderColor: C.mintBdr, alignItems: 'center', justifyContent: 'center' },

  // Active banner
  activeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#FED7AA',
  },
  activeBannerTitle: { fontFamily: FONTS.extraBold, fontSize: 14, color: '#7C2D12' },
  activeBannerSub:   { fontFamily: FONTS.medium, fontSize: 12, color: '#9A3412', marginTop: 1 },
  activeBannerArrow: { fontFamily: FONTS.bold, fontSize: 18, color: '#C2410C' },

  // Hero card
  heroCard: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: C.greenMid,
    borderRadius: 22, padding: 20,
    overflow: 'hidden',
    shadowColor: C.greenMid, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  heroCircle: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroEyebrow: { fontFamily: FONTS.bold, fontSize: 10, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  heroTitle:   { fontFamily: FONTS.black, fontSize: 26, color: '#FFFFFF', marginBottom: 6 },
  heroSub:     { fontFamily: FONTS.medium, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 20, lineHeight: 19 },
  heroActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  bookBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#FFFFFF', borderRadius: 50,
    paddingVertical: 13,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  bookBtnText:  { fontFamily: FONTS.extraBold, fontSize: 14, color: C.greenDk },
  scheduleBtn:  { width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  // Stats
  statsRow:  { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 10 },
  statPill: {
    flex: 1, backgroundColor: C.mint, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: C.mintBdr,
  },
  statValue: { fontFamily: FONTS.black, fontSize: 16, color: C.text },
  statLabel: { fontFamily: FONTS.semiBold, fontSize: 11, color: C.sub, marginTop: 2 },

  // Info banner
  infoBanner: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: C.mint, borderRadius: 10,
    padding: 11, borderWidth: 1, borderColor: C.mintBdr,
  },
  infoBannerText: { fontFamily: FONTS.bold, fontSize: 12, color: C.greenMid, textAlign: 'center' },

  // Section
  section:       { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontFamily: FONTS.extraBold, fontSize: 17, color: C.text },
  sectionSub:    { fontFamily: FONTS.medium, fontSize: 12, color: C.sub, marginTop: 3, marginBottom: 14 },
  seeAll:        { fontFamily: FONTS.bold, fontSize: 13, color: C.greenMid },

  // Rates
  ratesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rateCard: {
    width: '30%', flexGrow: 1,
    backgroundColor: C.card, borderRadius: 14, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: C.bdr,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  rateName:  { fontFamily: FONTS.semiBold, fontSize: 11, color: C.sub, marginBottom: 2, textAlign: 'center' },
  ratePrice: { fontFamily: FONTS.black, fontSize: 15, color: C.text },
  rateUnit:  { fontFamily: FONTS.regular, fontSize: 10, color: C.light },

  // Bulk-seller Home 'What We Buy' compact grid (categories, no prices)
  bulkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  bulkCard: {
    width: '30%', flexGrow: 1,
    backgroundColor: C.card, borderRadius: 14, padding: 12, minHeight: 92,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.bdr,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  bulkCardName: { fontFamily: FONTS.semiBold, fontSize: 11, color: C.text, textAlign: 'center' },
  bulkAskBtn: {
    backgroundColor: '#25D366', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginTop: 4,
  },
  bulkAskBtnTxt: { fontFamily: FONTS.bold, fontSize: 13, color: '#fff' },

  // Steps
  stepCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: C.bdr,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  stepIconBox: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.mintBdr },
  stepTitle:   { fontFamily: FONTS.extraBold, fontSize: 14, color: C.text },
  stepDesc:    { fontFamily: FONTS.regular, fontSize: 12, color: C.sub, marginTop: 2, lineHeight: 17 },
  stepNum:     { fontFamily: FONTS.black, fontSize: 26, color: C.mintBdr },

});
