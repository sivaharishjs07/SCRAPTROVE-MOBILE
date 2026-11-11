import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { ensurePermission } from '../../services/permissions';
import { reverseGeocode, GEOCODER_ATTRIBUTION } from '../../services/geocode';
import { useApp } from '../../context/AppContext';
import { submitEditRequest } from '../../services/api';
import { getCityIdAsync } from '../../constants/locations';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';

const GRAY_50   = '#F9FAFB';
const GRAY_100  = '#F3F4F6';
const GRAY_200  = '#E5E7EB';
const GRAY_400  = '#9CA3AF';
const GRAY_500  = '#6B7280';
const GRAY_700  = '#374151';
const GRAY_900  = '#111827';
const AMBER_50  = '#FFFBEB';
const AMBER_100 = '#FDE68A';
const AMBER_700 = '#92400E';
const RED       = '#DC2626';

const SECTORS = [
  'Manufacturing', 'IT / Technology', 'Healthcare / Hospital',
  'Education / School / College', 'Retail / Commercial', 'Construction',
  'Recycling / Scrap Yard', 'Government / PSU', 'Hospitality / Restaurant', 'Other',
];

// Basic email regex — no need to be RFC-perfect for a soft validation
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EditDetailsScreen({ navigation }) {
  const { user, language } = useApp();
  const isBulk = user?.seller_type === 'bulk';

  const [form, setForm] = useState({
    name:              user?.name || '',
    gmail:             user?.gmail || '',
    state:             user?.state || 'Tamil Nadu',
    district:          user?.district || '',
    city:              user?.city || '',
    // Bulk-only
    company_name:      user?.company_name || '',
    designation:       user?.designation || '',
    company_sector:    user?.company_sector || '',
    pan_or_gst:        user?.pan_or_gst || '',
    company_door_no:   user?.company_door_no || '',
    company_street:    user?.company_street || '',
    company_locality:  user?.company_locality || '',
    company_pincode:   user?.company_pincode || '',
    company_lat:       user?.company_lat ?? null,
    company_lng:       user?.company_lng ?? null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus,  setGpsStatus]  = useState(null); // null | 'success' | 'error'
  const [sectorOpen, setSectorOpen] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fetchGPS = async () => {
    setGpsLoading(true); setGpsStatus(null);
    try {
      if (!(await ensurePermission('location', language))) {
        setGpsStatus('error');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;
      // Reverse geocode (services/geocode.js)
      try {
        const a = await reverseGeocode(lat, lng);
        setForm(f => ({
          ...f,
          company_lat: lat,
          company_lng: lng,
          company_door_no:  a.doorNo   || f.company_door_no,
          company_street:   a.street   || f.company_street,
          company_locality: a.locality || f.company_locality,
          state:            a.state    || f.state,
          district:         a.district || f.district,
          company_pincode:  a.pincode  || f.company_pincode,
        }));
      } catch {
        setForm(f => ({ ...f, company_lat: lat, company_lng: lng }));
      }
      setGpsStatus('success');
    } catch {
      setGpsStatus('error');
    } finally {
      setGpsLoading(false);
    }
  };

  const submit = async () => {
    // Validation
    if (!form.name.trim()) return Alert.alert('Name required', 'Please enter your full name.');
    if (form.gmail && !EMAIL_RE.test(form.gmail.trim())) {
      return Alert.alert('Invalid email', 'Please enter a valid email address.');
    }
    if (isBulk) {
      if (!form.company_name.trim()) return Alert.alert('Company name required');
      if (!form.pan_or_gst.trim())    return Alert.alert('PAN / GST required');
      if (form.company_pincode && !/^\d{6}$/.test(form.company_pincode)) {
        return Alert.alert('Invalid pincode', 'Pincode must be 6 digits.');
      }
    }

    setSubmitting(true);
    try {
      // Attach the admin-managed city_id when we can resolve the current
      // state/district/city triple. Backend still resolves from text if
      // this comes back null.
      const editCityId = await getCityIdAsync(form.state, form.district, form.city);
      const res = await submitEditRequest({ ...form, city_id: editCityId });
      if (res?.data?.error) {
        Alert.alert('Could not submit', res.data.error);
        setSubmitting(false);
        return;
      }
      Alert.alert(
        'Submitted',
        'Your updated details have been sent for review. We\'ll notify you once approved.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Failed to submit';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Your Details</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.noteBanner}>
            <Text style={styles.noteText}>
              📝 Update the fields that need correction. Your changes will be reviewed by our team. Once approved, you can use Scrap Trove again.{'\n'}
              <Text style={{ fontFamily: FONTS.bold }}>Note:</Text> Mobile number cannot be changed.
            </Text>
          </View>

          {/* Mobile (read-only) */}
          <Field
            label="Mobile (read-only)"
            value={user?.mobile ? `+91 ${user.mobile}` : ''}
            editable={false}
          />

          <Label>{isBulk ? 'CONTACT PERSON' : 'YOUR DETAILS'}</Label>
          <Field
            label="Full Name *"
            value={form.name}
            onChangeText={v => set('name', v)}
            placeholder="Your full name"
          />
          {isBulk && (
            <Field
              label="Designation"
              value={form.designation}
              onChangeText={v => set('designation', v)}
              placeholder="e.g. Manager, Owner"
            />
          )}
          <Field
            label="Email"
            value={form.gmail}
            onChangeText={v => set('gmail', v)}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {isBulk && (
            <>
              <Label>COMPANY</Label>
              <Field
                label="Company Name *"
                value={form.company_name}
                onChangeText={v => set('company_name', v)}
                placeholder="e.g. Acme Industries"
              />

              {/* Sector picker */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Sector</Text>
                <TouchableOpacity
                  style={styles.selectBtn}
                  onPress={() => setSectorOpen(o => !o)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.selectText, !form.company_sector && { color: GRAY_400 }]}>
                    {form.company_sector || 'Select sector'}
                  </Text>
                  <Text style={styles.selectChevron}>{sectorOpen ? '▴' : '▾'}</Text>
                </TouchableOpacity>
                {sectorOpen && (
                  <View style={styles.selectDropdown}>
                    {SECTORS.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.selectItem,
                          form.company_sector === s && { backgroundColor: '#F0FDF4' },
                        ]}
                        onPress={() => { set('company_sector', s); setSectorOpen(false); }}
                      >
                        <Text style={styles.selectItemText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <Field
                label="PAN / GST *"
                value={form.pan_or_gst}
                onChangeText={v => set('pan_or_gst', v.toUpperCase())}
                placeholder="ABCDE1234F or GSTIN"
                maxLength={15}
                autoCapitalize="characters"
              />
            </>
          )}

          <Label>{isBulk ? 'COMPANY / PICKUP ADDRESS' : 'LOCATION'}</Label>

          {isBulk && (
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
                  {gpsLoading
                    ? '⏳ Detecting…'
                    : gpsStatus === 'success' ? '✓ Detected'
                    : gpsStatus === 'error'   ? '⚠ GPS denied'
                    : '📍 Use GPS'}
                </Text>
              </TouchableOpacity>
              {form.company_lat && form.company_lng ? (
                <Text style={styles.gpsCoords}>
                  📍 {Number(form.company_lat).toFixed(4)}, {Number(form.company_lng).toFixed(4)}
                </Text>
              ) : null}
              {gpsStatus === 'success' ? (
                <Text style={styles.gpsCoords}>{GEOCODER_ATTRIBUTION}</Text>
              ) : null}
            </View>
          )}

          {isBulk && (
            <>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Door / Block"
                    value={form.company_door_no}
                    onChangeText={v => set('company_door_no', v)}
                    placeholder="12 / A-3"
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <Field
                    label="Street"
                    value={form.company_street}
                    onChangeText={v => set('company_street', v)}
                    placeholder="Street name"
                  />
                </View>
              </View>
              <Field
                label="Area / Locality"
                value={form.company_locality}
                onChangeText={v => set('company_locality', v)}
                placeholder="Locality"
              />
            </>
          )}

          <Field
            label="State"
            value={form.state}
            onChangeText={v => set('state', v)}
            placeholder="State"
          />
          <Field
            label="District"
            value={form.district}
            onChangeText={v => set('district', v)}
            placeholder="District"
          />
          <Field
            label="City"
            value={form.city}
            onChangeText={v => set('city', v)}
            placeholder="City"
          />
          {isBulk && (
            <Field
              label="Pincode"
              value={form.company_pincode}
              onChangeText={v => set('company_pincode', v.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="6-digit pincode"
              keyboardType="number-pad"
              maxLength={6}
            />
          )}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.submitBtnText}>Submit for Review</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Field primitives ────────────────────────────────────────────────────────
function Label({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function Field({ label, value, onChangeText, placeholder, editable = true, ...rest }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={GRAY_400}
        editable={editable}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: GRAY_50 },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 18, paddingVertical: 16, paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: GRAY_200,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: GRAY_100, borderWidth: 1, borderColor: GRAY_200,
    alignItems: 'center', justifyContent: 'center',
  },
  backText:    { fontSize: 22, color: GRAY_700, marginTop: -2 },
  headerTitle: { fontSize: 16, color: GRAY_900, fontFamily: FONTS.bold },

  noteBanner: {
    backgroundColor: AMBER_50, borderColor: AMBER_100, borderWidth: 1,
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  noteText: { fontSize: 12, color: AMBER_700, lineHeight: 18, fontFamily: FONTS.regular },

  sectionLabel: {
    fontSize: 11, letterSpacing: 0.6, color: GRAY_500,
    marginTop: 12, marginBottom: 8, fontFamily: FONTS.bold,
  },

  fieldWrap:  { marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: GRAY_700, marginBottom: 6, fontFamily: FONTS.semiBold },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: GRAY_200, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14, color: GRAY_900, fontFamily: FONTS.regular,
    minHeight: 48,
  },
  inputDisabled: { backgroundColor: GRAY_100, color: GRAY_500 },

  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: GRAY_200, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 48,
  },
  selectText:     { fontSize: 14, color: GRAY_900, fontFamily: FONTS.regular },
  selectChevron:  { fontSize: 14, color: GRAY_500 },
  selectDropdown: {
    marginTop: 6, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: GRAY_200, borderRadius: 12, overflow: 'hidden',
  },
  selectItem:     { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: GRAY_100 },
  selectItemText: { fontSize: 14, color: GRAY_900, fontFamily: FONTS.regular },

  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  gpsBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#3B82F6',
  },
  gpsBtnSuccess: { backgroundColor: '#F0FDF4', borderColor: COLORS.primary },
  gpsBtnError:   { backgroundColor: '#FEF2F2', borderColor: RED },
  gpsBtnText:    { fontSize: 12, color: '#2563EB', fontFamily: FONTS.bold },
  gpsCoords:     { fontSize: 11, color: COLORS.primary, fontFamily: FONTS.bold },

  submitBtn: {
    marginTop: 20, backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', minHeight: 52,
  },
  submitBtnText: { fontSize: 15, color: '#FFFFFF', fontFamily: FONTS.bold },
});
