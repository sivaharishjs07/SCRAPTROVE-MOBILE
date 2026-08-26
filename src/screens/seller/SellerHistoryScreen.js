import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { t } from '../../constants/translations';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { getSellerOrders } from '../../services/api';

const STATUS_COLORS      = { completed: COLORS.successLight, cancelled: COLORS.errorLight,   pending: COLORS.warningLight };
const STATUS_TEXT_COLORS = { completed: COLORS.success,      cancelled: COLORS.error,        pending: COLORS.warning };

// Strip dashes from order ref e.g. ORD-INS-2026-0002 → ORDINS20260002
const formatRef = (ref, id) => {
  if (ref) return ref.replace(/-/g, '').toUpperCase();
  return `#${id}`;
};

export default function SellerHistoryScreen({ navigation }) {
  const { language } = useApp();
  const [orders, setOrders]         = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading]       = useState(true);

  const loadOrders = async () => {
    try {
      const res = await getSellerOrders();
      const data = res?.data?.orders ?? res?.data ?? [];
      setOrders(Array.isArray(data) ? data : []);
    } catch { setOrders([]); }
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, []);

  // Also refetch every time the tab gains focus. Without this, an order
  // placed elsewhere (or a status change from admin) doesn't show up until
  // the user pulls to refresh — because tabs stay mounted, useEffect [] only
  // fires once per app-lifetime.
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadOrders);
    return unsub;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  // Use the actual amount the dealer marked paid on completion; fall back
  // to the pre-pickup high estimate only if the dealer forgot to enter it.
  const totalEarned = orders
    .filter(o => o.status === 'completed')
    .reduce((s, o) => s + (Number(o.amount_paid) || Number(o.est_max) || 0), 0);
  const completedCount = orders.filter(o => o.status === 'completed').length;

  const displayStatus = (status) => {
    if (status === 'completed') return 'completed';
    if (status === 'cancelled') return 'cancelled';
    return 'pending';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  const renderOrder = ({ item }) => {
    const ds = displayStatus(item.status);
    const materialLabel = item.material
      || (item.items?.map(i => i.name).filter(Boolean).join(', '))
      || (item.type === 'instant' ? 'Instant Pickup' : 'Scheduled Pickup');
    const dealerName = item.dealer?.owner_name || item.dealer?.business_name || item.dealer?.name || '';
    const ref = formatRef(item.order_ref, item.id);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderStatus', { order: item })}
        activeOpacity={0.75}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderMaterial} numberOfLines={1}>{materialLabel}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[ds] }]}>
            <Text style={[styles.statusText, { color: STATUS_TEXT_COLORS[ds] }]}>
              {ds === 'completed'
                ? (language === 'ta' ? 'முடிந்தது' : 'Done')
                : ds === 'cancelled'
                  ? (language === 'ta' ? 'ரத்தானது' : 'Cancelled')
                  : (language === 'ta' ? 'நடப்பு' : 'Active')}
            </Text>
          </View>
        </View>

        <View style={styles.orderRef}>
          <Text style={styles.orderRefText}>{ref}</Text>
        </View>

        <View style={styles.orderMeta}>
          <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          {dealerName ? (
            <Text style={styles.orderDealer}>
              {language === 'ta' ? 'டீலர்: ' : 'Dealer: '}{dealerName}
            </Text>
          ) : null}
        </View>

        <View style={styles.orderFooter}>
          {item.status === 'completed' && item.est_max > 0 && (
            <Text style={styles.orderAmount}>₹{item.est_max}</Text>
          )}
          {item.estimated_weight ? (
            <Text style={styles.orderWeight}>{item.estimated_weight}</Text>
          ) : null}
          <Text style={styles.viewDetail}>
            {language === 'ta' ? 'விவரம் பார் →' : 'View details →'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('your_orders', language)}</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{completedCount}</Text>
          <Text style={styles.summaryLabel}>{t('completed_orders', language)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary + '33' }]}>
          <Text style={[styles.summaryValue, { color: COLORS.primary }]}>₹{totalEarned}</Text>
          <Text style={styles.summaryLabel}>{t('total_earned', language)}</Text>
        </View>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>{t('no_active_orders', language)}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface, paddingTop: 56, paddingBottom: 16,
    paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontFamily: FONTS.black, fontSize: 22, color: COLORS.text },

  summary: { flexDirection: 'row', padding: 16, gap: 12 },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  summaryValue: { fontFamily: FONTS.black, fontSize: 24, color: COLORS.text, marginBottom: 4 },
  summaryLabel: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  list: { paddingHorizontal: 16, paddingBottom: 20 },

  orderCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderMaterial: { fontFamily: FONTS.extraBold, fontSize: 17, color: COLORS.text, flex: 1, marginRight: 8 },
  statusBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:    { fontFamily: FONTS.bold, fontSize: 12 },

  orderRef: { marginBottom: 6 },
  orderRefText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary, letterSpacing: 0.5 },

  orderMeta:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderDate:   { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary },
  orderDealer: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary },

  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderAmount: { fontFamily: FONTS.black, fontSize: 20, color: COLORS.primary },
  orderWeight: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  viewDetail:  { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.primary, marginLeft: 'auto' },

  empty:      { paddingTop: 60, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText:  { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.textSecondary },
});
