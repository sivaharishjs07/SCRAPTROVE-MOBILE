import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Linking, Alert, ScrollView, Image,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useBottomSpace } from '../../components/useBottomSpace';
import { t } from '../../constants/translations';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { getOrderStatus, cancelOrder } from '../../services/api';

// 3-step visible progress: Order Placed → Order Accepted → Order Completed
const STATUSES = ['broadcast', 'accepted', 'completed'];

const STATUS_INFO = (lang) => ({
  broadcast: {
    emoji: '✅', color: COLORS.success,
    label: lang === 'ta' ? 'ஆர்டர் பதிவாகியது!' : 'Order Placed!',
    desc: lang === 'ta' ? 'உங்கள் ஆர்டர் பதிவு செய்யப்பட்டது. எங்கள் குழு விரைவில் ஒதுக்கப்படும்.' : 'Your order is submitted. Our pickup team will be assigned shortly.',
  },
  accepted: {
    emoji: '🤝', color: COLORS.primary,
    label: lang === 'ta' ? 'ஆர்டர் ஏற்கப்பட்டது' : 'Order Accepted',
    desc: lang === 'ta' ? 'எங்கள் குழு உங்கள் ஆர்டருக்கு ஒதுக்கப்பட்டது' : 'Our pickup team has been assigned to your order',
  },
  on_way: {
    emoji: '🚛', color: COLORS.primary,
    label: lang === 'ta' ? 'எங்கள் குழு வருகிறது' : 'Pickup Team On The Way',
    desc: lang === 'ta' ? 'எங்கள் குழு உங்களிடம் வருகிறது' : 'Our pickup team is headed your way',
  },
  arrived: {
    emoji: '🏠', color: COLORS.primary,
    label: lang === 'ta' ? 'எங்கள் குழு வந்துவிட்டது' : 'Pickup Team Arrived!',
    desc: lang === 'ta' ? 'கதவை திறந்து வரவேற்கவும்' : 'Please open the door',
  },
  completed: {
    emoji: '🎉', color: COLORS.primary,
    label: lang === 'ta' ? 'பிக்கப் முடிந்தது!' : 'Order Completed!',
    desc: lang === 'ta' ? 'நன்றி! ஸ்கிராப் வெற்றிகரமாக எடுக்கப்பட்டது' : 'Thank you! Scrap picked up successfully',
  },
});

// Map backend DB statuses → screen display statuses
const BACKEND_TO_SCREEN = {
  pending:   'broadcast',
  assigned:  'accepted',
  completed: 'completed',
  cancelled: 'cancelled',
};

export default function OrderStatusScreen({ navigation, route }) {
  const bottomSpace = useBottomSpace(); // edge-to-edge: keep content above the navigation bar
  const { order: initialOrder } = route.params;
  const { language, setActiveOrder } = useApp();
  const [order, setOrder] = useState(initialOrder);
  const [status, setStatus] = useState(
    BACKEND_TO_SCREEN[initialOrder.status] || initialOrder.status || 'broadcast'
  );
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Product names only. The worker builds order.material as "icon name"
  // for single-order reads, so using it here printed emoji in front of
  // every product. The items array carries the clean names; order.material
  // stays as the fallback for bulk orders, which have no items rows.
  const materialNames =
    (Array.isArray(order.items) && order.items.length > 0
      ? order.items.map(i => i.name).filter(Boolean).join(', ')
      : '') || order.material || '—';

  useEffect(() => {
    if (status === 'broadcast') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [status]);

  useEffect(() => {
    if (status === 'completed') return;
    const interval = setInterval(async () => {
      try {
        const res = await getOrderStatus(order.id);
        const rawStatus = res.data?.order?.status || res.data?.status;
        const mappedStatus = BACKEND_TO_SCREEN[rawStatus] || rawStatus;
        if (mappedStatus && mappedStatus !== status) {
          if (mappedStatus === 'cancelled') {
            setActiveOrder(null);
            clearInterval(interval);
            navigation.navigate('SellerHome');
            return;
          }
          setStatus(mappedStatus);
          setOrder(res.data.order || res.data);
          if (mappedStatus === 'completed') {
            setActiveOrder(null);
            clearInterval(interval);
          }
        } else {
          // Update order data even if status unchanged (picks up dealer + photos on first poll)
          const latest = res.data.order || res.data;
          if (latest && latest.id) setOrder(latest);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [status, order.id]);

  const doCancel = async (reason) => {
    try { await cancelOrder(order.id, reason); } catch { }
    setActiveOrder(null);
    navigation.navigate('SellerHome');
  };

  const handleCancel = () => {
    Alert.alert(
      language === 'ta' ? 'ரத்து காரணம்?' : 'Why are you cancelling?',
      language === 'ta' ? 'காரணம் தேர்வு செய்யவும்' : 'Please select a reason',
      [
        {
          text: language === 'ta' ? 'வேறு இடத்தில் விற்றுவிட்டேன்' : 'Sold it elsewhere',
          onPress: () => doCancel('Sold it elsewhere'),
        },
        {
          text: language === 'ta' ? 'மனம் மாறிவிட்டேன்' : 'Changed my mind',
          onPress: () => doCancel('Changed my mind'),
        },
        {
          text: language === 'ta' ? 'தவறான தகவல்' : 'Wrong details entered',
          onPress: () => doCancel('Wrong details entered'),
        },
        { text: language === 'ta' ? 'வேண்டாம்' : 'Keep order', style: 'cancel' },
      ]
    );
  };

  const handleContactDealer = () => {
    const phone = order.dealer?.phone;
    if (!phone) {
      Alert.alert(
        language === 'ta' ? 'கிடைக்கவில்லை' : 'Unavailable',
        language === 'ta' ? 'எங்கள் குழு தொலைபேசி கிடைக்கவில்லை' : 'Pickup team contact not available yet.'
      );
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const info = STATUS_INFO(language)[status] || STATUS_INFO(language).broadcast;
  const statusIndex = STATUSES.indexOf(status);

  // Resolve photos — may come from polling or from the initial order passed by PostStep4
  const photos = Array.isArray(order.photos)
    ? order.photos
    : (() => { try { return JSON.parse(order.photo_urls || '[]'); } catch { return []; } })();

  return (
    <View style={[styles.container, { paddingBottom: bottomSpace }]}>
      {/* ── Pinned Header ── */}
      <View style={[styles.header, { backgroundColor: info.color }]}>
        <TouchableOpacity onPress={() => navigation.navigate('SellerHome')} style={styles.headerBack}>
          <Text style={styles.headerBackText}>← {t('home', language)}</Text>
        </TouchableOpacity>
        <Animated.Text style={[styles.statusEmoji, { transform: [{ scale: pulseAnim }] }]}>
          {info.emoji}
        </Animated.Text>
        <Text style={styles.statusLabel}>{info.label}</Text>
        <Text style={styles.statusDesc}>{info.desc}</Text>
      </View>

      {/* ── Pinned Progress bar ── */}
      <View style={styles.progressContainer}>
        <View style={styles.progress}>
          <View style={styles.progressDotWrap}>
            <View style={[styles.progressDot, 0 <= statusIndex && styles.progressDotActive]} />
          </View>
          <View style={[styles.progressLine, 0 < statusIndex && styles.progressLineActive]} />
          <View style={styles.progressDotWrap}>
            <View style={[styles.progressDot, 1 <= statusIndex && styles.progressDotActive]} />
          </View>
          <View style={[styles.progressLine, 1 < statusIndex && styles.progressLineActive]} />
          <View style={styles.progressDotWrap}>
            <View style={[styles.progressDot, 2 <= statusIndex && styles.progressDotActive]} />
          </View>
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabelText, { textAlign: 'left' }]}>{language === 'ta' ? 'பதிவு' : 'Placed'}</Text>
          <Text style={[styles.progressLabelText, { textAlign: 'center' }]}>{language === 'ta' ? 'ஏற்பு' : 'Accepted'}</Text>
          <Text style={[styles.progressLabelText, { textAlign: 'right' }]}>{language === 'ta' ? 'முடிந்தது' : 'Done'}</Text>
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dealer card — shown once a dealer is assigned */}
        {order.dealer && status !== 'broadcast' && (
          <View style={styles.dealerCard}>
            <View style={styles.dealerAvatar}>
              <Text style={styles.dealerAvatarText}>
                {order.dealer.name?.charAt(0)?.toUpperCase() || 'D'}
              </Text>
            </View>
            <View style={styles.dealerInfo}>
              <Text style={styles.dealerName}>{order.dealer.name}</Text>
              {order.dealer.city ? (
                <Text style={styles.dealerCity}>📍 {order.dealer.city}</Text>
              ) : null}
            </View>
            <TouchableOpacity style={styles.contactDealerBtn} onPress={handleContactDealer}>
              <Text style={styles.contactDealerIcon}>📞</Text>
              <Text style={styles.contactDealerText}>
                {language === 'ta' ? 'அழைக்க' : 'Contact'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Order details card */}
        <View style={styles.orderInfo}>
          <Text style={styles.orderInfoTitle}>
            {language === 'ta' ? 'ஆர்டர் விவரங்கள்' : 'Order Details'}
          </Text>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>{language === 'ta' ? 'ஆர்டர் எண்' : 'Order No'}</Text>
            <Text style={[styles.orderInfoValue, styles.orderRefText]}>
              {order.order_ref ? order.order_ref.replace(/-/g, '').toUpperCase() : `#${order.id}`}
            </Text>
          </View>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>{language === 'ta' ? 'பொருள்' : 'Materials'}</Text>
            <Text style={styles.orderInfoValue} numberOfLines={2}>
              {materialNames}
            </Text>
          </View>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>{t('location', language)}</Text>
            <Text style={styles.orderInfoValue} numberOfLines={2}>
              {order.address || order.locationText || '—'}
            </Text>
          </View>
        </View>

        {/* Seller photos */}
        {photos.length > 0 && (
          <View style={styles.photosCard}>
            <Text style={styles.photosTitle}>
              {language === 'ta' ? 'உங்கள் புகைப்படங்கள்' : 'Your Photos'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosRow}
            >
              {photos.map((uri, idx) => (
                <Image
                  key={idx}
                  source={{ uri }}
                  style={styles.photoThumb}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Rate dealer (completed) */}
        {status === 'completed' && (
          <TouchableOpacity
            style={styles.rateBtn}
            onPress={() => navigation.navigate('RateDealer', { order })}
          >
            <Text style={styles.rateBtnText}>⭐ {t('rate_dealer', language)}</Text>
          </TouchableOpacity>
        )}

        {/* OK → Dashboard (broadcast state) */}
        {status === 'broadcast' && (
          <TouchableOpacity
            style={styles.okBtn}
            onPress={() => navigation.navigate('SellerHome')}
          >
            <Text style={styles.okBtnText}>
              {language === 'ta' ? '✓ சரி, டாஷ்போர்டுக்கு செல்' : '✓ OK, Go to Dashboard'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Cancel */}
        {(status === 'broadcast' || status === 'accepted') && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>{t('cancel_order', language)}</Text>
          </TouchableOpacity>
        )}

        {/* Raise an issue about THIS order — the website's primary entry
            into support. Support is reached from an order because every
            ticket is filed against one. */}
        <TouchableOpacity
          style={styles.raiseIssueBtn}
          onPress={() => navigation.navigate('Support', { raiseForOrder: order })}
          activeOpacity={0.8}
        >
          <Text style={styles.raiseIssueText}>
            ✉️ {language === 'ta'
              ? 'இந்த ஆர்டர் குறித்து பிரச்சனை பதிவு செய்'
              : 'Raise an Issue with this Order'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },

  // Header
  header:         { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20, alignItems: 'center' },
  headerBack:     { alignSelf: 'flex-start', marginBottom: 16 },
  headerBackText: { color: 'rgba(255,255,255,0.8)', fontFamily: FONTS.semiBold, fontSize: 15 },
  statusEmoji:    { fontSize: 64, marginBottom: 12 },
  statusLabel:    { color: '#fff', fontFamily: FONTS.black, fontSize: 22, marginBottom: 6, textAlign: 'center' },
  statusDesc:     { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.regular, fontSize: 14, textAlign: 'center' },

  // Progress
  progressContainer: {
    backgroundColor: COLORS.surface, paddingHorizontal: 24,
    paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  progress:          { flexDirection: 'row', alignItems: 'center' },
  progressDotWrap:   { alignItems: 'center' },
  progressDot:       { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.border },
  progressDotActive: { backgroundColor: COLORS.primary },
  progressLine:      { flex: 1, height: 3, backgroundColor: COLORS.border },
  progressLineActive:{ backgroundColor: COLORS.primary },
  progressLabels:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressLabelText: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.textSecondary, width: '33%' },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { paddingTop: 16, paddingBottom: 8 },

  // Dealer card
  dealerCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 16, gap: 12,
    borderWidth: 1.5, borderColor: COLORS.primary + '44',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  dealerAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  dealerAvatarText:  { color: '#fff', fontFamily: FONTS.black, fontSize: 20 },
  dealerInfo:        { flex: 1 },
  dealerName:        { fontFamily: FONTS.extraBold, fontSize: 16, color: COLORS.text },
  dealerCity:        { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  contactDealerBtn:  {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primaryLight, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 12, gap: 2,
  },
  contactDealerIcon: { fontSize: 18 },
  contactDealerText: { fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.primary },

  // Order details
  orderInfo: {
    backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  orderInfoTitle: { fontFamily: FONTS.extraBold, fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 },
  orderInfoRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderInfoLabel: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary },
  orderInfoValue: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text, maxWidth: '60%', textAlign: 'right' },
  orderRefText:   { fontFamily: FONTS.black, fontSize: 14, color: COLORS.primary },

  // Photos
  photosCard: {
    backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  photosTitle:  { fontFamily: FONTS.extraBold, fontSize: 14, color: COLORS.textSecondary, marginBottom: 10 },
  photosRow:    { gap: 10, paddingRight: 4 },
  photoThumb:   { width: 90, height: 90, borderRadius: 10, backgroundColor: COLORS.border },

  // Buttons
  rateBtn: {
    backgroundColor: COLORS.primary, marginHorizontal: 16, marginBottom: 8, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  rateBtnText: { color: '#fff', fontFamily: FONTS.extraBold, fontSize: 16 },
  okBtn: {
    backgroundColor: COLORS.primary, marginHorizontal: 16, marginBottom: 8, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  okBtnText:   { color: '#fff', fontFamily: FONTS.extraBold, fontSize: 16 },
  cancelBtn:   { marginHorizontal: 16, marginTop: 4, alignItems: 'center' },
  cancelBtnText: { color: COLORS.error, fontFamily: FONTS.semiBold, fontSize: 15 },
  raiseIssueBtn: {
    marginHorizontal: 16, marginTop: 14, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, alignItems: 'center',
  },
  raiseIssueText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text },
});
