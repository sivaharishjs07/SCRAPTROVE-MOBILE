import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useBottomSpace } from '../../components/useBottomSpace';
import { t } from '../../constants/translations';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { getScrapRates } from '../../services/api';
import ProductIconChip from '../../components/ProductIconChip';

const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// Map API response fields to the shape this screen expects
const parseApiRates = (data) => {
  if (!Array.isArray(data) || data.length === 0) return null;
  return data.map((r, i) => ({
    id:      String(r.id ?? i),
    name_en: r.name    || r.name_en || '',
    name_ta: r.name_ta || r.name    || '',
    emoji:   r.icon    || '♻️',
    // The admin-uploaded product photo, preferred over the fallback icon.
    icon_url: r.icon_url || null,
    cat:      r.cat      || '',
    price:   r.market_price ?? r.p1 ?? 0,
    // Buying range as set in admin. Shown as "₹p1–₹p2", the same line the
    // booking screen and the website use, instead of a single figure.
    p1:      r.p1 ?? null,
    p2:      r.p2 ?? null,
    change:  r.trend === 'up' ? 1 : r.trend === 'down' ? -1 : 0,
    unit:    r.unit    || 'kg',
  }));
};

export default function ScrapRatesScreen({ navigation }) {
  // 0 when shown as a tab (the tab bar already reserves the space)
  const bottomSpace = useBottomSpace();
  const { language } = useApp();
  const [rates, setRates]         = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load rates from backend on mount
  useEffect(() => {
    getScrapRates()
      .then(res => {
        const parsed = parseApiRates(res.data);
        if (parsed) setRates(parsed);
      })
      .catch(() => {/* keep current state */});
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await getScrapRates();
      const parsed = parseApiRates(res.data);
      if (parsed) setRates(parsed);
    } catch { }
    setRefreshing(false);
  };


  const renderRate = ({ item }) => {
    const name        = language === 'ta' ? item.name_ta : item.name_en;
    const changeColor = item.change > 0 ? COLORS.success : item.change < 0 ? COLORS.error : COLORS.textSecondary;
    const changeSymbol = item.change > 0 ? '▲' : item.change < 0 ? '▼' : '—';

    return (
      <View style={styles.rateRow}>
        <ProductIconChip
          iconUrl={item.icon_url}
          name={item.name_en || item.name || ''}
          cat={item.cat}
          size={20}
          chipSize={42}
          style={styles.iconChip}
        />
        <View style={styles.rateInfo}>
          <Text style={styles.rateName}>{name}</Text>
          <Text style={styles.rateUnit}>per {item.unit}</Text>
        </View>
        <View style={styles.ratePriceBox}>
          <Text style={styles.ratePrice}>
            {(item.p1 != null && item.p2 != null && item.p1 !== item.p2)
              ? `₹${item.p1}–₹${item.p2}`
              : `₹${item.p1 ?? item.price}`}
          </Text>
          {item.change !== 0 && (
            <Text style={[styles.rateChange, { color: changeColor }]}>
              {changeSymbol} {Math.abs(item.change)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomSpace }]}>

      {/* Header */}
      <View style={styles.header}>
        {/* Back arrow only when this screen was pushed (small sellers open
            it from "See all"). As a dealer tab there is nothing to go back
            to, so it stays hidden. */}
        {navigation?.canGoBack?.() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('todays_scrap_rates', language)}</Text>
          <Text style={styles.headerDate}>{t('last_updated', language)}: {today}</Text>
        </View>
      </View>

      <FlatList
        data={rates}
        keyExtractor={(item) => item.id}
        renderItem={renderRate}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('rates_disclaimer', language)}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface, paddingTop: 56, paddingBottom: 14,
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  backBtn: { paddingRight: 12, paddingTop: 2 },
  backText: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.primary },
  headerTitle: { fontFamily: FONTS.black, fontSize: 17, color: COLORS.text, marginBottom: 2 },
  headerDate: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  tip: {
    backgroundColor: COLORS.accentLight, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.accent + '33',
  },
  tipText: { color: COLORS.accent, fontFamily: FONTS.semiBold, fontSize: 13 },
  list: { backgroundColor: COLORS.surface },
  rateRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
  },
  iconChip: { marginRight: 12 },
  rateInfo: { flex: 1 },
  rateName: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text },
  rateUnit: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  ratePriceBox: { alignItems: 'flex-end' },
  ratePrice: { fontFamily: FONTS.black, fontSize: 18, color: COLORS.text },
  rateChange: { fontFamily: FONTS.bold, fontSize: 12, marginTop: 2 },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 70 },
  footer: { padding: 16, alignItems: 'center' },
  footerText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textLight, textAlign: 'center' },
});
