import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { t } from '../../constants/translations';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { sendOTP } from '../../services/api';

export default function PhoneScreen({ navigation, route }) {
  const { role, sellerType } = route.params || {};   // role: 'seller' | 'dealer'; sellerType: 'small' | 'bulk' (seller only)
  const { language } = useApp();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleSend = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      Alert.alert(t('error', language), t('phone_invalid', language));
      return;
    }
    setLoading(true);
    try {
      await sendOTP(cleaned, role, sellerType);
      navigation.navigate('OTP', { phone: cleaned, role, sellerType });
    } catch (err) {
      const msg = err?.response?.data?.error ||
        (language === 'ta'
          ? 'OTP அனுப்ப முடியவில்லை. இணைப்பை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.'
          : 'Failed to send OTP. Please check your connection and try again.');
      Alert.alert(language === 'ta' ? 'பிழை' : 'Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← {t('back', language)}</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.emoji}>📱</Text>
        <Text style={styles.title}>{t('enter_phone', language)}</Text>
        <Text style={styles.subtitle}>
          {language === 'ta'
            ? 'உங்கள் மொபைல் எண்ணில் OTP அனுப்புவோம்'
            : 'We will send an OTP to your mobile number'}
        </Text>

        {/* Phone input */}
        <View style={styles.inputContainer}>
          <Text style={styles.countryCode}>🇮🇳 +91</Text>
          <View style={styles.divider} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={t('phone_placeholder', language)}
            placeholderTextColor={COLORS.textLight}
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
            autoFocus
          />
        </View>

        <TouchableOpacity
          style={[styles.sendBtn, phone.length !== 10 && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={phone.length !== 10 || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.sendBtnText}>{t('send_otp', language)}</Text>
          }
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          {language === 'ta'
            ? 'தொடர்வதன் மூலம் எங்கள் விதிமுறைகளுக்கு சம்மதிக்கிறீர்கள்'
            : 'By continuing you agree to our Terms of Service'}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  backBtn: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  backText: { color: COLORS.primary, fontFamily: FONTS.semiBold, fontSize: 16 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 20, alignItems: 'center' },
  emoji: { fontSize: 56, marginBottom: 20 },
  title: { fontFamily: FONTS.extraBold, fontSize: 26, color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 36, lineHeight: 22 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 16, marginBottom: 24,
    width: '100%', height: 62,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  countryCode: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  divider: { width: 1, height: 28, backgroundColor: COLORS.border, marginHorizontal: 12 },
  input: { flex: 1, fontFamily: FONTS.bold, fontSize: 22, color: COLORS.text, letterSpacing: 2 },
  sendBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 17, width: '100%', alignItems: 'center',
    marginBottom: 20, elevation: 3,
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8,
  },
  sendBtnDisabled: { backgroundColor: COLORS.textLight, shadowOpacity: 0 },
  sendBtnText: { color: '#fff', fontFamily: FONTS.extraBold, fontSize: 17 },
  disclaimer: { color: COLORS.textLight, fontFamily: FONTS.regular, fontSize: 12, textAlign: 'center' },
});
