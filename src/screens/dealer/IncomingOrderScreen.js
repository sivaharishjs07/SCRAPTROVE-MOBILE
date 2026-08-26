import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ScrollView, Animated, Alert,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { t } from '../../constants/translations';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { acceptOrder } from '../../services/api';

// Broadcast window: Premium Max = 15s, Premium Plus = 30s, Standard = 30s+
const WINDOW_SECONDS = { premium_max: 15, premium_plus: 30, premium: 30, free: 30 };

export default function IncomingOrderScreen({ navigation, route }) {
  const { order } = route.params;
  const { language, user, setActiveOrder } = useApp();
  const [countdown, setCountdown]   = useState(WINDOW_SECONDS[user?.subscriptionTier || 'free']);
  const [accepting, setAccepting]   = useState(false);
  const [expired, setExpired]       = useState(false);
  const countdownAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (countdown <= 0) { setExpired(true); return; }
    if (countdown <= 5) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(countdownAnim, { toValue: 1.15, duration: 300, useNativeDriver: true }),
          Animated.timing(countdownAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        { iterations: 1 }
      ).start();
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await acceptOrder(order.id);
      setActiveOrder({ ...order, role: 'dealer' });
      navigation.replace('ActiveOrder', { order });
    } catch (err) {
      setAccepting(false);
      const msg = err?.response?.data?.error || 'Failed to accept order. Please try again.';
      Alert.alert('Error', msg);
    }
  };

  const timerColor   = countdown <= 5 ? COLORS.error : countdown <= 10 ? COLORS.warning : COLORS.primary;
  const material_name = language === 'ta' ? order.material_ta : order.material;

  return (
    <View style={styles.container}>

      {/* Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.navBack}>← {t('back', language)}</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{t('new_order', language)}</Text>
        {/* Countdown timer */}
        <Animated.View style={[styles.timer, { borderColor: timerColor, transform: [{ scale: countdownAnim }] }]}>
          <Text style={[styles.timerText, { color: timerColor }]}>{countdown}</Text>
          <Text style={[styles.timerSub, { color: timerColor }]}>{t('seconds', language)}</Text>
        </Animated.View>
      </View>

      {expired ? (
        <View style={styles.expiredContainer}>
          <Text style={styles.expiredEmoji}>⏰</Text>
          <Text style={styles.expiredTitle}>{t('order_taken', language)}</Text>
          <Text style={styles.expiredSub}>
            {language === 'ta' ? 'இந்த ஆர்டர் வேறொரு டீலரால் ஏற்கப்பட்டுவிட்டது' : 'This order was accepted by another dealer'}
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← {language === 'ta' ? 'முகப்புக்கு திரும்பு' : 'Back to Home'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Photos */}
          {order.photos?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              {order.photos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.photo} />
              ))}
            </ScrollView>
          )}

          {/* No photo placeholder */}
          {(!order.photos || order.photos.length === 0) && (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderEmoji}>📦</Text>
              <Text style={styles.photoPlaceholderText}>
                {language === 'ta' ? 'புகைப்படங்கள் இல்லை' : 'No photos'}
              </Text>
            </View>
          )}

          {/* Material + Location */}
          <View style={styles.section}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('select_material', language)}</Text>
              <Text style={styles.detailValue}>{material_name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('estimated_quantity', language)}</Text>
              <Text style={styles.detailValue}>{order.estimatedQty || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('distance', language)}</Text>
              <Text style={styles.detailValue}>{order.distance} {t('km_away', language)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('seller_location', language)}</Text>
              <Text style={styles.detailValue}>{order.locationText}</Text>
            </View>
            {order.notes && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{language === 'ta' ? 'குறிப்புகள்' : 'Notes'}</Text>
                <Text style={styles.detailValue}>{order.notes}</Text>
              </View>
            )}
          </View>

          {/* Earnings estimate */}
          <View style={styles.earningsCard}>
            <Text style={styles.earningsTitle}>
              {language === 'ta' ? '💰 மதிப்பிடப்பட்ட வருமானம்' : '💰 Estimated Earnings'}
            </Text>
            <Text style={styles.earningsValue}>₹150 – ₹600</Text>
            <Text style={styles.earningsSub}>
              {language === 'ta' ? 'உண்மையான தொகை நேரில் முடிவு செய்யப்படும்' : 'Final amount decided at pickup'}
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Accept CTA */}
      {!expired && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.acceptBtn, accepting && { opacity: 0.7 }]}
            onPress={handleAccept}
            disabled={accepting}
          >
            <Text style={styles.acceptBtnText}>
              {accepting ? t('accepting', language) : t('i_accept', language)}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  navBack: { color: COLORS.primary, fontFamily: FONTS.semiBold, fontSize: 15 },
  navTitle: { fontFamily: FONTS.extraBold, fontSize: 16, color: COLORS.text },
  timer: { width: 50, height: 50, borderRadius: 25, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  timerText: { fontFamily: FONTS.black, fontSize: 18 },
  timerSub: { fontFamily: FONTS.semiBold, fontSize: 9 },
  photosScroll: { paddingHorizontal: 16, paddingTop: 16 },
  photo: { width: 180, height: 160, borderRadius: 12, marginRight: 10 },
  photoPlaceholder: {
    height: 140, marginHorizontal: 16, marginTop: 16, backgroundColor: COLORS.surface,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  photoPlaceholderEmoji: { fontSize: 36 },
  photoPlaceholderText: { color: COLORS.textLight, fontFamily: FONTS.medium, fontSize: 13, marginTop: 8 },
  section: {
    backgroundColor: COLORS.surface, margin: 16, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  detailLabel: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  detailValue: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text, flex: 1, textAlign: 'right' },
  earningsCard: {
    backgroundColor: COLORS.primaryLight, marginHorizontal: 16, borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary + '44',
  },
  earningsTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text, marginBottom: 6 },
  earningsValue: { fontFamily: FONTS.black, fontSize: 28, color: COLORS.primary, marginBottom: 4 },
  earningsSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface, padding: 16, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  acceptBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', elevation: 4,
    shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 10,
  },
  acceptBtnText: { color: '#fff', fontFamily: FONTS.black, fontSize: 18 },
  expiredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  expiredEmoji: { fontSize: 64, marginBottom: 16 },
  expiredTitle: { fontFamily: FONTS.black, fontSize: 22, color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  expiredSub: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 28 },
  backBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  backBtnText: { color: '#fff', fontFamily: FONTS.extraBold, fontSize: 15 },
});
