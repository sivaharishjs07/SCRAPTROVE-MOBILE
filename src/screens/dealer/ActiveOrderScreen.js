import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Linking, Alert, ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ensurePermission } from '../../services/permissions';
import { useApp } from '../../context/AppContext';
import { useBottomSpace } from '../../components/useBottomSpace';
import { t } from '../../constants/translations';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { updateOrderStatus, completeOrder } from '../../services/api';
import { uploadPhotoAsset, uploadErrorMessage, deleteLocalPhotos } from '../../services/photoUpload';

// TODO(client): Tamil text for the messages below that are English-only.

const STEPS = ['accepted', 'on_way', 'arrived', 'completed'];

export default function ActiveOrderScreen({ navigation, route }) {
  const bottomSpace = useBottomSpace(); // edge-to-edge: keep content above the navigation bar
  const { order: initialOrder } = route.params;
  const { language, setActiveOrder } = useApp();
  const [order]                     = useState(initialOrder);
  const [step, setStep]             = useState(0); // 0=accepted, 1=on_way, 2=arrived, 3=completed
  const [completionPhoto, setCompletionPhoto] = useState(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [completing, setCompleting] = useState(false);

  // Only move to the next step once the server has accepted it; otherwise
  // the screen and the server (and the seller's tracking) disagree.
  const advanceStep = async () => {
    const newStep = step + 1;
    const status  = STEPS[newStep];
    try {
      await updateOrderStatus(order.id, status);
      setStep(newStep);
    } catch (err) {
      Alert.alert(t('error', language), err?.response?.data?.error || 'Could not update the order status. Please try again.');
    }
  };

  const pickCompletionPhoto = async () => {
    if (!(await ensurePermission('camera', language))) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    // Keep the whole asset (uri + size) so the upload can be resized.
    if (!result.canceled) setCompletionPhoto(result.assets[0]);
  };

  const handleComplete = async () => {
    if (!completionPhoto) {
      Alert.alert(t('error', language), t('upload_completion_photo', language));
      return;
    }
    const amt = Number(amountPaid);
    if (!amountPaid || isNaN(amt) || amt <= 0) {
      Alert.alert(t('error', language), language === 'ta' ? 'சரியான தொகை உள்ளிடவும் (₹1 அல்லது அதிகம்)' : 'Enter a valid amount (₹1 or more)');
      return;
    }
    if (amt > 999999) {
      Alert.alert(t('error', language), language === 'ta' ? 'தொகை மிகவும் அதிகம்' : 'Amount seems too high. Please check.');
      return;
    }
    setCompleting(true);
    // Photo first: without it the order must not be marked complete.
    let photoUrl;
    try {
      photoUrl = await uploadPhotoAsset(completionPhoto);
    } catch (err) {
      setCompleting(false);
      Alert.alert(t('error', language), uploadErrorMessage(err, 'The photo could not be uploaded. Please check your connection and try again.'));
      return;
    }
    // Only show success once the server has recorded the completion.
    try {
      await completeOrder(order.id, photoUrl, amt);
    } catch (err) {
      setCompleting(false);
      Alert.alert(t('error', language), err?.response?.data?.error || 'Could not complete the order. Please try again.');
      return;
    }
    deleteLocalPhotos([completionPhoto]);
    setActiveOrder(null);
    setCompleting(false);
    setStep(3);
  };

  if (step === 3) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>{t('pickup_complete', language)}</Text>
        <Text style={styles.successSub}>
          {language === 'ta' ? `₹${amountPaid} - மொத்த தொகை` : `₹${amountPaid} total paid`}
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.navigate('DealerHome')}>
          <Text style={styles.doneBtnText}>{language === 'ta' ? 'முகப்புக்கு செல்' : 'Go to Home'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No placeholder number: dialling a made-up number could ring a stranger.
  const seller = order.seller || { name: 'Seller', phone: null };
  const callSeller = () => {
    if (!seller.phone) {
      // TODO(client): Tamil text.
      Alert.alert(t('error', language), "The seller's phone number is not available for this order.");
      return;
    }
    Linking.openURL(`tel:${seller.phone}`).catch(() => {});
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomSpace }]}>

      {/* Nav */}
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>{t('active_order_title', language)}</Text>
        <TouchableOpacity
          style={styles.callSellerBtn}
          onPress={callSeller}
        >
          <Text style={styles.callSellerText}>📞 {t('call_seller', language)}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress indicator */}
      <View style={styles.progressBar}>
        {STEPS.slice(0, 3).map((s, i) => (
          <View key={s} style={styles.progressItem}>
            <View style={[styles.progressDot, i <= step && styles.progressDotActive]} />
            {i < 2 && <View style={[styles.progressLine, i < step && styles.progressLineActive]} />}
            <Text style={[styles.progressLabel, i <= step && { color: COLORS.primary }]}>
              {i === 0 ? (language === 'ta' ? 'ஏற்பு' : 'Accepted')
                : i === 1 ? (language === 'ta' ? 'வருகிறேன்' : 'On Way')
                  : (language === 'ta' ? 'வந்தேன்' : 'Arrived')}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Seller info card */}
        <View style={styles.sellerCard}>
          <View style={styles.sellerAvatar}>
            <Text style={styles.sellerAvatarText}>{seller.name?.charAt(0)}</Text>
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName}>{seller.name}</Text>
            <Text style={styles.sellerLocation}>{order.locationText}</Text>
            <Text style={styles.sellerMaterial}>
              {language === 'ta' ? order.material_ta || order.material : order.material}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.navigateBtn}
            onPress={() => Linking.openURL(`https://maps.google.com/?q=${order.latitude},${order.longitude}`)}
          >
            <Text style={styles.navigateBtnText}>🗺️</Text>
            <Text style={styles.navigateBtnLabel}>{t('navigate', language)}</Text>
          </TouchableOpacity>
        </View>

        {/* Step action */}
        {step === 0 && (
          <View style={styles.actionSection}>
            <Text style={styles.actionTitle}>
              {language === 'ta' ? 'ஆர்டர் ஏற்கப்பட்டது. விற்பனையாளரிடம் செல்லவும்.' : 'Order accepted. Head to the seller.'}
            </Text>
            <TouchableOpacity style={styles.actionBtn} onPress={advanceStep}>
              <Text style={styles.actionBtnText}>🚛 {t('im_on_way', language)}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 1 && (
          <View style={styles.actionSection}>
            <Text style={styles.actionTitle}>
              {language === 'ta' ? 'வழியில் இருக்கீர்கள். வந்தவுடன் தெரிவிக்கவும்.' : 'You are on the way. Notify when you arrive.'}
            </Text>
            <TouchableOpacity style={styles.actionBtn} onPress={advanceStep}>
              <Text style={styles.actionBtnText}>🏠 {t('i_arrived', language)}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.actionSection}>
            <Text style={styles.actionTitle}>
              {language === 'ta' ? 'வந்தீர்கள்! ஸ்கிராப் எடுத்து முடிக்கவும்.' : 'You arrived! Complete the pickup.'}
            </Text>

            {/* Completion photo */}
            <Text style={styles.fieldLabel}>{t('upload_completion_photo', language)}</Text>
            <TouchableOpacity
              style={[styles.photoBox, completionPhoto && { borderColor: COLORS.primary }]}
              onPress={pickCompletionPhoto}
            >
              {completionPhoto ? (
                <Image source={{ uri: completionPhoto.uri }} style={styles.completionPhoto} />
              ) : (
                <Text style={styles.photoBoxText}>
                  📸 {language === 'ta' ? 'புகைப்படம் எடுக்கவும்' : 'Take completion photo'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Amount */}
            <Text style={styles.fieldLabel}>{t('enter_amount', language)}</Text>
            <View style={styles.amountInput}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={styles.amountField}
                value={amountPaid}
                onChangeText={setAmountPaid}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={COLORS.textLight}
                maxLength={6}
              />
            </View>

            <TouchableOpacity
              style={[styles.completeBtn, (!completionPhoto || !amountPaid) && { opacity: 0.5 }]}
              onPress={handleComplete}
              disabled={completing || !completionPhoto || !amountPaid}
            >
              {completing
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.completeBtnText}>{t('complete_order', language)}</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  navTitle: { fontFamily: FONTS.extraBold, fontSize: 18, color: COLORS.text },
  callSellerBtn: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  callSellerText: { color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 13 },
  progressBar: {
    flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 24, paddingVertical: 16,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  progressItem: { flex: 1, alignItems: 'center' },
  progressDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.border, marginBottom: 4 },
  progressDotActive: { backgroundColor: COLORS.primary },
  progressLine: { position: 'absolute', top: 6, left: '50%', right: '-50%', height: 3, backgroundColor: COLORS.border },
  progressLineActive: { backgroundColor: COLORS.primary },
  progressLabel: { fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  sellerCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    margin: 16, borderRadius: 14, padding: 16, gap: 12,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  sellerAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  sellerAvatarText: { color: '#fff', fontFamily: FONTS.black, fontSize: 20 },
  sellerInfo: { flex: 1 },
  sellerName: { fontFamily: FONTS.extraBold, fontSize: 16, color: COLORS.text },
  sellerLocation: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sellerMaterial: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primary, marginTop: 2 },
  navigateBtn: { alignItems: 'center', padding: 10, backgroundColor: COLORS.primaryLight, borderRadius: 12 },
  navigateBtnText: { fontSize: 22 },
  navigateBtnLabel: { fontFamily: FONTS.semiBold, fontSize: 10, color: COLORS.primary, marginTop: 2 },
  actionSection: { paddingHorizontal: 16, marginBottom: 16 },
  actionTitle: {
    fontFamily: FONTS.regular, fontSize: 15, color: COLORS.textSecondary,
    textAlign: 'center', marginBottom: 16, lineHeight: 22,
  },
  actionBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 17, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  actionBtnText: { color: '#fff', fontFamily: FONTS.extraBold, fontSize: 17 },
  fieldLabel: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text, marginBottom: 10, marginTop: 12 },
  photoBox: {
    height: 120, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border,
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.surface, overflow: 'hidden',
  },
  completionPhoto: { width: '100%', height: '100%', borderRadius: 10 },
  photoBoxText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 14 },
  amountInput: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14,
    height: 56, marginBottom: 20,
  },
  rupeeSymbol: { fontFamily: FONTS.black, fontSize: 22, color: COLORS.text, marginRight: 8 },
  amountField: { flex: 1, fontFamily: FONTS.black, fontSize: 22, color: COLORS.text },
  completeBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 17, alignItems: 'center',
  },
  completeBtnText: { color: '#fff', fontFamily: FONTS.extraBold, fontSize: 17 },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: COLORS.background },
  successEmoji: { fontSize: 72, marginBottom: 16 },
  successTitle: { fontFamily: FONTS.black, fontSize: 26, color: COLORS.primary, marginBottom: 8 },
  successSub: { fontFamily: FONTS.medium, fontSize: 16, color: COLORS.textSecondary, marginBottom: 32 },
  doneBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 40, paddingVertical: 16, borderRadius: 14 },
  doneBtnText: { color: '#fff', fontFamily: FONTS.extraBold, fontSize: 16 },
});
