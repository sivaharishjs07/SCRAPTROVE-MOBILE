import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../../context/AppContext';
import { t } from '../../constants/translations';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { verifyOTP, sendOTP } from '../../services/api';

export default function OTPScreen({ navigation, route }) {
  const { phone, role, sellerType } = route.params;
  const { language, login } = useApp();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const inputs = useRef([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (val, index) => {
    const newOtp = [...otp];
    newOtp[index] = val.replace(/\D/g, '');
    setOtp(newOtp);
    if (val && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleBackspace = (key, index) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      Alert.alert(t('error', language), t('otp_invalid', language));
      return;
    }
    setLoading(true);
    try {
      const res = await verifyOTP(phone, code, role);
      const { token, user: userData, seller, dealer, is_new } = res.data || {};

      if (token) {
        // Store temp token — used by api interceptor during registration calls
        await AsyncStorage.setItem('auth_token', token);
      }

      if (!is_new && userData) {
        // ── Returning user: log in directly without re-filling profile ──
        // Merge seller/dealer profile fields so reg_id, name, gmail etc are available in app
        const profileData = seller || dealer || {};
        const userWithToken = {
          ...userData,
          token,
          reg_id:        profileData.reg_id        || userData.reg_id        || null,
          name:          profileData.name || profileData.owner_name || userData.name || '',
          gmail:         profileData.gmail          || userData.gmail          || '',
          city:          profileData.city           || userData.city           || '',
          district:      profileData.district       || userData.district       || '',
          state:         profileData.state          || userData.state          || '',
          address:       profileData.address        || userData.address        || '',
          business_name: profileData.business_name  || userData.business_name  || '',
          // Seller-only suspension + bulk fields, harmless for dealers
          seller_type:       profileData.seller_type       ?? null,
          is_suspended:      profileData.is_suspended      ?? 0,
          suspension_reason: profileData.suspension_reason ?? null,
          suspended_at:      profileData.suspended_at      ?? null,
          // Bulk seller fields (only present when seller_type === 'bulk')
          company_name:      profileData.company_name      ?? null,
          designation:       profileData.designation       ?? null,
          company_sector:    profileData.company_sector    ?? null,
          pan_or_gst:        profileData.pan_or_gst        ?? null,
          company_door_no:   profileData.company_door_no   ?? null,
          company_street:    profileData.company_street    ?? null,
          company_locality:  profileData.company_locality  ?? null,
          company_pincode:   profileData.company_pincode   ?? null,
          company_lat:       profileData.company_lat       ?? null,
          company_lng:       profileData.company_lng       ?? null,
        };
        await login(userWithToken, role);
        await AsyncStorage.removeItem('auth_token');

        if (role === 'seller' && seller) {
          navigation.reset({ index: 0, routes: [{ name: 'SellerTabs' }] });
        } else if (role === 'dealer' && dealer) {
          const dest = dealer.status === 'approved' ? 'DealerTabs' : 'DealerPending';
          navigation.reset({ index: 0, routes: [{ name: dest }] });
        } else {
          // User row exists but profile row missing → complete setup
          navigation.navigate(sellerType === 'bulk' ? 'BulkDetails' : 'DetailsForm', { phone, role, sellerType });
        }
      } else {
        // New user — fill in profile
        navigation.navigate(sellerType === 'bulk' ? 'BulkDetails' : 'DetailsForm', { phone, role, sellerType });
      }
    } catch (err) {
      // Prefer the worker's exact error message so 'Invalid OTP',
      // 'OTP expired', 'This number is registered as a dealer' etc. are
      // shown verbatim to the user. Fall back to a generic message only
      // when we can't reach the server at all.
      const serverMsg = err?.response?.data?.error;
      const isNetwork = !err?.response;
      const msg = serverMsg
        || (isNetwork
          ? (language === 'ta' ? 'இணையம் இல்லை. மீண்டும் முயற்சிக்கவும்.' : 'Network error — please check your connection and try again.')
          : (language === 'ta' ? 'OTP தவறானது அல்லது காலாவதியானது. மீண்டும் முயற்சிக்கவும்.' : 'Invalid or expired OTP. Please try again.'));
      Alert.alert(language === 'ta' ? 'சரிபார்ப்பு தோல்வி' : 'Verification Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← {t('back', language)}</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.emoji}>🔐</Text>
        <Text style={styles.title}>{t('enter_otp', language)}</Text>
        <Text style={styles.subtitle}>
          {t('otp_sent_to', language)}{' '}
          <Text style={styles.phoneHighlight}>+91 {phone}</Text>
        </Text>

        {/* OTP boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => (inputs.current[i] = r)}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(v) => handleChange(v, i)}
              onKeyPress={({ nativeEvent }) => handleBackspace(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={i === 0}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.verifyBtn, otp.join('').length !== 6 && styles.verifyBtnDisabled]}
          onPress={handleVerify}
          disabled={otp.join('').length !== 6 || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.verifyBtnText}>{t('verify', language)}</Text>
          }
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendRow}>
          {countdown > 0 ? (
            <Text style={styles.resendCountdown}>
              {language === 'ta' ? `மீண்டும் அனுப்ப ${countdown} விநாடி` : `Resend in ${countdown}s`}
            </Text>
          ) : (
            <TouchableOpacity onPress={async () => {
              setCountdown(30);
              try { await sendOTP(phone, role, sellerType); } catch {}
            }}>
              <Text style={styles.resendLink}>{t('resend_otp', language)}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  backBtn: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  backText: { color: COLORS.primary, fontFamily: FONTS.semiBold, fontSize: 16 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 16, alignItems: 'center' },
  emoji: { fontSize: 56, marginBottom: 20 },
  title: { fontFamily: FONTS.extraBold, fontSize: 26, color: COLORS.text, marginBottom: 8 },
  subtitle: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 36 },
  phoneHighlight: { color: COLORS.primary, fontFamily: FONTS.bold },
  testHint: {
    backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1,
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
    marginTop: 8, marginBottom: 8,
  },
  testHintText: { fontFamily: FONTS.regular, fontSize: 13, color: '#92400E', textAlign: 'center' },
  testHintOtp:  { fontFamily: FONTS.black, fontSize: 15, color: '#92400E' },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  otpBox: {
    width: 48, height: 58, borderRadius: 14, borderWidth: 2,
    borderColor: COLORS.border, backgroundColor: COLORS.surface,
    textAlign: 'center', fontFamily: FONTS.black, fontSize: 24, color: COLORS.text,
  },
  otpBoxFilled: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  verifyBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 17, width: '100%', alignItems: 'center',
    marginBottom: 20, elevation: 3,
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8,
  },
  verifyBtnDisabled: { backgroundColor: COLORS.textLight, shadowOpacity: 0 },
  verifyBtnText: { color: '#fff', fontFamily: FONTS.extraBold, fontSize: 17 },
  resendRow: { marginTop: 8 },
  resendCountdown: { color: COLORS.textSecondary, fontFamily: FONTS.regular, fontSize: 14 },
  resendLink: { color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 14 },
});
