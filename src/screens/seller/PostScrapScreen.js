import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Image, ActivityIndicator, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useApp } from '../../context/AppContext';
import { t } from '../../constants/translations';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { postScrapRequest } from '../../services/api';

const MATERIALS = [
  { id: 'iron',        label_en: 'Iron / Steel',       label_ta: 'இரும்பு / எஃகு',      emoji: '🔩' },
  { id: 'copper',      label_en: 'Copper / Brass',      label_ta: 'தாமிரம் / பித்தளை',   emoji: '🟠' },
  { id: 'paper',       label_en: 'Paper / Cardboard',   label_ta: 'காகிதம் / அட்டை',     emoji: '📰' },
  { id: 'plastic',     label_en: 'Plastic',             label_ta: 'பிளாஸ்டிக்',          emoji: '🧴' },
  { id: 'electronics', label_en: 'Electronics',         label_ta: 'மின்னணு பொருட்கள்',   emoji: '📺' },
  { id: 'mixed',       label_en: 'Mixed / Other',       label_ta: 'கலவை / மற்றவை',       emoji: '🗃️' },
];

export default function PostScrapScreen({ navigation }) {
  const { language, setActiveOrder } = useApp();
  const [photos, setPhotos]           = useState([]);
  const [material, setMaterial]       = useState(null);
  const [weight, setWeight]           = useState(null);
  const [location, setLocation]       = useState(null);
  const [locationText, setLocationText] = useState('');
  const [notes, setNotes]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [locLoading, setLocLoading]   = useState(false);

  useEffect(() => { fetchLocation(); }, []);

  const fetchLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error', language), t('location_denied', language));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      const geo = await Location.reverseGeocodeAsync(pos.coords);
      if (geo.length > 0) {
        const g = geo[0];
        setLocationText(`${g.name || ''} ${g.street || ''}, ${g.district || g.city || ''}`);
      }
    } catch { /* silently fail */ }
    setLocLoading(false);
  };

  const pickPhoto = async (fromCamera) => {
    if (photos.length >= 3) {
      Alert.alert(t('error', language), t('max_photos', language));
      return;
    }
    const { status } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: false });

    if (!result.canceled) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index) => setPhotos(photos.filter((_, i) => i !== index));

  const showPhotoPicker = () => {
    Alert.alert(
      language === 'ta' ? 'புகைப்படம்' : 'Add Photo',
      '',
      [
        { text: language === 'ta' ? 'கேமரா' : 'Camera',  onPress: () => pickPhoto(true) },
        { text: language === 'ta' ? 'கேலரி' : 'Gallery', onPress: () => pickPhoto(false) },
        { text: t('cancel', language), style: 'cancel' },
      ]
    );
  };

  const canPost = photos.length >= 1 && material && weight && location;

  const handlePost = async () => {
    if (!canPost) return;
    setLoading(true);
    try {
      const formData = new FormData();
      photos.forEach((uri, i) => {
        formData.append('photos', { uri, name: `scrap_${i}.jpg`, type: 'image/jpeg' });
      });
      formData.append('material', material);
      formData.append('estimated_weight', weight);
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
      formData.append('notes', notes);

      const res = await postScrapRequest(formData);
      const order = res.data.order;
      setActiveOrder(order);
      navigation.replace('OrderStatus', { order });
    } catch {
      // Demo mode
      const mockOrder = {
        id: Date.now().toString(),
        material, photos, status: 'broadcast', locationText,
      };
      setActiveOrder(mockOrder);
      navigation.replace('OrderStatus', { order: mockOrder });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>

      {/* Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBack}>
          <Text style={styles.navBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{t('post_scrap_title', language)}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'ta' ? '📸 புகைப்படங்கள்' : '📸 Photos'}
            <Text style={styles.required}> *</Text>
          </Text>
          <Text style={styles.sectionSub}>
            {language === 'ta' ? 'குறைந்தது 1, அதிகபட்சம் 3' : 'Min 1, Max 3 photos'}
          </Text>
          <View style={styles.photoRow}>
            {photos.map((uri, i) => (
              <View key={i} style={styles.photoBox}>
                <Image source={{ uri }} style={styles.photo} />
                <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(i)}>
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 3 && (
              <TouchableOpacity style={styles.addPhotoBox} onPress={showPhotoPicker}>
                <Text style={styles.addPhotoIcon}>+</Text>
                <Text style={styles.addPhotoText}>{language === 'ta' ? 'சேர்' : 'Add'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Material */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('select_material', language)}<Text style={styles.required}> *</Text>
          </Text>
          <View style={styles.materialGrid}>
            {MATERIALS.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.materialCard, material === m.id && styles.materialCardActive]}
                onPress={() => setMaterial(m.id)}
              >
                <Text style={styles.materialEmoji}>{m.emoji}</Text>
                <Text style={[styles.materialLabel, material === m.id && { color: COLORS.primary }]}>
                  {language === 'ta' ? m.label_ta : m.label_en}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weight Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ⚖️ {language === 'ta' ? 'எடை அளவு' : 'Estimated Weight'}
            <Text style={styles.required}> *</Text>
          </Text>
          <View style={styles.minWeightBadge}>
            <Text style={styles.minWeightText}>
              {language === 'ta' ? 'குறைந்தது 10 கிலோ தேவை' : 'Minimum 10 kg per pickup'}
            </Text>
          </View>
          {['10–20 kg', '20–30 kg', '30–50 kg', '50–100 kg', '100+ kg'].map(w => (
            <TouchableOpacity
              key={w}
              style={[styles.weightOption, weight === w && styles.weightOptionActive]}
              onPress={() => setWeight(w)}
            >
              <Text style={[styles.weightOptionText, weight === w && styles.weightOptionTextActive]}>{w}</Text>
              <View style={[styles.weightRadio, weight === w && styles.weightRadioActive]}>
                {weight === w && <View style={styles.weightRadioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📍 {t('location', language)}<Text style={styles.required}> *</Text>
          </Text>
          <View style={styles.locationBox}>
            {locLoading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <>
                <Text style={styles.locationText} numberOfLines={2}>
                  {locationText || t('detecting_location', language)}
                </Text>
                <TouchableOpacity onPress={fetchLocation} style={styles.refreshLoc}>
                  <Text style={styles.refreshLocText}>↻</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 {t('add_notes', language)}</Text>
          <TextInput
            style={styles.notesInput}
            placeholder={t('notes_placeholder', language)}
            placeholderTextColor={COLORS.textLight}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Post Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={!canPost || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.postBtnText}>{t('post_request', language)}</Text>
          }
        </TouchableOpacity>
      </View>
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
  navBack: { width: 36, height: 36, justifyContent: 'center' },
  navBackText: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.primary },
  navTitle: { fontFamily: FONTS.extraBold, fontSize: 17, color: COLORS.text },
  scroll: { flex: 1 },
  section: { padding: 16, marginBottom: 4 },
  sectionTitle: { fontFamily: FONTS.extraBold, fontSize: 15, color: COLORS.text, marginBottom: 4 },
  sectionSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 },
  required: { color: COLORS.error },
  photoRow: { flexDirection: 'row', gap: 10 },
  photoBox: { width: 90, height: 90, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  removePhoto: {
    position: 'absolute', top: 4, right: 4, width: 22, height: 22,
    backgroundColor: COLORS.error, borderRadius: 11, justifyContent: 'center', alignItems: 'center',
  },
  removePhotoText: { color: '#fff', fontFamily: FONTS.extraBold, fontSize: 11 },
  addPhotoBox: {
    width: 90, height: 90, borderRadius: 12, borderWidth: 2,
    borderColor: COLORS.primary, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primaryLight,
  },
  addPhotoIcon: { fontSize: 28, color: COLORS.primary },
  addPhotoText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.primary },
  minWeightBadge: {
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12,
  },
  minWeightText: { fontFamily: FONTS.bold, fontSize: 12, color: '#92400E' },
  weightOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, marginBottom: 8,
  },
  weightOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  weightOptionText: { fontFamily: FONTS.extraBold, fontSize: 15, color: COLORS.text },
  weightOptionTextActive: { color: COLORS.primary },
  weightRadio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
  },
  weightRadioActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  weightRadioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  materialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  materialCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
    minWidth: '46%',
  },
  materialCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  materialEmoji: { fontSize: 18 },
  materialLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text, flex: 1 },
  locationBox: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1.5,
    borderColor: COLORS.border, padding: 14, flexDirection: 'row', alignItems: 'center', minHeight: 56,
  },
  locationText: { flex: 1, fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  refreshLoc: { marginLeft: 10, padding: 4 },
  refreshLocText: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.primary },
  notesInput: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1.5,
    borderColor: COLORS.border, padding: 14,
    fontFamily: FONTS.regular, fontSize: 14, color: COLORS.text,
    minHeight: 80, textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface, padding: 16, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  postBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 17,
    alignItems: 'center', elevation: 4,
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8,
  },
  postBtnDisabled: { backgroundColor: COLORS.textLight, shadowOpacity: 0 },
  postBtnText: { color: '#fff', fontFamily: FONTS.extraBold, fontSize: 17 },
});
