import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  Image, ActivityIndicator, RefreshControl, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { getYardProducts, submitYardEnquiry } from '../../services/api';
import { FONTS } from '../../constants/typography';

// Design tokens — same palette used across seller screens.
const C = {
  bg:       '#F9FAFB',
  card:     '#FFFFFF',
  border:   '#E5E7EB',
  text:     '#0A1628',
  text2:    '#374151',
  sub:      '#6B7280',
  ph:       '#9CA3AF',
  green:    '#16A34A',
  greenBg:  '#F0FDF4',
  wa:       '#25D366',
  waHover:  '#1EBE57',
};

const WHATSAPP_NUMBER = '917603807955';
const CATEGORIES = [
  'All', 'Iron Sheets', 'Gates & Grills', 'Rods & Angles',
  'Racks & Furniture', 'Equipment', 'Other',
];

const parsePhotos = (raw) => {
  try { const a = JSON.parse(raw || '[]'); return Array.isArray(a) ? a : []; }
  catch { return []; }
};
const fmtPrice = (p) => p.pricing_type === 'per_kg'
  ? `₹${Number(p.price).toLocaleString('en-IN')}/kg`
  : `₹${Number(p.price).toLocaleString('en-IN')}`;

export default function YardFindsScreen({ navigation }) {
  const { language } = useApp();
  const isTa = language === 'ta';

  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefresh]  = useState(false);
  const [category, setCategory]   = useState('All');
  const [q, setQ]                 = useState('');

  const load = useCallback(async () => {
    try {
      const params = category === 'All' ? {} : { category };
      const res = await getYardProducts(params);
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.products) ? res.data.products : [];
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, [category]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const enquire = async (item) => {
    // Log first, then redirect — even if WhatsApp fails to open we've
    // captured the intent server-side.
    try { await submitYardEnquiry(item.item_code); } catch {}
    const msg = encodeURIComponent(
      `Hi Scrap Trove, I'm interested in "${item.title}" (${item.item_code}) at ${fmtPrice(item)}`,
    );
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`)
      .catch(() => Alert.alert('WhatsApp not installed'));
  };

  // Client-side search filter (applied over the server-filtered list)
  const needle = q.trim().toLowerCase();
  const visible = needle
    ? rows.filter(p =>
        (p.title || '').toLowerCase().includes(needle) ||
        (p.item_code || '').toLowerCase().includes(needle))
    : rows;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏭 {isTa ? 'யார்ட் ஃபைன்ட்ஸ்' : 'Yard Finds'}</Text>
        <Text style={styles.headerSub}>
          {isTa
            ? 'சென்னை யார்டிலிருந்து மறு-பயன்பாட்டு ஸ்கிராப் — முதலில் வருபவருக்கு'
            : 'Reusable stock from our Chennai yard — first come, first serve'}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={isTa ? 'தேடுங்கள் (பெயர் அல்லது ST-code)' : 'Search by name or ST-code'}
          placeholderTextColor={C.ph}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setCategory(c)}
            style={[styles.chip, category === c && styles.chipActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={C.green} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefresh(true); load(); }} tintColor={C.green} />
          }
          showsVerticalScrollIndicator={false}
        >
          {visible.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>
                {needle
                  ? (isTa ? `"${q}" — பொருள் இல்லை` : `No items match "${q}"`)
                  : (isTa ? 'இந்த வகையில் தற்போது எதுவும் இல்லை' : 'No items in this category right now')}
              </Text>
              <Text style={styles.emptySub}>
                {isTa ? 'ஒவ்வொரு வாரமும் புதிய பொருட்கள் சேர்க்கப்படும்' : 'We add fresh finds every week'}
              </Text>
            </View>
          ) : (
            visible.map(item => (
              <YardCard key={item.id} item={item} onEnquire={() => enquire(item)} isTa={isTa} />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────
function YardCard({ item, onEnquire, isTa }) {
  const photos = parsePhotos(item.photos);
  const cover  = photos[0];
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 40, color: C.ph }}>♻️</Text>
          </View>
        )}
        <View style={styles.itemCodeBadge}>
          <Text style={styles.itemCodeText}>{item.item_code}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardCategory}>{item.category}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.cardPriceRow}>
          <Text style={styles.cardPrice}>{fmtPrice(item)}</Text>
          {item.pricing_type === 'per_kg' && item.weight_kg > 0 && (
            <Text style={styles.cardPriceSub}>
              × {item.weight_kg} kg ≈ ₹{Math.round(Number(item.price) * Number(item.weight_kg)).toLocaleString('en-IN')}
            </Text>
          )}
        </View>
        {item.weight_kg > 0 && (
          <Text style={styles.cardWeight}>⚖ {item.weight_kg} kg</Text>
        )}
        <TouchableOpacity style={styles.waBtn} onPress={onEnquire} activeOpacity={0.85}>
          <Text style={styles.waBtnText}>💬 {isTa ? 'WhatsApp-இல் விசாரிக்க' : 'Enquire on WhatsApp'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.card, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontFamily: FONTS.black, fontSize: 22, color: C.text, marginBottom: 4 },
  headerSub:   { fontFamily: FONTS.regular, fontSize: 13, color: C.sub, lineHeight: 18 },

  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  searchInput: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: C.text, fontFamily: FONTS.regular,
  },

  chipsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: C.green, borderColor: C.green },
  chipText:   { fontFamily: FONTS.semiBold, fontSize: 13, color: C.sub },
  chipTextActive: { color: '#FFFFFF' },

  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:   { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 42, marginBottom: 8 },
  emptyText:  { fontFamily: FONTS.bold, fontSize: 15, color: C.text2 },
  emptySub:   { fontFamily: FONTS.regular, fontSize: 12, color: C.sub, marginTop: 4 },

  // Vertical card — image on top full width, info below with more room
  // so long titles + prices + weight all fit without cramming.
  card: {
    backgroundColor: C.card, borderRadius: 20, marginBottom: 16,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  cardTop:   { position: 'relative', width: '100%', height: 200, backgroundColor: '#F3F4F6' },
  cardImage: { width: '100%', height: '100%' },
  itemCodeBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  itemCodeText: { fontFamily: FONTS.bold, fontSize: 12, color: C.text },

  cardBody: { padding: 16 },
  cardCategory: { fontFamily: FONTS.bold, fontSize: 11, color: C.sub, letterSpacing: 0.8, textTransform: 'uppercase' },
  cardTitle:    { fontFamily: FONTS.bold, fontSize: 17, color: C.text, marginTop: 4, lineHeight: 22 },
  cardPriceRow: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' },
  cardPrice:    { fontFamily: FONTS.black, fontSize: 22, color: C.green },
  cardPriceSub: { fontFamily: FONTS.regular, fontSize: 12, color: C.sub, marginLeft: 8 },
  cardWeight:   { fontFamily: FONTS.semiBold, fontSize: 13, color: C.sub, marginTop: 6 },

  waBtn: {
    marginTop: 14, backgroundColor: C.wa, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 18,
  },
  waBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: '#FFFFFF' },
});
