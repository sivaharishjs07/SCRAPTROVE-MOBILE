/**
 * PostStep4Screen — Step 4 of 4: Photos + Notes + Review + Submit
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Image, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';
import { postScrapRequest, uploadPhoto, joinPincodeWaitlist } from '../../services/api';

const C = {
  bg:      '#FFFFFF',
  green:   '#16A34A',
  mint:    '#F0FDF4',
  mintBdr: '#DCFCE7',
  text:    '#0A1628',
  sub:     '#6B7280',
  light:   '#9CA3AF',
  bdr:     '#E5E7EB',
  surface: '#F9FAFB',
  red:     '#EF4444',
  redBg:   '#FEF2F2',
};

// Material labels and product IDs now come from the live catalogue via
// PostStep2Screen (GET /api/products), which writes both the selected
// product IDs and their display names into the order draft. The old
// hardcoded MATERIAL_LABELS / MATERIAL_PRODUCT_MAP tables are gone: their
// guessed IDs did not match the real catalogue.

export default function PostStep4Screen({ navigation }) {
  const { language, setActiveOrder, updateUser, orderDraft, setOrderDraft, clearOrderDraft, saveAddress, user } = useApp();

  // Read all order data from context draft (populated by steps 1–3)
  const {
    type, slot, timeSlot, materials, materialNames, weight,
    address, addressLine1, addressLine2, landmark, pincode, addrType, coords,
  } = orderDraft;

  // Initialise photos/notes from draft so back-navigation restores them
  const [photos,     setPhotos]     = useState(orderDraft.photos ?? []);
  const [notes,      setNotes]      = useState(orderDraft.notes  ?? '');
  const [loading,    setLoading]    = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  // Selected product IDs, and the display names step 2 captured alongside them.
  const materialsList = (Array.isArray(materials) ? materials : (materials ? [materials] : []))
    .filter(id => Number.isInteger(id));
  const materialsLabel = (Array.isArray(materialNames) ? materialNames : []).join(', ');

  // ── Custom photo picker bottom sheet ──────────────────────────────────────
  const addPhoto = () => {
    if (photos.length >= 3) {
      Alert.alert('Maximum reached', 'You can add up to 3 photos.');
      return;
    }
    setPickerOpen(true);
  };

  const pickCamera = async () => {
    setPickerOpen(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access in Settings.');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({
      allowsEditing: false,   // No crop screen
      quality: 0.85,
    });
    if (!r.canceled && r.assets?.[0]) {
      setPhotos(p => {
        const next = [...p, r.assets[0]];
        setOrderDraft({ photos: next });
        return next;
      });
      setPhotoError('');
    }
  };

  const pickGallery = async () => {
    setPickerOpen(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access in Settings.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,   // No crop screen
      quality: 0.85,
    });
    if (!r.canceled && r.assets?.[0]) {
      setPhotos(p => {
        const next = [...p, r.assets[0]];
        setOrderDraft({ photos: next });
        return next;
      });
      setPhotoError('');
    }
  };

  // Upload helper — expo-file-system + worker /api/upload (Cloudinary).
  // Returns the URL on success; throws (with context) on failure so
  // handleSubmit can surface a real error to the user rather than silently
  // dropping photos and creating an order the admin can't view.
  const uploadPhotoUri = async (uri) => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const res = await uploadPhoto(base64, 'image/jpeg');
    const url = res?.data?.url;
    if (!url) throw new Error('Upload returned no URL');
    return url;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (photos.length < 1) {
      setPhotoError('At least 1 photo of your scrap is required');
      return;
    }
    setLoading(true);
    let photoUrls = [];
    try {
      // Uploads happen sequentially so a single failure aborts the batch
      // before we send an incomplete order to the server.
      for (const p of photos) {
        // eslint-disable-next-line no-await-in-loop
        photoUrls.push(await uploadPhotoUri(p.uri));
      }
    } catch (uploadErr) {
      setLoading(false);
      Alert.alert(
        language === 'ta' ? 'படம் பதிவேற்ற முடியவில்லை' : 'Photo upload failed',
        language === 'ta'
          ? 'உங்கள் இணைய இணைப்பை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.'
          : 'Please check your internet connection and try again.',
      );
      return;
    }
    try {

      // Selected products are already real catalogue IDs — just dedupe.
      const items = [...new Set(materialsList)].map(pid => ({ product_id: pid, quantity: 1 }));

      const payload = {
        type:             type || 'instant',
        address:          address || '',
        pincode:          pincode || null,
        lat:              coords?.lat || null,
        lng:              coords?.lng || null,
        slot_date:        type === 'scheduled' ? slot : null,
        slot_time:        type === 'scheduled' ? timeSlot : null,
        note:             notes,
        estimated_weight: weight || '30–50 kg',
        material:         materialsLabel,
        items,
        photo_urls:       photoUrls,
        photo_count:      photos.length,
        pickup_fee:       orderDraft.pickup_fee ?? 0,
      };

      const res = await postScrapRequest(payload);
      const backendOrder = res.data?.order;
      if (!backendOrder) throw new Error('No order returned from server');

      // Enrich order with display fields
      backendOrder.materials = backendOrder.materials || materialsList;
      backendOrder.material  = backendOrder.material  || materialsLabel;
      backendOrder.address   = backendOrder.address   || address;
      backendOrder.weight    = backendOrder.weight    || weight;

      // Save address for next order (pre-fills PostStep3)
      if (addressLine1 || address) {
        saveAddress({
          line1:    addressLine1 || '',
          line2:    addressLine2 || '',
          landmark: landmark     || '',
          pincode:  pincode      || '',
          addrType: addrType     || 'Home',
          coords:   coords       || null,
          label:    address      || '',
        }).catch(() => {});
      }
      // Also keep legacy savedAddress on user profile
      if (address) updateUser({ savedAddress: address }).catch(() => {});

      // Clear draft so next order starts fresh
      clearOrderDraft();

      setActiveOrder(backendOrder);
      navigation.reset({
        index: 0,
        routes: [
          { name: 'SellerTabs' },
          { name: 'OrderStatus', params: { order: backendOrder } },
        ],
      });
    } catch (err) {
      const errData = err?.response?.data || {};
      const msg = errData.error || err?.message || 'Could not submit your pickup request. Please check your internet and try again.';
      // Special-case the out-of-service-area rejection: offer the seller
      // an inline 'Notify Me' button so a rejection turns into demand
      // signal we can act on later.
      if (errData.out_of_service_area && errData.pincode) {
        Alert.alert(
          language === 'ta' ? 'சேவை கிடைக்கவில்லை' : 'Not in Service Area',
          msg,
          [
            { text: language === 'ta' ? 'சரி' : 'OK', style: 'cancel' },
            {
              text: language === 'ta' ? '🔔 Notify me' : '🔔 Notify me',
              onPress: async () => {
                try {
                  await joinPincodeWaitlist(errData.pincode, user?.mobile || null);
                  Alert.alert(
                    language === 'ta' ? 'சேர்க்கப்பட்டது ✓' : 'Added ✓',
                    language === 'ta'
                      ? 'இந்த பகுதியில் தொடங்கியவுடன் நாங்கள் WhatsApp செய்வோம்.'
                      : "We'll WhatsApp you the moment we open in your pincode.",
                  );
                } catch {
                  Alert.alert('Error', 'Could not join waitlist. Please try again.');
                }
              },
            },
          ],
        );
      } else {
        Alert.alert(language === 'ta' ? 'பிழை' : 'Submission Failed', msg, [{ text: language === 'ta' ? 'சரி' : 'OK' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{language === 'ta' ? 'ஸ்கிராப் பிக்கப்' : 'Post Scrap Pickup'}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepBar}>
        {[1, 2, 3, 4].map(s => (
          <View key={s} style={[styles.stepDot, s < 4 && styles.stepDotDone, s === 4 && styles.stepDotActive]}>
            <Text style={[styles.stepNum, s <= 4 && styles.stepNumActive]}>{s < 4 ? '✓' : s}</Text>
          </View>
        ))}
        <View style={styles.stepLine} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>{language === 'ta' ? 'புகைப்படங்கள் & மதிப்பாய்வு' : 'Photos & Review'}</Text>
        <Text style={styles.stepSub}>{language === 'ta' ? 'ஸ்கிராப் படங்கள் சேர்த்து உறுதிப்படுத்துங்கள்' : 'Add scrap photos and confirm your request'}</Text>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📋 {language === 'ta' ? 'சுருக்கம்' : 'Order Summary'}</Text>
          <SummaryRow
            label={language === 'ta' ? 'பிக்கப் வகை' : 'Pickup Type'}
            value={type === 'instant' ? '⚡ Instant (within 3 hrs)' : `📅 Scheduled — ${slot}, ${timeSlot}`}
          />
          <SummaryRow
            label={language === 'ta' ? 'பொருள்' : 'Material'}
            value={materialsLabel || '—'}
          />
          <SummaryRow
            label={language === 'ta' ? 'எடை' : 'Weight'}
            value={weight || '—'}
          />
          <SummaryRow
            label={language === 'ta' ? 'முகவரி' : 'Address'}
            value={address || '—'}
            last
          />
        </View>

        {/* Photos */}
        <Text style={styles.sectionLabel}>
          📸 {language === 'ta' ? 'ஸ்கிராப் புகைப்படங்கள்' : 'Scrap Photos'}
          <Text style={{ color: C.red }}> *</Text>
        </Text>
        <Text style={styles.photoHint}>
          {language === 'ta' ? 'குறைந்தது 1, அதிகபட்சம் 3' : 'Min 1, Max 3 — show the scrap clearly'}
        </Text>
        <View style={styles.photoRow}>
          {photos.map((p, i) => (
            <View key={i} style={styles.photoThumb}>
              <Image source={{ uri: p.uri }} style={styles.photoImg} />
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() => setPhotos(ph => { const next = ph.filter((_, j) => j !== i); setOrderDraft({ photos: next }); return next; })}
              >
                <Text style={styles.photoRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 3 && (
            <TouchableOpacity
              style={[styles.photoAdd, photoError && photos.length === 0 && { borderColor: C.red }]}
              onPress={addPhoto}
              activeOpacity={0.75}
            >
              <Text style={styles.photoAddIcon}>+</Text>
              <Text style={styles.photoAddText}>{photos.length === 0 ? 'Add' : 'Add more'}</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.photoCount}>{photos.length}/3 added</Text>
        {photoError ? <Text style={styles.errorText}>{photoError}</Text> : null}

        {/* Notes */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          📝 {language === 'ta' ? 'குறிப்புகள்' : 'Notes to Our Team'}{' '}
          ({language === 'ta' ? 'விரும்பினால்' : 'Optional'})
        </Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={t => { setNotes(t); setOrderDraft({ notes: t }); }}
          placeholder={language === 'ta' ? 'எங்கள் குழு-விடம் சொல்ல வேண்டுமா?' : 'Any special instructions for our team?'}
          placeholderTextColor={C.light}
          multiline
          numberOfLines={3}
          maxLength={300}
          textAlignVertical="top"
        />

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, photos.length < 1 && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={photos.length < 1 || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>
                ♻️ {language === 'ta' ? 'பிக்கப் கோரிக்கை அனுப்பு' : 'Post Pickup Request'}
              </Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Custom Photo Picker Bottom Sheet ── */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerOpen(false)}
        >
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>
              {language === 'ta' ? 'படம் சேர்க்கவும்' : 'Add Scrap Photo'}
            </Text>
            <Text style={styles.pickerSubtitle}>
              {photos.length}/3 — {language === 'ta' ? 'ஸ்கிராப்பை தெளிவாக காட்டுங்கள்' : 'show the scrap clearly'}
            </Text>

            <View style={styles.pickerButtons}>
              <TouchableOpacity style={styles.pickerBtn} onPress={pickCamera} activeOpacity={0.8}>
                <View style={[styles.pickerBtnIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={{ fontSize: 28 }}>📷</Text>
                </View>
                <Text style={styles.pickerBtnLabel}>
                  {language === 'ta' ? 'கேமரா' : 'Camera'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.pickerBtn} onPress={pickGallery} activeOpacity={0.8}>
                <View style={[styles.pickerBtnIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={{ fontSize: 28 }}>🖼️</Text>
                </View>
                <Text style={styles.pickerBtnLabel}>
                  {language === 'ta' ? 'படத்தொகுப்பு' : 'Gallery'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.pickerCancel} onPress={() => setPickerOpen(false)}>
              <Text style={styles.pickerCancelText}>
                {language === 'ta' ? 'ரத்து செய்' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, last }) {
  return (
    <View style={[sr.row, last && { borderBottomWidth: 0 }]}>
      <Text style={sr.label}>{label}</Text>
      <Text style={sr.value} numberOfLines={3}>{value}</Text>
    </View>
  );
}
const sr = StyleSheet.create({
  row:   { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', alignItems: 'flex-start' },
  label: { fontFamily: FONTS.medium, fontSize: 13, color: '#6B7280', flex: 1 },
  value: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#0A1628', flex: 2, textAlign: 'right' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bdr },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backText: { fontFamily: FONTS.bold, fontSize: 22, color: C.green },
  headerTitle: { fontFamily: FONTS.extraBold, fontSize: 17, color: C.text },

  stepBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8, position: 'relative' },
  stepDot:       { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: C.bdr, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { borderColor: C.green, backgroundColor: C.green },
  stepDotDone:   { borderColor: C.green, backgroundColor: C.mint },
  stepNum:       { fontFamily: FONTS.bold, fontSize: 13, color: C.light },
  stepNumActive: { color: C.green },
  stepLine:      { position: 'absolute', left: '20%', right: '20%', height: 2, backgroundColor: C.bdr, zIndex: -1 },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  stepTitle: { fontFamily: FONTS.black, fontSize: 22, color: C.text, marginBottom: 6 },
  stepSub:   { fontFamily: FONTS.regular, fontSize: 14, color: C.sub, marginBottom: 20 },

  summaryCard:  { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: C.bdr },
  summaryTitle: { fontFamily: FONTS.extraBold, fontSize: 14, color: C.text, marginBottom: 12 },

  sectionLabel: { fontFamily: FONTS.semiBold, fontSize: 14, color: C.text, marginBottom: 6 },
  photoHint:    { fontFamily: FONTS.regular, fontSize: 12, color: C.sub, marginBottom: 12 },
  photoRow:     { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  photoThumb:   { width: 90, height: 90, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoImg:     { width: '100%', height: '100%' },
  photoRemove:  { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  photoRemoveText: { color: '#fff', fontFamily: FONTS.black, fontSize: 10 },
  photoAdd:     { width: 90, height: 90, borderRadius: 12, borderWidth: 2, borderColor: C.green, borderStyle: 'dashed', backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  photoAddIcon: { fontSize: 26, color: C.green },
  photoAddText: { fontFamily: FONTS.semiBold, fontSize: 11, color: C.green },
  photoCount:   { fontFamily: FONTS.regular, fontSize: 12, color: C.sub, marginTop: 8 },
  errorText:    { fontFamily: FONTS.regular, fontSize: 12, color: C.red, marginTop: 4 },

  notesInput: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1.5,
    borderColor: C.bdr, padding: 14, fontFamily: FONTS.regular,
    fontSize: 14, color: C.text, minHeight: 90,
  },

  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.bdr },
  submitBtn: { backgroundColor: C.green, borderRadius: 16, paddingVertical: 17, alignItems: 'center', elevation: 4, shadowColor: C.green, shadowOpacity: 0.3, shadowRadius: 8 },
  submitDisabled: { backgroundColor: C.light, shadowOpacity: 0, elevation: 0 },
  submitText: { fontFamily: FONTS.extraBold, fontSize: 17, color: '#fff' },

  // Photo picker bottom sheet
  pickerOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 36, paddingTop: 12 },
  pickerHandle:    { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  pickerTitle:     { fontFamily: FONTS.extraBold, fontSize: 18, color: '#0A1628', textAlign: 'center', marginBottom: 4 },
  pickerSubtitle:  { fontFamily: FONTS.regular, fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 28 },
  pickerButtons:   { flexDirection: 'row', gap: 16, justifyContent: 'center', marginBottom: 20 },
  pickerBtn:       { alignItems: 'center', flex: 1 },
  pickerBtnIcon:   { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  pickerBtnLabel:  { fontFamily: FONTS.semiBold, fontSize: 14, color: '#0A1628' },
  pickerCancel:    { alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  pickerCancelText:{ fontFamily: FONTS.semiBold, fontSize: 15, color: '#6B7280' },
});
