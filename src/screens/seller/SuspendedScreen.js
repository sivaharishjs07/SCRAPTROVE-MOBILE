import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { getLatestEditRequest } from '../../services/api';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';

const RED_50   = '#FEF2F2';
const RED_100  = '#FECACA';
const RED_700  = '#991B1B';
const RED_600  = '#B91C1C';
const AMBER_50 = '#FFFBEB';
const AMBER_100 = '#FDE68A';
const AMBER_700 = '#92400E';
const BLUE_50  = '#F0F9FF';
const BLUE_100 = '#BAE6FD';
const BLUE_700 = '#075985';
const BLUE_800 = '#0369A1';
const GRAY_50  = '#F9FAFB';
const GRAY_200 = '#E5E7EB';
const GRAY_400 = '#9CA3AF';
const GRAY_500 = '#6B7280';
const GRAY_800 = '#1F2937';

const SUPPORT_PHONE   = '+917603807955';
const SUPPORT_EMAIL   = 'support@scraptrove.com';
const SUPPORT_WA_TEXT = 'Hi Scrap Trove, my account is suspended and I need help. Reg ID: ';

const fmtDT = (dt) => {
  if (!dt) return '';
  try {
    const iso = dt.includes('T') ? dt : dt.replace(' ', 'T') + (dt.endsWith('Z') ? '' : 'Z');
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dt;
  }
};

export default function SuspendedScreen({ navigation }) {
  const { user, logout } = useApp();
  const [latestRequest, setLatestRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getLatestEditRequest();
      setLatestRequest(res?.data?.request || null);
    } catch {
      // 404 = no edit request yet, which is fine
      setLatestRequest(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const hasPending  = latestRequest?.status === 'pending';
  const wasRejected = latestRequest?.status === 'rejected';

  const openWhatsApp = () => {
    const msg = encodeURIComponent(SUPPORT_WA_TEXT + (user?.reg_id || user?.mobile || ''));
    Linking.openURL(`https://wa.me/${SUPPORT_PHONE.replace('+', '')}?text=${msg}`)
      .catch(() => Alert.alert('WhatsApp not installed'));
  };
  const callSupport  = () => Linking.openURL(`tel:${SUPPORT_PHONE}`);
  const emailSupport = () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Account%20suspended%20-%20need%20help`);

  const confirmLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.card}>
          <Text style={styles.emoji}>🚫</Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>ACCOUNT SUSPENDED</Text>
          </View>

          <Text style={styles.title}>Your account has been suspended</Text>
          <Text style={styles.subtitle}>
            You cannot place orders or access your dashboard while suspended.
          </Text>

          {/* Reason */}
          {user?.suspension_reason ? (
            <View style={styles.reasonBlock}>
              <Text style={styles.reasonLabel}>Reason for suspension</Text>
              <Text style={styles.reasonText}>{user.suspension_reason}</Text>
              {user.suspended_at ? (
                <Text style={styles.reasonMeta}>Suspended on {fmtDT(user.suspended_at)}</Text>
              ) : null}
            </View>
          ) : null}

          {/* Edit request status */}
          {loading ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : hasPending ? (
            <View style={[styles.reasonBlock, { backgroundColor: AMBER_50, borderColor: AMBER_100 }]}>
              <Text style={[styles.reasonLabel, { color: AMBER_700 }]}>⏳ EDIT REQUEST UNDER REVIEW</Text>
              <Text style={[styles.reasonText, { color: AMBER_700 }]}>
                You submitted updated details on {fmtDT(latestRequest.submitted_at)}. Our team will review and respond shortly.
              </Text>
            </View>
          ) : wasRejected ? (
            <View style={styles.reasonBlock}>
              <Text style={styles.reasonLabel}>❌ EDIT REQUEST REJECTED</Text>
              <Text style={styles.reasonText}>
                {latestRequest.reviewer_remarks || 'Your edit was not accepted.'}
              </Text>
              <Text style={styles.reasonMeta}>Reviewed on {fmtDT(latestRequest.reviewed_at)}</Text>
            </View>
          ) : null}

          {/* Contact */}
          <View style={styles.contactBlock}>
            <Text style={styles.contactLabel}>CONTACT SCRAP TROVE</Text>
            <TouchableOpacity style={styles.contactRow} onPress={openWhatsApp} activeOpacity={0.7}>
              <Text style={styles.contactIcon}>💬</Text>
              <Text style={styles.contactText}>WhatsApp us</Text>
              <Text style={styles.contactChevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactRow} onPress={callSupport} activeOpacity={0.7}>
              <Text style={styles.contactIcon}>📞</Text>
              <Text style={styles.contactText}>+91 76038 07955</Text>
              <Text style={styles.contactChevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactRow} onPress={emailSupport} activeOpacity={0.7}>
              <Text style={styles.contactIcon}>✉️</Text>
              <Text style={styles.contactText} numberOfLines={1}>{SUPPORT_EMAIL}</Text>
              <Text style={styles.contactChevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* CTAs */}
          <TouchableOpacity
            style={[styles.primaryBtn, hasPending && styles.primaryBtnDisabled]}
            onPress={() => navigation.navigate('EditDetails')}
            disabled={hasPending}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, hasPending && styles.primaryBtnTextDisabled]}>
              ✏️ {hasPending ? 'Edit Request Pending Review' : (wasRejected ? 'Edit Details Again' : 'Edit Details')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Support')} activeOpacity={0.85}>
            <Text style={styles.secondaryBtnText}>✉️ Raise an Issue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ghostBtn} onPress={confirmLogout} activeOpacity={0.7}>
            <Text style={styles.ghostBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Scrap Trove · Chennai</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: GRAY_50 },
  scroll:    { flex: 1 },
  container: { paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' },

  card: {
    width: '100%', maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#0A1628', shadowOpacity: 0.06, shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
    alignItems: 'center',
  },
  emoji: { fontSize: 56, marginBottom: 10, textAlign: 'center' },
  badge: {
    backgroundColor: RED_100, borderColor: RED_100, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, marginBottom: 12,
  },
  badgeText: { fontSize: 10, letterSpacing: 1.2, color: RED_700, fontFamily: FONTS.bold },
  title:    { fontSize: 20, textAlign: 'center', color: '#0A1628', fontFamily: FONTS.bold, marginBottom: 6, lineHeight: 26 },
  subtitle: { fontSize: 13, color: GRAY_500, textAlign: 'center', lineHeight: 20, marginBottom: 18, fontFamily: FONTS.regular },

  reasonBlock: {
    width: '100%',
    backgroundColor: RED_50, borderColor: RED_100, borderWidth: 1,
    borderRadius: 14, padding: 14, marginBottom: 14,
  },
  reasonLabel: { fontSize: 10, letterSpacing: 0.8, color: RED_700, fontFamily: FONTS.bold, marginBottom: 6 },
  reasonText:  { fontSize: 14, color: RED_700, lineHeight: 20, fontFamily: FONTS.regular },
  reasonMeta:  { fontSize: 11, color: RED_600, marginTop: 8, fontFamily: FONTS.regular },

  contactBlock: {
    width: '100%',
    backgroundColor: BLUE_50, borderColor: BLUE_100, borderWidth: 1,
    borderRadius: 14, padding: 14, marginBottom: 18,
  },
  contactLabel: { fontSize: 10, letterSpacing: 0.8, color: BLUE_700, fontFamily: FONTS.bold, marginBottom: 10 },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: BLUE_100,
  },
  contactIcon:    { fontSize: 18, width: 28 },
  contactText:    { flex: 1, fontSize: 14, color: BLUE_800, fontFamily: FONTS.semiBold },
  contactChevron: { fontSize: 22, color: BLUE_800, fontFamily: FONTS.regular, marginLeft: 8 },

  primaryBtn: {
    width: '100%',
    backgroundColor: '#1D4ED8', borderRadius: 14,
    paddingVertical: 14, marginBottom: 10, alignItems: 'center',
  },
  primaryBtnDisabled:     { backgroundColor: GRAY_200 },
  primaryBtnText:         { fontSize: 15, color: '#FFFFFF', fontFamily: FONTS.bold },
  primaryBtnTextDisabled: { color: GRAY_400 },

  secondaryBtn: {
    width: '100%',
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 14, marginBottom: 10, alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15, color: '#FFFFFF', fontFamily: FONTS.bold },

  ghostBtn: {
    width: '100%', paddingVertical: 12, alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  ghostBtnText: { fontSize: 13, color: GRAY_500, fontFamily: FONTS.semiBold },

  footer: { marginTop: 18, fontSize: 11, color: GRAY_400, fontFamily: FONTS.regular },
});
