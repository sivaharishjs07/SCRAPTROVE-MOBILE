/**
 * BulkPostFlow — 5-step bulk / industrial pickup request flow.
 * Mobile port of scrapx-seller-web/src/pages/BulkBookingFlow.jsx.
 *
 * Steps: Materials → Weight → Photos → Schedule → Confirm
 *
 * Differences from small-seller PostStep1..4:
 *  - Materials come from BULK_CATS (grouped, sub-types + custom)
 *  - Weight brackets are 500 kg – 10+ tons, no pickup fee
 *  - Address is auto-filled from seller.company_* fields (read-only summary)
 *  - Schedule is any date + 3 wide time slots (no admin availability gate)
 *  - Photos: 1..5 required, same as web
 *  - Submitted with bulk_materials JSON + is_bulk=1 on worker
 */
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useApp } from '../../context/AppContext';
import { postScrapRequest, uploadPhoto } from '../../services/api';
import { FONTS } from '../../constants/typography';

// ─── Design tokens ────────────────────────────────────────────────────────
const C = {
  bg:      '#F7F9F6',
  card:    '#FFFFFF',
  border:  '#E5E7EB',
  text:    '#0A1628',
  text2:   '#374151',
  sub:     '#6B7280',
  ph:      '#9CA3AF',
  light:   '#F3F4F6',
  green:   '#16A34A',
  greenLt: '#F0FDF4',
  greenBd: '#DCFCE7',
  blue:    '#3B82F6',
  blue600: '#1D4ED8',
  blueLt:  '#EFF6FF',
  blueBd:  '#DBEAFE',
  red:     '#EF4444',
  redLt:   '#FEF2F2',
  redBd:   '#FECACA',
  amber:   '#F59E0B',
  amberLt: '#FFFBEB',
  amberBd: '#FDE68A',
  amber700:'#92400E',
};

// ─── Category tree — mirrors web BulkBookingFlow.BULK_CATS ────────────────
// Electronic e-waste (computers, phones, circuit boards - anything that can
// hold data) is deliberately NOT offered. E-waste appliances are accepted
// (stored, recorded, passed on to registered recyclers) and are sold through
// the product catalogue, not this tree.
const BULK_CATS = [
  {
    key: 'metals', label: 'Metals', label_ta: 'உலோகங்கள்', icon: '🔩',
    subtypes: [
      { en: 'Iron',            ta: 'இரும்பு' },
      { en: 'Mild Steel',      ta: 'மைல்டு ஸ்டீல்' },
      { en: 'Mixed Iron',      ta: 'கலவை இரும்பு' },
      { en: 'Cast Iron',       ta: 'வார்ப்பிரும்பு' },
      { en: 'Steel',           ta: 'எஃகு' },
      { en: 'Stainless Steel', ta: 'ஸ்டெயின்லெஸ் ஸ்டீல்' },
      { en: 'Aluminium',       ta: 'அலுமினியம்' },
      { en: 'Brass',           ta: 'பித்தளை' },
      { en: 'Copper',          ta: 'செம்பு' },
      { en: 'Other (specify)', ta: 'மற்றது (குறிப்பிடவும்)' },
    ],
  },
  {
    key: 'paper', label: 'Paper & Boards', label_ta: 'காகிதம் & அட்டைகள்', icon: '📦',
    subtypes: [
      { en: 'Newspaper',                       ta: 'செய்தித்தாள்' },
      { en: 'Office Paper / White Paper',      ta: 'ஆபீஸ் / வெள்ளை காகிதம்' },
      { en: 'Cardboard / Corrugated Boxes',    ta: 'அட்டைப் பெட்டி' },
      { en: 'Hardboard / MDF Boards',          ta: 'ஹார்ட்போர்ட் / MDF' },
      { en: 'Books / Magazines',               ta: 'புத்தகம் / பத்திரிகை' },
      { en: 'Mixed Paper & Board',             ta: 'கலவை காகிதம்' },
      { en: 'Other (specify)',                 ta: 'மற்றது' },
    ],
  },
  {
    key: 'plastic', label: 'Plastics', label_ta: 'பிளாஸ்டிக்', icon: '♻️',
    subtypes: [
      { en: 'PET Bottles',    ta: 'PET பாட்டில்' },
      { en: 'HDPE Plastic',   ta: 'HDPE பிளாஸ்டிக்' },
      { en: 'PVC Plastic',    ta: 'PVC பிளாஸ்டிக்' },
      { en: 'PP Plastic',     ta: 'PP பிளாஸ்டிக்' },
      { en: 'Hard Plastic',   ta: 'கடின பிளாஸ்டிக்' },
      { en: 'Mixed Plastic',  ta: 'கலவை பிளாஸ்டிக்' },
      { en: 'Other (specify)', ta: 'மற்றது' },
    ],
  },
  {
    key: 'industrial', label: 'Industrial Scrap', label_ta: 'தொழிற்சாலை ஸ்கிராப்', icon: '⚙️',
    subtypes: [
      { en: 'Industrial Metal Scrap (MS / Steel / Aluminium)', ta: 'தொழிற்சாலை உலோக ஸ்கிராப்' },
      { en: 'Industrial Copper / Brass Scrap',                 ta: 'தொழிற்சாலை செம்பு / பித்தளை' },
      { en: 'Industrial Plastic Waste',                        ta: 'தொழிற்சாலை பிளாஸ்டிக்' },
      { en: 'Industrial Paper / Cardboard Waste',              ta: 'தொழிற்சாலை காகிதம் / அட்டை' },
      { en: 'Industrial Wire & Cable Scrap',                   ta: 'கம்பி / cable ஸ்கிராப்' },
      { en: 'Other (specify)',                                 ta: 'மற்றது' },
    ],
  },
];

const WEIGHT_OPTIONS = [
  { label: '500 kg – 1 ton',   ta: '500 கிலோ – 1 டன்' },
  { label: '1 ton – 2 tons',   ta: '1 – 2 டன்' },
  { label: '2 tons – 4 tons',  ta: '2 – 4 டன்' },
  { label: '4 tons – 8 tons',  ta: '4 – 8 டன்' },
  { label: '8 tons – 10 tons', ta: '8 – 10 டன்' },
  { label: 'More than 10 tons', ta: '10 டன்-க்கு மேல்' },
];

const TIME_SLOTS = ['9 AM – 12 PM', '12 PM – 3 PM', '3 PM – 6 PM'];

// ─── Main component ────────────────────────────────────────────────────────
export default function BulkPostFlow({ navigation }) {
  const { user, language, clearOrderDraft } = useApp();
  const isTa = language === 'ta';

  const [step, setStep]       = useState(1); // 1..5
  const [materials, setMats]  = useState([]); // [{ key, catLabel, subtype, customName }]
  const [weight, setWeight]   = useState('');
  const [photos, setPhotos]   = useState([]); // [{ uri }]
  const [slotDate, setDate]   = useState('');
  const [slotTime, setTime]   = useState('');
  const [loading, setLoading] = useState(false);

  const canStep2 = materials.length > 0;
  const canStep3 = !!weight;
  const canStep4 = photos.length >= 1;
  const canStep5 = !!slotDate && !!slotTime;

  const goNext = () => setStep(s => Math.min(5, s + 1));
  const goBack = () => (step === 1 ? navigation.goBack() : setStep(s => s - 1));

  // ── Photo capture / gallery ─────────────────────────────────────────────
  const addPhoto = async (fromCamera) => {
    if (photos.length >= 5) return Alert.alert(isTa ? 'அதிகபட்சம் 5' : 'Max 5 photos');
    const { status } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert(isTa ? 'அனுமதி தேவை' : 'Permission needed');
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setPhotos(prev => [...prev, { uri: res.assets[0].uri }]);
    }
  };

  const removePhoto = (i) => setPhotos(prev => prev.filter((_, idx) => idx !== i));

  // ── Submit (Confirm step) ───────────────────────────────────────────────
  const submit = async () => {
    setLoading(true);
    let photoUrls = [];
    try {
      for (const p of photos) {
        const b64 = await FileSystem.readAsStringAsync(p.uri, { encoding: FileSystem.EncodingType.Base64 });
        const r   = await uploadPhoto(b64, 'image/jpeg');
        const u   = r?.data?.url;
        if (!u) throw new Error('Photo upload failed');
        photoUrls.push(u);
      }
    } catch {
      setLoading(false);
      return Alert.alert(
        isTa ? 'படம் பதிவேற்ற முடியவில்லை' : 'Photo upload failed',
        isTa ? 'இணையம் சரிபார்க்கவும்' : 'Please check your connection and try again.',
      );
    }

    try {
      const materialsJson = JSON.stringify(materials.map(m => ({
        category: m.catLabel,
        item:     m.subtype === 'Other (specify)' ? (m.customName || 'Custom') : m.subtype,
      })));
      const address = user?.company_address
        || [user?.company_door_no, user?.company_street, user?.company_locality,
            user?.city, user?.district, user?.state, user?.company_pincode]
             .filter(Boolean).join(', ');
      const payload = {
        type:             'scheduled',
        address,
        pincode:          user?.company_pincode || null,
        lat:              user?.company_lat || null,
        lng:              user?.company_lng || null,
        items:            [],
        bulk_materials:   materialsJson,
        estimated_weight: weight,
        slot_date:        slotDate,
        slot_time:        slotTime,
        photo_urls:       photoUrls,
        photo_count:      photoUrls.length,
        note:             `Bulk order — ${materials.length} material type(s)`,
      };
      const res = await postScrapRequest(payload);
      if (!res.data?.order && !res.data?.success) {
        throw new Error(res.data?.error || 'Failed to place order');
      }
      clearOrderDraft?.();
      Alert.alert(
        isTa ? 'கோரிக்கை பதிவாகியது ✓' : 'Order placed ✓',
        isTa
          ? 'எங்கள் Scrap Trove குழு விரைவில் உங்களைத் தொடர்பு கொள்ளும்.'
          : 'Our Scrap Trove team will review and contact you shortly with rates.',
        [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'SellerTabs' }] }) }],
      );
    } catch (e) {
      Alert.alert(isTa ? 'பிழை' : 'Error', e?.response?.data?.error || e.message || 'Failed to submit');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <FlowHeader step={step} onClose={() => navigation.goBack()} isTa={isTa} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {step === 1 && (
          <MaterialsStep isTa={isTa} materials={materials} setMats={setMats} onNext={goNext} canNext={canStep2} />
        )}
        {step === 2 && (
          <WeightStep    isTa={isTa} value={weight} onChange={setWeight} onNext={goNext} onBack={goBack} canNext={canStep3} />
        )}
        {step === 3 && (
          <PhotosStep    isTa={isTa} photos={photos} onAdd={addPhoto} onRemove={removePhoto} onNext={goNext} onBack={goBack} canNext={canStep4} />
        )}
        {step === 4 && (
          <ScheduleStep  isTa={isTa} slotDate={slotDate} slotTime={slotTime} setDate={setDate} setTime={setTime} onNext={goNext} onBack={goBack} canNext={canStep5} />
        )}
        {step === 5 && (
          <ConfirmStep   isTa={isTa} user={user} materials={materials} weight={weight} photos={photos} slotDate={slotDate} slotTime={slotTime} onBack={goBack} onSubmit={submit} loading={loading} />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Header w/ step indicator ─────────────────────────────────────────────
function FlowHeader({ step, onClose, isTa }) {
  const labels = isTa
    ? ['பொருள்', 'எடை', 'படங்கள்', 'நேரம்', 'உறுதிசெய்']
    : ['Materials', 'Weight', 'Photos', 'Schedule', 'Confirm'];
  return (
    <View style={styles.header}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
        <Text style={styles.headerTitle}>
          🏭 {isTa ? 'Bulk பிக்-அப்' : 'Bulk Pickup'}
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={{ fontSize: 18, color: C.sub }}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.headerSub}>
        {isTa ? `படி ${step} / 5 · ${labels[step - 1]}` : `Step ${step} of 5 · ${labels[step - 1]}`}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(step / 5) * 100}%` }]} />
      </View>
    </View>
  );
}

// ─── Step 1 — Materials ────────────────────────────────────────────────────
function MaterialsStep({ isTa, materials, setMats, onNext, canNext }) {
  const [openKey, setOpenKey] = useState(null);

  const toggle = (cat, subtype) => {
    const catLabel = cat.label; // canonical English label for the payload
    const isPicked = materials.some(m => m.catLabel === catLabel && m.subtype === subtype);
    if (isPicked) {
      setMats(materials.filter(m => !(m.catLabel === catLabel && m.subtype === subtype)));
    } else {
      setMats([...materials, { key: cat.key, catLabel, subtype, customName: '' }]);
    }
  };

  const setCustomName = (cat, subtype, val) => {
    setMats(materials.map(m =>
      (m.catLabel === cat.label && m.subtype === subtype) ? { ...m, customName: val } : m,
    ));
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.stepBody} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerTitle}>
            {isTa ? '💬 விலை WhatsApp-இல் தெரிவிக்கப்படும்' : '💬 No prices shown — Scrap Trove will contact you'}
          </Text>
          <Text style={styles.infoBannerBody}>
            {isTa
              ? 'எங்கள் குழு உங்கள் பொருட்கள் மற்றும் அளவை மறு-ஆய்வு செய்து சிறந்த விலை உடன் தொடர்பு கொள்ளும்.'
              : 'Our team will review your materials and contact you with the best price based on your scrap.'}
          </Text>
        </View>

        <Text style={styles.stepLabel}>
          {isTa ? `பொருட்கள் தேர்ந்தெடுக்கவும் (${materials.length} தேர்ந்தெடுத்தது)` : `SELECT MATERIALS (${materials.length} SELECTED)`}
        </Text>

        {BULK_CATS.map(cat => {
          const isOpen = openKey === cat.key;
          const selectedInCat = materials.filter(m => m.catLabel === cat.label).length;
          return (
            <View key={cat.key} style={styles.catCard}>
              <TouchableOpacity
                style={styles.catHeader}
                onPress={() => setOpenKey(isOpen ? null : cat.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={styles.catLabel}>{isTa ? cat.label_ta : cat.label}</Text>
                {selectedInCat > 0 && (
                  <View style={styles.catBadge}>
                    <Text style={styles.catBadgeText}>{selectedInCat}</Text>
                  </View>
                )}
                <Text style={styles.catChevron}>{isOpen ? '▴' : '▾'}</Text>
              </TouchableOpacity>
              {isOpen && (
                <View style={styles.subList}>
                  {cat.subtypes.map(sub => {
                    const isPicked = materials.some(m => m.catLabel === cat.label && m.subtype === sub.en);
                    const pickedItem = materials.find(m => m.catLabel === cat.label && m.subtype === sub.en);
                    const isOther = sub.en === 'Other (specify)';
                    return (
                      <View key={sub.en}>
                        <TouchableOpacity
                          style={[styles.subRow, isPicked && styles.subRowPicked]}
                          onPress={() => toggle(cat, sub.en)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.checkbox, isPicked && styles.checkboxPicked]}>
                            {isPicked && <Text style={styles.checkTick}>✓</Text>}
                          </View>
                          <Text style={[styles.subLabel, isPicked && styles.subLabelPicked]}>
                            {isTa ? sub.ta : sub.en}
                          </Text>
                        </TouchableOpacity>
                        {isPicked && isOther && (
                          <TextInput
                            style={styles.customInput}
                            value={pickedItem?.customName || ''}
                            onChangeText={(v) => setCustomName(cat, sub.en, v)}
                            placeholder={isTa ? 'குறிப்பிட்ட பொருள்' : 'e.g. GI wire, brass turnings'}
                            placeholderTextColor={C.ph}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      <FooterBar isTa={isTa} onNext={onNext} disabled={!canNext} nextLabelEn="Continue → Weight" nextLabelTa="தொடர் → எடை" />
    </>
  );
}

// ─── Step 2 — Weight ───────────────────────────────────────────────────────
function WeightStep({ isTa, value, onChange, onNext, onBack, canNext }) {
  return (
    <>
      <ScrollView contentContainerStyle={styles.stepBody} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepLabel}>
          {isTa ? 'மொத்த எடை (தோராயம்)' : 'ESTIMATED TOTAL WEIGHT'}
        </Text>
        <Text style={styles.stepHint}>
          {isTa
            ? 'குறைந்தபட்ச பிக்-அப் — 500 கிலோ. இதற்கு குறைவாக இருந்தால், சிறிய விற்பனையாளர் கணக்கை பயன்படுத்தவும்.'
            : 'Minimum bulk pickup — 500 kg. For smaller loads, use a Small Seller account.'}
        </Text>
        {WEIGHT_OPTIONS.map(w => (
          <TouchableOpacity
            key={w.label}
            style={[styles.weightCard, value === w.label && styles.weightCardActive]}
            onPress={() => onChange(w.label)}
            activeOpacity={0.7}
          >
            <Text style={[styles.weightText, value === w.label && styles.weightTextActive]}>
              {isTa ? w.ta : w.label}
            </Text>
            <View style={[styles.radio, value === w.label && styles.radioActive]}>
              {value === w.label && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <FooterBar isTa={isTa} onBack={onBack} onNext={onNext} disabled={!canNext} nextLabelEn="Continue → Photos" nextLabelTa="தொடர் → படங்கள்" />
    </>
  );
}

// ─── Step 3 — Photos ───────────────────────────────────────────────────────
function PhotosStep({ isTa, photos, onAdd, onRemove, onNext, onBack, canNext }) {
  return (
    <>
      <ScrollView contentContainerStyle={styles.stepBody} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepLabel}>{isTa ? 'ஸ்கிராப் படங்கள்' : 'SCRAP PHOTOS'}</Text>
        <Text style={styles.stepHint}>
          {isTa ? 'குறைந்தபட்சம் 1 · அதிகபட்சம் 5 · உங்கள் ஸ்கிராப்-இன் தெளிவான படங்கள் எடுக்கவும்.'
                : 'Minimum 1, maximum 5. Clear photos help us quote accurately.'}
        </Text>
        <View style={styles.photoGrid}>
          {photos.map((p, i) => (
            <View key={i} style={styles.photoTile}>
              <Image source={{ uri: p.uri }} style={styles.photoImg} />
              <TouchableOpacity style={styles.photoRemove} onPress={() => onRemove(i)}>
                <Text style={{ color: '#fff', fontSize: 16, fontFamily: FONTS.bold }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 5 && (
            <View style={styles.photoAddRow}>
              <TouchableOpacity style={styles.photoAddBtn} onPress={() => onAdd(true)} activeOpacity={0.8}>
                <Text style={styles.photoAddIcon}>📸</Text>
                <Text style={styles.photoAddText}>{isTa ? 'கேமரா' : 'Camera'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoAddBtn} onPress={() => onAdd(false)} activeOpacity={0.8}>
                <Text style={styles.photoAddIcon}>🖼️</Text>
                <Text style={styles.photoAddText}>{isTa ? 'கேலரி' : 'Gallery'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Text style={styles.photoCount}>
          {photos.length === 0
            ? (isTa ? '📸 குறைந்தபட்சம் 1 படம் தேவை' : '📸 Minimum 1 photo required')
            : `✓ ${photos.length}/5 ${isTa ? 'படம் சேர்க்கப்பட்டது' : 'photos added'}`}
        </Text>
      </ScrollView>
      <FooterBar isTa={isTa} onBack={onBack} onNext={onNext} disabled={!canNext} nextLabelEn="Continue → Schedule" nextLabelTa="தொடர் → நேரம்" />
    </>
  );
}

// ─── Step 4 — Schedule ────────────────────────────────────────────────────
function ScheduleStep({ isTa, slotDate, slotTime, setDate, setTime, onNext, onBack, canNext }) {
  // Bulk gets any date — build next 30 days as chips
  const options = useMemo(() => {
    const out = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push({ iso, label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) });
    }
    return out;
  }, []);

  const [dateOpen, setDateOpen] = useState(false);
  const chosenLabel = options.find(o => o.iso === slotDate)?.label
    || (isTa ? 'தேதி தேர்ந்தெடுக்கவும்' : 'Choose date');

  return (
    <>
      <ScrollView contentContainerStyle={styles.stepBody} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepLabel}>{isTa ? 'விருப்பமான தேதி' : 'PREFERRED DATE'}</Text>
        <Text style={styles.stepHint}>
          {isTa ? 'Bulk பிக்-அப்-க்கு எந்த தேதியும் தேர்ந்தெடுக்கலாம்.'
                : 'Bulk pickups can be scheduled any day within the next 30 days.'}
        </Text>
        <TouchableOpacity style={styles.pickerBtn} onPress={() => setDateOpen(true)} activeOpacity={0.7}>
          <Text style={styles.pickerIcon}>📅</Text>
          <Text style={[styles.pickerText, !slotDate && { color: C.ph }]}>
            {chosenLabel}
          </Text>
          <Text style={{ color: C.sub }}>▾</Text>
        </TouchableOpacity>

        <Text style={[styles.stepLabel, { marginTop: 20 }]}>
          {isTa ? 'நேர இடைவெளி' : 'TIME SLOT'}
        </Text>
        {TIME_SLOTS.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.weightCard, slotTime === t && styles.weightCardActive]}
            onPress={() => setTime(t)}
            activeOpacity={0.7}
          >
            <Text style={[styles.weightText, slotTime === t && styles.weightTextActive]}>{t}</Text>
            <View style={[styles.radio, slotTime === t && styles.radioActive]}>
              {slotTime === t && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal transparent animationType="fade" visible={dateOpen} onRequestClose={() => setDateOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDateOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{isTa ? 'தேதி தேர்ந்தெடு' : 'Pick a date'}</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {options.map(o => (
                <TouchableOpacity
                  key={o.iso}
                  style={[styles.modalItem, slotDate === o.iso && { backgroundColor: C.greenLt }]}
                  onPress={() => { setDate(o.iso); setDateOpen(false); }}
                >
                  <Text style={styles.modalItemText}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <FooterBar isTa={isTa} onBack={onBack} onNext={onNext} disabled={!canNext} nextLabelEn="Continue → Confirm" nextLabelTa="தொடர் → உறுதிசெய்" />
    </>
  );
}

// ─── Step 5 — Confirm ─────────────────────────────────────────────────────
function ConfirmStep({ isTa, user, materials, weight, photos, slotDate, slotTime, onBack, onSubmit, loading }) {
  const address = user?.company_address
    || [user?.company_door_no, user?.company_street, user?.company_locality,
        user?.city, user?.district, user?.state, user?.company_pincode].filter(Boolean).join(', ');
  const fmt = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };
  return (
    <>
      <ScrollView contentContainerStyle={styles.stepBody} showsVerticalScrollIndicator={false}>
        <View style={styles.reviewBanner}>
          <Text style={styles.reviewEmoji}>🏭</Text>
          <Text style={styles.reviewTitle}>
            {isTa ? 'Scrap Trove குழு மறு-ஆய்வு செய்யும்' : 'Scrap Trove Team Will Review'}
          </Text>
          <Text style={styles.reviewBody}>
            {isTa
              ? 'உங்கள் bulk கோரிக்கையை ஆய்வு செய்து, உங்கள் ஸ்கிராப் மற்றும் அளவின் அடிப்படையில் சிறந்த விலையுடன் தொடர்பு கொள்வோம்.'
              : 'Our team will review your bulk order and contact you with the best price based on your scrap.'}
          </Text>
        </View>

        {/* Company */}
        <SummaryCard title={isTa ? 'நிறுவனம்' : 'COMPANY'}>
          <SummaryRow label={isTa ? 'நிறுவனம்' : 'Company'}  value={user?.company_name || '—'} />
          <SummaryRow label={isTa ? 'தொடர்பு' : 'Contact'}    value={`${user?.name || '—'}${user?.designation ? ` (${user.designation})` : ''}`} />
          <SummaryRow label={isTa ? 'முகவரி' : 'Address'}    value={address || '—'} />
          <SummaryRow label={isTa ? 'துறை' : 'Sector'}       value={user?.company_sector || '—'} />
        </SummaryCard>

        {/* Materials */}
        <SummaryCard title={`${isTa ? 'பொருட்கள்' : 'MATERIALS'} (${materials.length})`}>
          {materials.map((m, i) => (
            <View key={i} style={styles.matChip}>
              <Text style={styles.matChipText}>
                ✓ {m.catLabel} – {m.subtype === 'Other (specify)' ? (m.customName || 'Custom') : m.subtype}
              </Text>
            </View>
          ))}
        </SummaryCard>

        {/* Pickup */}
        <SummaryCard title={isTa ? 'பிக்-அப் விவரங்கள்' : 'PICKUP DETAILS'}>
          <SummaryRow label={isTa ? '⚖️ எடை' : '⚖️ Weight'} value={weight} />
          <SummaryRow label={isTa ? '📅 தேதி' : '📅 Date'}   value={fmt(slotDate)} />
          <SummaryRow label={isTa ? '⏰ நேரம்' : '⏰ Time'}   value={slotTime} />
          <View style={{ marginTop: 8 }}>
            <Text style={styles.subLabelMuted}>📸 {isTa ? 'படங்கள்' : 'Photos'} ({photos.length})</Text>
            <View style={styles.thumbRow}>
              {photos.map((p, i) => (
                <Image key={i} source={{ uri: p.uri }} style={styles.thumb} />
              ))}
            </View>
          </View>
        </SummaryCard>

        <View style={styles.priceNote}>
          <Text style={{ fontSize: 18 }}>💡</Text>
          <Text style={styles.priceNoteText}>
            {isTa
              ? 'உங்கள் கோரிக்கையை ஆய்வு செய்த பிறகு எங்கள் Scrap Trove குழு விலையை தெரிவிக்கும்.'
              : 'Price will be communicated by our Scrap Trove team after reviewing your order.'}
          </Text>
        </View>
      </ScrollView>
      <FooterBar
        isTa={isTa}
        onBack={onBack}
        onNext={onSubmit}
        disabled={loading}
        loading={loading}
        nextLabelEn="Place Bulk Order"
        nextLabelTa="Bulk கோரிக்கை பதிவிடு"
      />
    </>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────
function SummaryCard({ title, children }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{title}</Text>
      {children}
    </View>
  );
}
function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryRowLabel}>{label}</Text>
      <Text style={styles.summaryRowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function FooterBar({ isTa, onBack, onNext, disabled, loading, nextLabelEn, nextLabelTa }) {
  return (
    <View style={styles.footer}>
      {onBack && (
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.75}>
          <Text style={styles.backBtnText}>{isTa ? '‹ பின்னால்' : '‹ Back'}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.nextBtn, disabled && styles.nextBtnDisabled]}
        onPress={onNext}
        disabled={disabled || loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.nextBtnText}>{(isTa ? nextLabelTa : nextLabelEn) + ' →'}</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontFamily: FONTS.black, fontSize: 17, color: C.text },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  headerSub: { paddingHorizontal: 16, paddingBottom: 8, color: C.sub, fontSize: 12, fontFamily: FONTS.semiBold },
  progressTrack: { height: 3, backgroundColor: C.border },
  progressFill:  { height: 3, backgroundColor: C.blue },

  stepBody: { padding: 16, paddingBottom: 40 },
  stepLabel: { fontFamily: FONTS.bold, fontSize: 11, color: C.sub, letterSpacing: 0.8, marginBottom: 6 },
  stepHint:  { fontFamily: FONTS.regular, fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 18 },

  infoBanner: {
    backgroundColor: C.blueLt, borderColor: C.blueBd, borderWidth: 1,
    borderRadius: 14, padding: 14, marginBottom: 20,
  },
  infoBannerTitle: { fontFamily: FONTS.bold, fontSize: 13, color: C.blue600, marginBottom: 4 },
  infoBannerBody:  { fontFamily: FONTS.regular, fontSize: 12, color: '#1E3A8A', lineHeight: 17 },

  catCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: 'hidden' },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  catIcon: { fontSize: 20 },
  catLabel: { flex: 1, fontFamily: FONTS.bold, fontSize: 14, color: C.text },
  catBadge: { backgroundColor: C.green, minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  catBadgeText: { fontFamily: FONTS.bold, fontSize: 11, color: '#fff' },
  catChevron: { fontSize: 14, color: C.sub, marginLeft: 4 },
  subList: { borderTopWidth: 1, borderTopColor: C.border, backgroundColor: '#FAFAFA' },
  subRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  subRowPicked: { backgroundColor: C.greenLt },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  checkboxPicked: { backgroundColor: C.green, borderColor: C.green },
  checkTick: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  subLabel: { flex: 1, fontFamily: FONTS.regular, fontSize: 13, color: C.text2 },
  subLabelPicked: { fontFamily: FONTS.semiBold, color: C.green },
  customInput: {
    marginHorizontal: 12, marginBottom: 10, marginTop: -2,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 13, color: C.text,
  },

  weightCard: {
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
    padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center',
  },
  weightCardActive: { borderColor: C.green, backgroundColor: C.greenLt },
  weightText: { flex: 1, fontFamily: FONTS.bold, fontSize: 14, color: C.text },
  weightTextActive: { color: C.green },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: C.green, backgroundColor: C.green },
  radioDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoTile: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoImg:  { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  photoAddRow: { flexDirection: 'row', gap: 10 },
  photoAddBtn: {
    width: 100, height: 100, borderRadius: 12,
    backgroundColor: C.card, borderWidth: 2, borderStyle: 'dashed', borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  photoAddIcon: { fontSize: 24, marginBottom: 4 },
  photoAddText: { fontFamily: FONTS.bold, fontSize: 11, color: C.sub },
  photoCount: { marginTop: 14, fontFamily: FONTS.semiBold, fontSize: 13, color: C.sub, textAlign: 'center' },

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  pickerIcon: { fontSize: 18 },
  pickerText: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 14, color: C.text },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 15, color: C.text, marginBottom: 10 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  modalItemText: { fontFamily: FONTS.regular, fontSize: 14, color: C.text },

  reviewBanner: {
    backgroundColor: C.blue600, borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 16,
  },
  reviewEmoji: { fontSize: 28, marginBottom: 6 },
  reviewTitle: { fontFamily: FONTS.bold, fontSize: 15, color: '#fff', marginBottom: 4, textAlign: 'center' },
  reviewBody:  { fontFamily: FONTS.regular, fontSize: 12, color: '#DBEAFE', textAlign: 'center', lineHeight: 17 },

  summaryCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  summaryTitle: { fontFamily: FONTS.bold, fontSize: 11, color: C.sub, letterSpacing: 0.8, marginBottom: 10 },
  summaryRow:   { flexDirection: 'row', gap: 10, marginBottom: 6 },
  summaryRowLabel: { fontFamily: FONTS.semiBold, fontSize: 12, color: C.sub, minWidth: 72 },
  summaryRowValue: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 12, color: C.text },
  subLabelMuted: { fontFamily: FONTS.regular, fontSize: 12, color: C.sub, marginBottom: 6 },
  thumbRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  thumb:    { width: 56, height: 56, borderRadius: 8, borderWidth: 2, borderColor: C.green },
  matChip:  { backgroundColor: C.greenLt, borderColor: C.greenBd, borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 6 },
  matChipText: { fontFamily: FONTS.semiBold, fontSize: 12, color: C.green },
  priceNote: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.amberLt, borderColor: C.amberBd, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 4 },
  priceNoteText: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 12, color: C.amber700, lineHeight: 17 },

  footer: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  backBtn: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, backgroundColor: C.light, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: C.text2 },
  nextBtn: { flex: 1, backgroundColor: C.green, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  nextBtnDisabled: { backgroundColor: C.border },
  nextBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: '#fff' },
});
