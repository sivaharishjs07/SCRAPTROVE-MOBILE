import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert, Modal, FlatList, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ensurePermission } from '../../services/permissions';
import { getPendingToken, clearPendingToken } from '../../services/authToken';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';
import { useLocations, statesList, districts, cities, getCityIdAsync } from '../../constants/locations';
import { VEHICLES } from '../../constants/vehicles';
import { PickerModal, PickerBtn } from '../../components/LocationPickerModal';
import { sellerSetup, dealerRegister } from '../../services/api';
import { uploadPhotoAssets, uploadErrorMessage, deleteLocalPhotos } from '../../services/photoUpload';

// ─── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:      '#FFFFFF',
  greenMid:'#16A34A',
  mint:    '#F0FDF4',
  mintBdr: '#DCFCE7',
  text:    '#0A1628',
  sub:     '#6B7280',
  light:   '#9CA3AF',
  bdr:     '#E5E7EB',
  surface: '#F9FAFB',
  amber:   '#F59E0B',
  amberBg: '#FFFBEB',
  amberBdr:'#FDE68A',
  red:     '#EF4444',
  redBg:   '#FEF2F2',
};

// PickerModal and PickerBtn are imported from ../../components/LocationPickerModal

// ─── Reusable field components ────────────────────────────────────────────────
function FieldInput({ label, value, onChangeText, placeholder, keyboardType = 'default',
  maxLength, autoCapitalize = 'sentences', error }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, focused && styles.fieldFocused, error && styles.fieldError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.light}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// FieldPicker replaced by shared PickerBtn from LocationPickerModal

// ─── Photo Grid (1–3 photos, Camera + Gallery) ──────────────────────────────────
function PhotoGrid({ label, hint, photos, onAdd, onRemove, error }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint ? <Text style={[styles.errorText, { color: C.sub, marginTop: -2, marginBottom: 8 }]}>{hint}</Text> : null}
      <View style={pg.row}>
        {photos.map((p, i) => (
          <View key={i} style={pg.thumb}>
            <Image source={{ uri: p.uri }} style={pg.img} />
            <TouchableOpacity style={pg.del} onPress={() => onRemove(i)}>
              <Text style={pg.delText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < 3 && (
          <TouchableOpacity
            style={[pg.add, error && photos.length === 0 && { borderColor: C.red }]}
            onPress={onAdd}
            activeOpacity={0.75}
          >
            <Text style={pg.addIcon}>+</Text>
            <Text style={pg.addLabel}>{photos.length === 0 ? 'Add' : 'Add more'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.errorText, { color: C.sub, marginTop: 6 }]}>
        {photos.length}/3 added
      </Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}
const pg = StyleSheet.create({
  row:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb:    { width: 90, height: 90, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  img:      { width: '100%', height: '100%' },
  del:      { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  delText:  { color: '#fff', fontFamily: FONTS.black, fontSize: 10 },
  add:      { width: 90, height: 90, borderRadius: 12, borderWidth: 2, borderColor: C.greenMid, borderStyle: 'dashed', backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  addIcon:  { fontSize: 26, color: C.greenMid },
  addLabel: { fontFamily: FONTS.semiBold, fontSize: 11, color: C.greenMid },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────────
export default function DetailsFormScreen({ navigation, route }) {
  // Subscribe to the City Master so state / district / city pickers
  // reflect the admin-managed tree and re-render when the fetch lands.
  const loc = useLocations();
  const { phone, role } = route.params || {};
  const { language, login } = useApp();
  const isDealer = role === 'dealer';

  // Shared
  const [name,    setName]    = useState('');
  const [state,   setState]   = useState('');
  const [district,setDistrict]= useState('');
  const [city,    setCity]    = useState('');
  const [gmail,   setGmail]   = useState('');

  // Dealer only
  const [step,          setStep]          = useState(1);
  const [business,      setBusiness]      = useState('');
  const [vehicles,      setVehicles]      = useState([]);
  const [address,       setAddress]       = useState('');
  const [pincode,       setPincode]       = useState('');
  const [homeDoor,      setHomeDoor]      = useState('');
  const [homeStreet,    setHomeStreet]    = useState('');
  const [homeLandmark,  setHomeLandmark]  = useState('');
  const [homePincode,   setHomePincode]   = useState('');
  const [gst,           setGst]           = useState('');
  const [pan,           setPan]           = useState('');
  const [shopPhotos,    setShopPhotos]    = useState([]); // 1–3 photos
  const [vehiclePhotos, setVehiclePhotos] = useState([]); // 1–3 photos
  const [agreed,        setAgreed]        = useState(false);

  // Errors
  const [errors, setErrors] = useState({});

  // Picker modals
  const [picker, setPicker] = useState(null); // 'state' | 'district' | 'city'

  const [loading, setLoading] = useState(false);

  // ── Cascading reset ──
  const onPickState = useCallback((s) => {
    setState(s); setDistrict(''); setCity('');
    setErrors(e => ({ ...e, state: null }));
  }, []);
  const onPickDistrict = useCallback((d) => {
    setDistrict(d); setCity('');
    setErrors(e => ({ ...e, district: null }));
  }, []);
  const onPickCity = useCallback((c) => {
    setCity(c);
    setErrors(e => ({ ...e, city: null }));
  }, []);

  // ── Vehicle toggle ──
  const toggleVehicle = (id) => {
    setVehicles(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
    setErrors(e => ({ ...e, vehicles: null }));
  };

  // ── Reusable multi-photo picker (Camera OR Gallery) ──
  const pickPhoto = (currentPhotos, setPhotos, errorKey) => {
    if (currentPhotos.length >= 3) {
      Alert.alert('Maximum reached', 'You can upload up to 3 photos.');
      return;
    }
    Alert.alert(
      'Add Photo',
      `${currentPhotos.length}/3 added — choose source`,
      [
        {
          text: '📷  Take Photo',
          onPress: async () => {
            if (!(await ensurePermission('camera', language))) return;
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true, aspect: [4, 3], quality: 0.85,
            });
            if (!result.canceled) {
              setPhotos(prev => [...prev, result.assets[0]]);
              setErrors(e => ({ ...e, [errorKey]: null }));
            }
          },
        },
        {
          text: '🖼️  Choose from Gallery',
          onPress: async () => {
            if (!(await ensurePermission('photos', language))) return;
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true, aspect: [4, 3], quality: 0.85,
            });
            if (!result.canceled) {
              setPhotos(prev => [...prev, result.assets[0]]);
              setErrors(e => ({ ...e, [errorKey]: null }));
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const removePhoto = (index, photos, setPhotos) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // ── Validation helpers ──
  const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ── Seller validation + submit ──
  const validateSeller = () => {
    const e = {};
    if (!name.trim())                             e.name     = 'Required';
    else if (name.trim().length < 2)              e.name     = 'Name must be at least 2 characters';
    if (!state)                                   e.state    = 'Required';
    if (!district)                                e.district = 'Required';
    if (!city)                                    e.city     = 'Please select your city';
    if (gmail.trim() && !EMAIL_REGEX.test(gmail)) e.gmail    = 'Enter a valid email address';
    // Residential pickup address — same rules as the seller website / API.
    if (!homeDoor.trim())                         e.homeDoor    = 'Please enter your door / house number';
    else if (homeDoor.trim().length > 20)         e.homeDoor    = 'Door number is too long';
    if (!homeStreet.trim())                       e.homeStreet  = 'Please enter the street name';
    else if (homeStreet.trim().length > 100)      e.homeStreet  = 'Street name is too long';
    if (homeLandmark.trim().length > 80)          e.homeLandmark = 'Landmark is too long';
    if (!homePincode.trim())                      e.homePincode = 'Please enter your pincode';
    else if (!/^\d{6}$/.test(homePincode.trim())) e.homePincode = 'Pincode must be exactly 6 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitSeller = async () => {
    if (!validateSeller()) return;
    setLoading(true);
    try {
      const smallCityId = await getCityIdAsync(state, district, city);
      const res = await sellerSetup({ name: name.trim(), state, district, city, city_id: smallCityId, gmail: gmail.trim(), seller_type: 'small',
        home_door_no: homeDoor.trim(), home_street: homeStreet.trim(),
        home_landmark: homeLandmark.trim() || null, home_pincode: homePincode.trim() });
      // Use the real session token from setup response or temp token stored after OTP verify
      const sessionToken = res.data?.token || (await getPendingToken());
      if (!sessionToken) throw new Error('Session token missing. Please try logging in again.');
      await clearPendingToken(); // clear temp token — now in user object
      const sellerData = res.data?.seller || {};
      if (!res.data?.user?.id && !sellerData.user_id) throw new Error('Account ID missing from server response. Please try again.');
      const userData = {
        ...(res.data?.user || {}),
        id:       res.data?.user?.id || sellerData.user_id,
        phone,
        mobile:   phone,
        name:     name.trim(),
        city,
        district,
        state,
        gmail:    gmail.trim(),
        token:    sessionToken,
        reg_id:   sellerData.reg_id   || null,
        totalOrders: 0, totalEarned: 0, totalKg: 0,
      };
      await login(userData, 'seller');
    } catch (err) {
      // The server answers field problems as { errors: { field: message } }.
      // Put each under its input instead of the generic "check your internet".
      const fe = err?.response?.data?.errors;
      if (fe && typeof fe === 'object') {
        const map = { home_door_no: 'homeDoor', home_street: 'homeStreet', home_landmark: 'homeLandmark',
                      home_pincode: 'homePincode', email: 'gmail' };
        const next = {};
        Object.keys(fe).forEach(k => { next[map[k] || k] = fe[k]; });
        setErrors(next);
        Alert.alert('Please check your details', Object.values(fe).join('\n'), [{ text: 'OK' }]);
      } else {
        const msg = err?.response?.data?.error
          || (err?.response ? `Registration failed (${err.response.status}). Please try again.`
                            : 'Registration failed. Please check your internet connection and try again.');
        Alert.alert('Registration Failed', msg, [{ text: 'OK' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Dealer step-1 validation ──
  const validateStep1 = () => {
    const e = {};
    if (!name.trim())                              e.name     = 'Required';
    else if (name.trim().length < 2)               e.name     = 'Name must be at least 2 characters';
    if (!business.trim())                          e.business = 'Required';
    else if (business.trim().length < 3)           e.business = 'Business name must be at least 3 characters';
    if (!vehicles.length)                          e.vehicles = 'Select at least one vehicle type';
    if (gmail.trim() && !EMAIL_REGEX.test(gmail))  e.gmail    = 'Enter a valid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Dealer step-2 validation + submit ──
  const validateStep2 = () => {
    const e = {};
    if (!state)                                     e.state     = 'Required';
    if (!district)                                  e.district  = 'Required';
    if (!city)                                      e.city      = 'Required';
    if (!address.trim())                            e.address   = 'Required';
    else if (address.trim().length < 10)            e.address   = 'Enter full address (min 10 characters)';
    if (!pincode)                                   e.pincode   = 'Required';
    else if (!/^\d{6}$/.test(pincode))              e.pincode   = 'Enter a valid 6-digit pincode';
    const gstVal = gst.trim().toUpperCase();
    const panVal = pan.trim().toUpperCase();
    if (!gstVal && !panVal)                         e.gstPan    = 'Enter GST or PAN (at least one required)';
    else if (gstVal && !GST_REGEX.test(gstVal))     e.gstPan    = 'Invalid GST format (e.g. 22AAAAA0000A1Z5)';
    else if (panVal && !PAN_REGEX.test(panVal))     e.gstPan    = 'Invalid PAN format (e.g. ABCDE1234F)';
    if (shopPhotos.length < 1)                       e.shopPhotos    = 'At least 1 shop photo is required (max 3)';
    if (vehiclePhotos.length < 1)                   e.vehiclePhotos = 'At least 1 vehicle photo is required (max 3)';
    if (!agreed)                                    e.agreed        = 'You must agree to the Terms to continue';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitDealer = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    // Photos first, one at a time (resized). A failed upload stops here with
    // its own message and keeps the sign-up token, so the dealer can retry;
    // previously failures were dropped and the dealer registered without them.
    let shopUrls = [];
    let vehicleUrls = [];
    try {
      shopUrls    = await uploadPhotoAssets(shopPhotos);
      vehicleUrls = await uploadPhotoAssets(vehiclePhotos);
    } catch (uploadErr) {
      setLoading(false);
      Alert.alert('Photo upload failed', uploadErrorMessage(uploadErr, 'Please check your internet connection and try again.'), [{ text: 'OK' }]);
      return;
    }
    try {

      const dealerCityId = await getCityIdAsync(state, district, city);
      const payload = {
        owner_name:     name.trim(),
        business_name:  business.trim(),
        vehicles,
        state, district, city,
        city_id:        dealerCityId,
        address:        address.trim(),
        pincode,
        gst:            gst.trim().toUpperCase(),
        pan:            pan.trim().toUpperCase(),
        gmail:          gmail.trim(),
        shop_photo:     shopUrls[0] || null,    // backend expects single first URL
        vehicle_photos: vehicleUrls,            // backend expects array of URLs
      };

      const res = await dealerRegister(payload);
      const sessionToken = res.data?.token || (await getPendingToken());
      if (!sessionToken) throw new Error('Session token missing. Please try logging in again.');
      await clearPendingToken();
      const dealerData = res.data?.dealer || {};
      if (!res.data?.user?.id && !dealerData.user_id) throw new Error('Account ID missing from server response. Please try again.');
      const userData = {
        ...(res.data?.user || {}),
        id:            res.data?.user?.id || dealerData.user_id,
        phone,
        mobile:        phone,
        name:          name.trim(),
        owner_name:    name.trim(),
        business_name: business.trim(),
        city, district, state,
        address:       address.trim(),
        gmail:         gmail.trim(),
        reg_id:        dealerData.reg_id || null,
        token:         sessionToken,
        reliabilityScore: 100,
        subscriptionTier: 'free',
        totalPickups:     0,
        avgRating:        0,
      };
      deleteLocalPhotos([...shopPhotos, ...vehiclePhotos]);
      await login(userData, 'dealer_pending');
      navigation.reset({ index: 0, routes: [{ name: 'DealerPending' }] });
    } catch (err) {
      await clearPendingToken();
      const msg = err?.response?.data?.error || 'Registration failed. Please check your internet connection and try again.';
      Alert.alert('Registration Failed', msg, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SELLER RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  if (!isDealer) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <PickerModal visible={picker === 'state'} title="Select State"
          items={loc.states} onSelect={onPickState} onClose={() => setPicker(null)} />
        <PickerModal visible={picker === 'district'} title="Select District"
          items={districts(state)} onSelect={onPickDistrict} onClose={() => setPicker(null)} />
        <PickerModal visible={picker === 'city'} title="Select City / Area"
          items={cities(state, district)} onSelect={onPickCity} onClose={() => setPicker(null)} />

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>← {language === 'ta' ? 'திரும்பு' : 'Back'}</Text>
            </TouchableOpacity>

            {/* Hero */}
            <View style={styles.hero}>
              <Text style={styles.heroEmoji}>🏠</Text>
              <View>
                <Text style={styles.heroTitle}>{language === 'ta' ? 'கிட்டத்தட்ட முடிந்தது!' : 'Almost there!'}</Text>
                <Text style={styles.heroSub}>{language === 'ta' ? 'உங்கள் விவரங்களை பூர்த்தி செய்யுங்கள்' : 'Complete your seller profile'}</Text>
              </View>
            </View>

            {/* Phone chip */}
            <View style={styles.phoneChip}>
              <Text style={styles.phoneChipLabel}>📱 Account number</Text>
              <Text style={styles.phoneChipVal}>+91 {phone}</Text>
            </View>

            {/* Fields */}
            <FieldInput
              label={language === 'ta' ? 'உங்கள் பெயர் *' : 'Your Name *'}
              value={name} onChangeText={t => { setName(t); setErrors(e => ({...e, name: null})); }}
              placeholder="e.g. Arun Kumar" error={errors.name}
            />
            <PickerBtn
              label={language === 'ta' ? 'மாநிலம் *' : 'State *'}
              value={state} placeholder="Select State"
              onPress={() => setPicker('state')} error={errors.state}
            />
            <PickerBtn
              label={language === 'ta' ? 'மாவட்டம் *' : 'District *'}
              value={district} placeholder={state ? 'Select District' : 'Select State first'}
              onPress={() => setPicker('district')} disabled={!state}
              error={errors.district}
            />
            <PickerBtn
              label={language === 'ta' ? 'நகரம் / பகுதி *' : 'City / Area *'}
              value={city} placeholder={district ? 'Select City / Area' : 'Select District first'}
              onPress={() => setPicker('city')} disabled={!district}
              error={errors.city}
            />
            <FieldInput
              label={language === 'ta' ? 'Gmail (விரும்பினால்)' : 'Gmail Address (Optional)'}
              value={gmail} onChangeText={t => { setGmail(t); setErrors(e => ({...e, gmail: null})); }}
              placeholder="yourname@gmail.com" keyboardType="email-address"
              autoCapitalize="none" error={errors.gmail}
            />

            <FieldInput
              label="Door / House No. *"
              value={homeDoor} onChangeText={t => { setHomeDoor(t); setErrors(e => ({...e, homeDoor: null})); }}
              placeholder="e.g. 12A" maxLength={20} error={errors.homeDoor}
            />
            <FieldInput
              label="Street *"
              value={homeStreet} onChangeText={t => { setHomeStreet(t); setErrors(e => ({...e, homeStreet: null})); }}
              placeholder="e.g. Gandhi Street" maxLength={100} error={errors.homeStreet}
            />
            <FieldInput
              label="Landmark (Optional)"
              value={homeLandmark} onChangeText={t => { setHomeLandmark(t); setErrors(e => ({...e, homeLandmark: null})); }}
              placeholder="e.g. Near the temple" maxLength={80} error={errors.homeLandmark}
            />
            <FieldInput
              label="Pincode *"
              value={homePincode} onChangeText={t => { setHomePincode(t.replace(/\D/g, '')); setErrors(e => ({...e, homePincode: null})); }}
              placeholder="6-digit pincode" keyboardType="number-pad" maxLength={6} error={errors.homePincode}
            />

            <TouchableOpacity
              style={[styles.submitBtn, (!name.trim() || !state || !district || !city) && styles.submitDisabled]}
              onPress={submitSeller}
              disabled={loading || !name.trim() || !state || !district || !city}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitText}>{language === 'ta' ? 'தொடங்குங்கள் →' : 'Get Started →'}</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DEALER RENDER — 2-step wizard
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <PickerModal visible={picker === 'state'} title="Select State"
        items={loc.states} onSelect={onPickState} onClose={() => setPicker(null)} />
      <PickerModal visible={picker === 'district'} title="Select District"
        items={districts(state)} onSelect={onPickDistrict} onClose={() => setPicker(null)} />
      <PickerModal visible={picker === 'city'} title="Select City / Area"
        items={cities(state, district)} onSelect={onPickCity} onClose={() => setPicker(null)} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Back / Step indicator */}
          <View style={styles.stepHeader}>
            <TouchableOpacity onPress={() => step === 1 ? navigation.goBack() : setStep(1)}>
              <Text style={styles.backText}>← {step === 1 ? 'Back' : 'Step 1'}</Text>
            </TouchableOpacity>
            <View style={styles.stepPills}>
              <View style={[styles.stepPill, step >= 1 && styles.stepPillActive]} />
              <View style={[styles.stepPill, step >= 2 && styles.stepPillActive]} />
            </View>
          </View>

          {/* Hero */}
          <View style={[styles.hero, { backgroundColor: C.amberBg, borderColor: C.amberBdr }]}>
            <Text style={styles.heroEmoji}>{step === 1 ? '🚛' : '📍'}</Text>
            <View>
              <Text style={styles.heroTitle}>
                {step === 1
                  ? (language === 'ta' ? 'வணிக விவரங்கள்' : 'Business Info')
                  : (language === 'ta' ? 'இருப்பிடம் & ஆவணங்கள்' : 'Location & Documents')}
              </Text>
              <Text style={styles.heroSub}>Step {step} of 2</Text>
            </View>
          </View>

          {/* Phone chip */}
          <View style={styles.phoneChip}>
            <Text style={styles.phoneChipLabel}>📱 Account number</Text>
            <Text style={styles.phoneChipVal}>+91 {phone}</Text>
          </View>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <>
              <FieldInput
                label="Owner Name *"
                value={name} onChangeText={t => { setName(t); setErrors(e => ({...e, name: null})); }}
                placeholder="e.g. Murugan R" error={errors.name}
              />
              <FieldInput
                label="Business Name *"
                value={business} onChangeText={t => { setBusiness(t); setErrors(e => ({...e, business: null})); }}
                placeholder="e.g. Sri Murugan Scrap Mart" error={errors.business}
              />

              {/* Vehicle types */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Vehicle Type * (select all that apply)</Text>
                <View style={styles.vehicleGrid}>
                  {VEHICLES.map(v => (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.vehicleTile, vehicles.includes(v.id) && styles.vehicleTileSelected]}
                      onPress={() => toggleVehicle(v.id)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.vehicleIcon}>{v.icon}</Text>
                      <Text style={[styles.vehicleLabel, vehicles.includes(v.id) && styles.vehicleLabelSelected]}>
                        {v.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.vehicles ? <Text style={styles.errorText}>{errors.vehicles}</Text> : null}
              </View>

              <FieldInput
                label="Gmail Address (Optional)"
                value={gmail} onChangeText={t => { setGmail(t); setErrors(e => ({...e, gmail: null})); }}
                placeholder="yourname@gmail.com" keyboardType="email-address"
                autoCapitalize="none" error={errors.gmail}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: C.amber }, (!name.trim() || !business.trim() || !vehicles.length) && styles.submitDisabled]}
                onPress={() => { if (validateStep1()) setStep(2); }}
                disabled={!name.trim() || !business.trim() || !vehicles.length}
                activeOpacity={0.85}
              >
                <Text style={styles.submitText}>Next → Location & Docs</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <>
              <PickerBtn label="State *" value={state} placeholder="Select State"
                onPress={() => setPicker('state')} error={errors.state} />
              <PickerBtn label="District *" value={district}
                placeholder={state ? 'Select District' : 'Select State first'}
                onPress={() => setPicker('district')} disabled={!state}
                error={errors.district} />
              <PickerBtn label="City / Area *" value={city}
                placeholder={district ? 'Select City / Area' : 'Select District first'}
                onPress={() => setPicker('city')} disabled={!district}
                error={errors.city} />
              <FieldInput label="Full Address *" value={address}
                onChangeText={t => { setAddress(t); setErrors(e => ({...e, address: null})); }}
                placeholder="House/Shop No., Street..." error={errors.address} />
              <FieldInput label="Pincode *" value={pincode}
                onChangeText={t => { if (/^\d*$/.test(t)) { setPincode(t); setErrors(e => ({...e, pincode: null})); }}}
                placeholder="6-digit pincode" keyboardType="number-pad" maxLength={6}
                autoCapitalize="none" error={errors.pincode} />

              {/* GST / PAN */}
              <View style={styles.gstPanRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <FieldInput label="GST Number" value={gst}
                    onChangeText={t => { setGst(t.toUpperCase()); setErrors(e => ({...e, gstPan: null})); }}
                    placeholder="22AAAAA0000A1Z5" autoCapitalize="characters" maxLength={15} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <FieldInput label="PAN Number" value={pan}
                    onChangeText={t => { setPan(t.toUpperCase()); setErrors(e => ({...e, gstPan: null})); }}
                    placeholder="ABCDE1234F" autoCapitalize="characters" maxLength={10} />
                </View>
              </View>
              {errors.gstPan ? <Text style={[styles.errorText, { marginTop: -8, marginBottom: 12 }]}>{errors.gstPan}</Text> : null}
              <Text style={styles.gstNote}>At least one (GST or PAN) is required</Text>

              {/* Shop Photos (1–3) */}
              <PhotoGrid
                label="Shop Photos *"
                hint="Min 1, Max 3 — show your shop/workspace"
                photos={shopPhotos}
                onAdd={() => pickPhoto(shopPhotos, setShopPhotos, 'shopPhotos')}
                onRemove={(i) => removePhoto(i, shopPhotos, setShopPhotos)}
                error={errors.shopPhotos}
              />

              {/* Vehicle Photos (1–3) */}
              <PhotoGrid
                label="Vehicle Photos *"
                hint="Min 1, Max 3 — show your pickup vehicle(s)"
                photos={vehiclePhotos}
                onAdd={() => pickPhoto(vehiclePhotos, setVehiclePhotos, 'vehiclePhotos')}
                onRemove={(i) => removePhoto(i, vehiclePhotos, setVehiclePhotos)}
                error={errors.vehiclePhotos}
              />

              {/* Terms */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => { setAgreed(!agreed); setErrors(e => ({...e, agreed: null})); }}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                  {agreed && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.termsText}>
                  I agree to Scrap Trove{"'"}s{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
              {errors.agreed ? <Text style={[styles.errorText, { marginTop: -4 }]}>{errors.agreed}</Text> : null}

              {/* Info note */}
              <View style={styles.infoCard}>
                <Text style={styles.infoIcon}>ℹ️</Text>
                <Text style={styles.infoText}>
                  After you submit, our team reviews your account within 24–48 hours. You will receive an SMS when approved.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: C.amber },
                  (!state || !district || !city || !address.trim() || pincode.length !== 6 || (!gst.trim() && !pan.trim()) || shopPhotos.length < 1 || vehiclePhotos.length < 1 || !agreed) && styles.submitDisabled]}
                onPress={submitDealer}
                disabled={loading || !state || !district || !city || !address.trim() || pincode.length !== 6 || (!gst.trim() && !pan.trim()) || shopPhotos.length < 1 || vehiclePhotos.length < 1 || !agreed}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitText}>Submit Application →</Text>
                }
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20 },

  backBtn:  { paddingTop: 4, paddingBottom: 12 },
  backText: { color: C.greenMid, fontFamily: FONTS.semiBold, fontSize: 16 },

  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 12 },
  stepPills:  { flexDirection: 'row', gap: 6 },
  stepPill:   { width: 28, height: 4, borderRadius: 2, backgroundColor: C.bdr },
  stepPillActive: { backgroundColor: C.amber },

  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.mint, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 18,
    marginBottom: 16, borderWidth: 1, borderColor: C.mintBdr,
  },
  heroEmoji: { fontSize: 36 },
  heroTitle: { fontFamily: FONTS.black, fontSize: 20, color: C.text },
  heroSub:   { fontFamily: FONTS.regular, fontSize: 13, color: C.sub, marginTop: 2 },

  phoneChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: C.bdr, marginBottom: 24,
  },
  phoneChipLabel: { fontFamily: FONTS.medium, fontSize: 13, color: C.sub },
  phoneChipVal:   { fontFamily: FONTS.bold, fontSize: 15, color: C.text },

  fieldWrap:      { marginBottom: 18 },
  fieldLabel:     { fontFamily: FONTS.semiBold, fontSize: 13, color: C.text, marginBottom: 6 },
  fieldInput: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1.5,
    borderColor: C.bdr, paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: FONTS.medium, fontSize: 15, color: C.text,
  },
  fieldFocused: { borderColor: C.greenMid, backgroundColor: C.mint },
  fieldError:   { borderColor: C.red },
  errorText:    { fontFamily: FONTS.regular, fontSize: 12, color: C.red, marginTop: 4 },
  // Vehicle grid
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vehicleTile: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.bdr, backgroundColor: C.surface,
  },
  vehicleTileSelected: { borderColor: C.amber, backgroundColor: C.amberBg },
  vehicleIcon:  { fontSize: 20 },
  vehicleLabel: { fontFamily: FONTS.medium, fontSize: 13, color: C.sub },
  vehicleLabelSelected: { color: C.amber, fontFamily: FONTS.bold },

  // GST/PAN row
  gstPanRow: { flexDirection: 'row', marginBottom: 0 },
  gstNote:   { fontFamily: FONTS.regular, fontSize: 12, color: C.sub, marginBottom: 18, marginTop: -10 },

  // (photo grid is handled by separate pg StyleSheet above)

  // Terms
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: C.bdr, backgroundColor: C.surface, marginTop: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { borderColor: C.greenMid, backgroundColor: C.greenMid },
  checkmark:    { color: '#fff', fontFamily: FONTS.black, fontSize: 13 },
  termsText:    { flex: 1, fontFamily: FONTS.regular, fontSize: 13, color: C.sub, lineHeight: 20 },
  termsLink:    { color: C.greenMid, fontFamily: FONTS.semiBold },

  // Info card
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 24, marginTop: 8,
  },
  infoIcon: { fontSize: 16 },
  infoText: { flex: 1, fontFamily: FONTS.regular, fontSize: 13, color: '#1E40AF', lineHeight: 19 },

  // Submit
  submitBtn: {
    backgroundColor: C.greenMid, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: C.greenMid, shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
    marginTop: 8,
  },
  submitDisabled: { backgroundColor: C.light, shadowOpacity: 0, elevation: 0 },
  submitText: { fontFamily: FONTS.extraBold, fontSize: 17, color: '#fff' },
});
