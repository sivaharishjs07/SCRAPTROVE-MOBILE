import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../../context/AppContext';
import { sellerSetup } from '../../services/api';
import { FONTS } from '../../constants/typography';
import { useLocations, statesList, getDistricts, getCities, getCityIdAsync } from '../../constants/locations';

// Bulk / industrial-seller onboarding.
// Mirrors the web LoginPage bulk-register flow — contact person + company
// + PAN/GST + full pickup address with optional GPS auto-fill.

const C = {
  bg:       '#F9FAFB',
  card:     '#FFFFFF',
  border:   '#E5E7EB',
  border2:  '#D1D5DB',
  text:     '#0A1628',
  text2:    '#374151',
  sub:      '#6B7280',
  ph:       '#9CA3AF',
  green:    '#16A34A',
  greenBg:  '#F0FDF4',
  greenBdr: '#DCFCE7',
  blue:     '#2563EB',
  blueBg:   '#EFF6FF',
  blueBdr:  '#BFDBFE',
  red:      '#DC2626',
  redBg:    '#FEF2F2',
  amber700: '#92400E',
  amberBg:  '#FFFBEB',
  amberBdr: '#FDE68A',
};

const SECTORS = [
  'Manufacturing', 'IT / Technology', 'Healthcare / Hospital',
  'Education / School / College', 'Retail / Commercial', 'Construction',
  'Recycling / Scrap Yard', 'Government / PSU', 'Hospitality / Restaurant', 'Other',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BulkDetailsScreen({ route, navigation }) {
  const { phone } = route.params || {};
  const { login, language } = useApp();

  const [name, setName]         = useState('');
  const [designation, setDes]   = useState('');
  const [companyName, setCoy]   = useState('');
  const [sector, setSector]     = useState('');
  const [panGst, setPanGst]     = useState('');
  const [doorNo, setDoor]       = useState('');
  const [street, setStreet]     = useState('');
  const [locality, setLocality] = useState('');
  const [state, setState]       = useState('Tamil Nadu');
  const [district, setDistrict] = useState('');
  const [city, setCity]         = useState('');
  const [pincode, setPincode]   = useState('');
  const [gmail, setGmail]       = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  const [sectorOpen, setSectorOpen]     = useState(false);
  const [stateOpen, setStateOpen]       = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [cityOpen, setCityOpen]         = useState(false);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus,  setGpsStatus]  = useState(null); // 'success' | 'error' | null
  const [submitting, setSubmitting] = useState(false);

  // Subscribes this screen to the City Master. Re-renders as the tree
  // fetches resolve. Reading loc.districts / loc.cities also triggers
  // the corresponding lazy fetch.
  const loc       = useLocations();
  const districts = useMemo(() => loc.districts(state)             || [], [state, loc]);
  const cities    = useMemo(() => loc.cities(state, district)      || [], [state, district, loc]);

  // ── Location helpers ──────────────────────────────────────────────────────
  const fetchGPS = async () => {
    setGpsLoading(true); setGpsStatus(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatus('error');
        Alert.alert('Location permission needed', 'Please allow location access to auto-fill your address.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      setLat(latitude); setLng(longitude);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } },
        );
        const data = await res.json();
        const a = data.address || {};
        if (a.house_number) setDoor(a.house_number);
        const rd = a.road || a.pedestrian || a.footway;
        if (rd) setStreet(rd);
        const loc = a.suburb || a.neighbourhood || a.hamlet || a.village;
        if (loc) setLocality(loc);
        if (a.state) setState(a.state);
        const dist = a.state_district || a.city_district || a.city;
        if (dist) setDistrict(dist);
        if (a.postcode) setPincode(a.postcode);
      } catch { /* GPS coords still set, address just isn't auto-filled */ }
      setGpsStatus('success');
    } catch { setGpsStatus('error'); }
    finally { setGpsLoading(false); }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!name.trim())          return Alert.alert('Name required', 'Enter the contact person name.');
    if (!designation.trim())   return Alert.alert('Designation required', 'Enter your designation, e.g. Manager, Owner.');
    if (!companyName.trim())   return Alert.alert('Company name required');
    if (!sector)               return Alert.alert('Sector required', 'Select your company sector.');
    if (!panGst.trim())        return Alert.alert('PAN / GST required');
    if (!street.trim())        return Alert.alert('Street required');
    if (!state.trim())         return Alert.alert('State required');
    if (!district.trim())      return Alert.alert('District required');
    if (!city.trim())          return Alert.alert('City required');
    if (!pincode.trim())       return Alert.alert('Pincode required');
    if (!/^\d{6}$/.test(pincode.trim())) return Alert.alert('Invalid pincode', 'Pincode must be 6 digits.');
    if (!gmail.trim())         return Alert.alert('Business email required');
    if (!EMAIL_RE.test(gmail.trim())) return Alert.alert('Invalid email', 'Please enter a valid email.');

    setSubmitting(true);
    try {
      const payload = {
        name:              name.trim(),
        designation:       designation.trim(),
        company_name:      companyName.trim(),
        company_sector:    sector,
        pan_or_gst:        panGst.trim().toUpperCase(),
        company_door_no:   doorNo.trim(),
        company_street:    street.trim(),
        company_locality:  locality.trim(),
        state:             state.trim(),
        district:          district.trim(),
        city:              city.trim(),
        city_id:           await getCityIdAsync(state.trim(), district.trim(), city.trim()),
        company_pincode:   pincode.trim(),
        company_lat:       lat,
        company_lng:       lng,
        gmail:             gmail.trim(),
        seller_type:       'bulk',
      };
      const res = await sellerSetup(payload);
      const data = res?.data;
      if (!data?.success) {
        setSubmitting(false);
        return Alert.alert('Registration failed', data?.error || 'Could not save your details. Please try again.');
      }

      const seller = data.seller || {};
      const userData = {
        ...(data.user || {}),
        token: (await AsyncStorage.getItem('auth_token')) || undefined,
        reg_id:            seller.reg_id || null,
        name:              seller.name || name.trim(),
        gmail:             seller.gmail || gmail.trim(),
        state:             seller.state || state,
        district:          seller.district || district,
        city:              seller.city || city,
        seller_type:       'bulk',
        is_suspended:      seller.is_suspended || 0,
        company_name:      seller.company_name || companyName.trim(),
        designation:       seller.designation || designation.trim(),
        company_sector:    seller.company_sector || sector,
        pan_or_gst:        seller.pan_or_gst || panGst.trim().toUpperCase(),
        company_door_no:   seller.company_door_no || doorNo.trim(),
        company_street:    seller.company_street || street.trim(),
        company_locality:  seller.company_locality || locality.trim(),
        company_pincode:   seller.company_pincode || pincode.trim(),
        company_lat:       seller.company_lat ?? lat,
        company_lng:       seller.company_lng ?? lng,
      };
      await login(userData, 'seller');
      await AsyncStorage.removeItem('auth_token');
      navigation.reset({ index: 0, routes: [{ name: 'SellerTabs' }] });
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Failed to register';
      Alert.alert('Error', msg);
      setSubmitting(false);
    }
  };

  const isTa = language === 'ta';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{isTa ? 'உங்கள் நிறுவனம்' : 'Your Company Details'}</Text>
          <Text style={styles.headerSub}>+91 {phone}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introBanner}>
            <Text style={styles.introText}>
              🏭 {isTa
                ? 'உங்கள் தொழிற்சாலைக்கான scrap procurement அமைப்பு. நாங்கள் உங்கள் தளத்திற்கு வந்து பிக்-அப் செய்வோம்.'
                : 'Bulk scrap procurement for your factory or business. We come to your site.'}
            </Text>
          </View>

          <Label>{isTa ? 'தொடர்பு நபர்' : 'CONTACT PERSON'}</Label>
          <Field label="Full Name *"    value={name}        onChangeText={setName}        placeholder="Your full name" />
          <Field label="Designation *"  value={designation} onChangeText={setDes}         placeholder="e.g. Manager, Owner" />
          <Field label="Business Email *" value={gmail}     onChangeText={setGmail}       placeholder="you@company.com" keyboardType="email-address" autoCapitalize="none" />

          <Label>{isTa ? 'நிறுவனம்' : 'COMPANY'}</Label>
          <Field label="Company Name *" value={companyName} onChangeText={setCoy} placeholder="e.g. Acme Industries Pvt Ltd" />

          <Picker
            label="Sector *"
            value={sector}
            placeholder="Select sector"
            open={sectorOpen}
            setOpen={setSectorOpen}
            options={SECTORS}
            onSelect={setSector}
          />
          <Field
            label="PAN / GST *"
            value={panGst}
            onChangeText={v => setPanGst(v.toUpperCase())}
            placeholder="ABCDE1234F or 15-digit GSTIN"
            autoCapitalize="characters"
            maxLength={15}
          />

          <Label>{isTa ? 'நிறுவனம் / பிக்-அப் முகவரி' : 'COMPANY / PICKUP ADDRESS'}</Label>

          {/* GPS auto-fill row */}
          <View style={styles.gpsRow}>
            <TouchableOpacity
              style={[
                styles.gpsBtn,
                gpsStatus === 'success' && styles.gpsBtnSuccess,
                gpsStatus === 'error'   && styles.gpsBtnError,
              ]}
              onPress={fetchGPS}
              disabled={gpsLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.gpsBtnText}>
                {gpsLoading         ? '⏳ Detecting…'
                  : gpsStatus === 'success' ? '✓ Location captured'
                  : gpsStatus === 'error'   ? '⚠ GPS denied — enter manually'
                  : '📍 Use GPS to auto-fill'}
              </Text>
            </TouchableOpacity>
            {lat && lng ? (
              <Text style={styles.gpsCoords}>
                {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
              </Text>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Door / Block" value={doorNo} onChangeText={setDoor} placeholder="12 / A-3" />
            </View>
            <View style={{ flex: 2 }}>
              <Field label="Street *" value={street} onChangeText={setStreet} placeholder="Street name" />
            </View>
          </View>
          <Field label="Area / Locality" value={locality} onChangeText={setLocality} placeholder="Locality / area" />

          <Picker
            label="State *"
            value={state}
            placeholder="State"
            open={stateOpen}
            setOpen={setStateOpen}
            options={loc.states}
            onSelect={(v) => { setState(v); setDistrict(''); setCity(''); }}
          />
          <Picker
            label="District *"
            value={district}
            placeholder="Select district"
            open={districtOpen}
            setOpen={setDistrictOpen}
            options={districts}
            onSelect={(v) => { setDistrict(v); setCity(''); }}
            disabled={!state}
          />
          <Picker
            label="City *"
            value={city}
            placeholder="Select city"
            open={cityOpen}
            setOpen={setCityOpen}
            options={cities}
            onSelect={setCity}
            disabled={!district}
          />
          <Field
            label="Pincode *"
            value={pincode}
            onChangeText={v => setPincode(v.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="6-digit pincode"
            keyboardType="number-pad"
            maxLength={6}
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.submitText}>{isTa ? 'பதிவு செய்' : 'Complete Registration'}</Text>}
          </TouchableOpacity>

          <Text style={styles.footNote}>
            {isTa
              ? 'உங்கள் விவரங்கள் மறு ஆய்வு செய்யப்பட்டு சரிபார்க்கப்படும்.'
              : 'Your details will be reviewed and verified before your first pickup.'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────
function Label({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function Field({ label, value, onChangeText, placeholder, ...rest }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.ph}
        {...rest}
      />
    </View>
  );
}

function Picker({ label, value, placeholder, open, setOpen, options, onSelect, disabled }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectBtn, disabled && { opacity: 0.5 }]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[styles.selectText, !value && { color: C.ph }]}>
          {value || placeholder}
        </Text>
        <Text style={styles.selectChevron}>▾</Text>
      </TouchableOpacity>
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{placeholder}</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {options.length === 0
                ? <Text style={styles.modalEmpty}>No options available</Text>
                : options.map(o => (
                    <TouchableOpacity
                      key={o}
                      style={[styles.modalItem, value === o && { backgroundColor: C.greenBg }]}
                      onPress={() => { onSelect(o); setOpen(false); }}
                    >
                      <Text style={styles.modalItemText}>{o}</Text>
                    </TouchableOpacity>
                  ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 18, paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backText:    { fontSize: 22, color: C.text2, marginTop: -2 },
  headerTitle: { fontSize: 16, color: C.text, fontFamily: FONTS.bold },
  headerSub:   { fontSize: 12, color: C.sub, fontFamily: FONTS.regular, marginTop: 2 },

  introBanner: {
    backgroundColor: C.amberBg, borderColor: C.amberBdr, borderWidth: 1,
    borderRadius: 12, padding: 12, marginTop: 14, marginBottom: 16,
  },
  introText: { fontSize: 12, color: C.amber700, lineHeight: 18, fontFamily: FONTS.regular },

  sectionLabel: {
    fontSize: 11, letterSpacing: 0.7, color: C.sub,
    marginTop: 14, marginBottom: 8, fontFamily: FONTS.bold,
  },

  fieldWrap:  { marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: C.text2, marginBottom: 6, fontFamily: FONTS.semiBold },
  input: {
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14, color: C.text, fontFamily: FONTS.regular,
    minHeight: 48,
  },

  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 48,
  },
  selectText:    { fontSize: 14, color: C.text, fontFamily: FONTS.regular },
  selectChevron: { fontSize: 14, color: C.sub },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: { fontSize: 15, color: C.text, fontFamily: FONTS.bold, marginBottom: 10 },
  modalItem:  { paddingHorizontal: 12, paddingVertical: 14, borderRadius: 12, marginBottom: 4 },
  modalItemText: { fontSize: 14, color: C.text, fontFamily: FONTS.regular },
  modalEmpty: { fontSize: 13, color: C.sub, textAlign: 'center', padding: 20, fontFamily: FONTS.regular },

  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  gpsBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: C.blueBg, borderWidth: 1.5, borderColor: C.blue,
  },
  gpsBtnSuccess: { backgroundColor: C.greenBg, borderColor: C.green },
  gpsBtnError:   { backgroundColor: C.redBg,   borderColor: C.red },
  gpsBtnText:    { fontSize: 12, color: C.blue, fontFamily: FONTS.bold },
  gpsCoords:     { fontSize: 11, color: C.green, fontFamily: FONTS.bold },

  submitBtn: {
    marginTop: 22, backgroundColor: C.green, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', minHeight: 52,
  },
  submitText: { fontSize: 15, color: '#FFFFFF', fontFamily: FONTS.bold },
  footNote:   { marginTop: 12, fontSize: 12, color: C.sub, textAlign: 'center', fontFamily: FONTS.regular },
});
