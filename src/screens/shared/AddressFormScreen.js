/**
 * AddressFormScreen — Standalone address entry / edit from Profile → My Details.
 * Saves the address to user.savedAddress via updateUser().
 * Based on the PostStep3 address form (location detect + manual entry).
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { leafletHtml, MAP_APP_NAME_FOR_USER_AGENT, onMapShouldStartLoad, parseMapMessage } from '../../constants/mapConfig';
import * as Location from 'expo-location';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';
import { shouldDropGpsForLine2Edit } from '../../utils/gpsBaseline';

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
};


async function reverseGeocode(lat, lng) {
  try {
    const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!geo.length) return {};
    const g = geo[0];
    return {
      line1:   g.name      || '',
      line2:   g.street    || '',
      pincode: g.postalCode?.length === 6 ? g.postalCode : '',
      label:   [g.name, g.street, g.district || g.city, g.postalCode].filter(Boolean).join(', '),
    };
  } catch { return {}; }
}

export default function AddressFormScreen({ navigation }) {
  const { language, user, updateUser } = useApp();
  const existing = user?.savedAddress || '';

  const [mode,       setMode]       = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [gpsLabel,   setGpsLabel]   = useState('');
  const [coords,     setCoords]     = useState(null);
  const [gpsBaseline, setGpsBaseline] = useState('');
  const [mapVisible, setMapVisible] = useState(false);
  const [mapRegion,  setMapRegion]  = useState(null);
  const [pinCoords,  setPinCoords]  = useState(null);
  const [pinLabel,   setPinLabel]   = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const webViewRef = useRef(null);

  const [line1,    setLine1]    = useState('');
  const [line2,    setLine2]    = useState('');
  const [landmark, setLandmark] = useState('');
  const [pincode,  setPincode]  = useState('');
  const [addrType, setAddrType] = useState('Home');
  const [errors,   setErrors]   = useState({});
  const [saving,   setSaving]   = useState(false);

  const requestPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location Permission', 'Please allow location access to use this feature.');
      return false;
    }
    return true;
  };

  const detectLocation = async () => {
    setLocLoading(true);
    const ok = await requestPermission();
    if (!ok) { setLocLoading(false); return; }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude: lat, longitude: lng } = pos.coords;
      setCoords({ lat, lng });
      setMapRegion({ latitude: lat, longitude: lng });
      const addr = await reverseGeocode(lat, lng);
      setGpsLabel(addr.label || '');
      if (addr.line1)   setLine1(addr.line1);
      if (addr.line2)   setLine2(addr.line2);
      if (addr.pincode) setPincode(addr.pincode);
      setGpsBaseline(addr.line2 || '');
    } catch { setGpsLabel(''); }
    setLocLoading(false);
  };

  const openMap = async () => {
    const ok = await requestPermission();
    if (!ok) return;
    let region = mapRegion;
    if (!region) {
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude: lat, longitude: lng } = pos.coords;
        region = { latitude: lat, longitude: lng };
        setMapRegion(region);
        setPinCoords({ latitude: lat, longitude: lng });
      } catch {}
    } else {
      setPinCoords({ latitude: region.latitude, longitude: region.longitude });
    }
    setMapVisible(true);
  };

  const handleWebMapMessage = async (event) => {
    const pos = parseMapMessage(event);
    if (!pos) return; // ignore anything that is not a valid lat/lng
    const { lat, lng } = pos;
    try {
      setPinCoords({ latitude: lat, longitude: lng });
      setPinLoading(true);
      const addr = await reverseGeocode(lat, lng);
      setPinLabel(addr.label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setPinLoading(false);
    } catch {}
  };

  const confirmMapLocation = async () => {
    if (!pinCoords) return;
    setMapVisible(false);
    setCoords({ lat: pinCoords.latitude, lng: pinCoords.longitude });
    const addr = await reverseGeocode(pinCoords.latitude, pinCoords.longitude);
    setGpsLabel(addr.label || pinLabel || '');
    if (addr.line1)   setLine1(addr.line1);
    if (addr.line2)   setLine2(addr.line2);
    if (addr.pincode) setPincode(addr.pincode);
    setGpsBaseline(addr.line2 || '');
  };

  const validate = () => {
    const e = {};
    if (!line1.trim())                    e.line1   = language === 'ta' ? 'தேவை' : 'Required';
    if (!pincode || pincode.length !== 6) e.pincode = language === 'ta' ? '6 இலக்க பின்கோட் உள்ளிடவும்' : 'Enter valid 6-digit pincode';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const addressStr = [line1.trim(), line2.trim(), landmark.trim(), pincode]
      .filter(Boolean).join(', ');
    await updateUser({ savedAddress: addressStr });
    setSaving(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {existing
            ? (language === 'ta' ? 'முகவரி திருத்து' : 'Edit Address')
            : (language === 'ta' ? 'முகவரி சேர்க்க' : 'Add Address')}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Existing address hint */}
          {existing ? (
            <View style={styles.existingCard}>
              <Text style={styles.existingLabel}>
                {language === 'ta' ? 'தற்போதைய முகவரி' : 'Current saved address'}
              </Text>
              <Text style={styles.existingText}>{existing}</Text>
            </View>
          ) : null}

          {/* Location buttons */}
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'gps' && styles.modeBtnActive]}
              onPress={() => { setMode('gps'); detectLocation(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.modeIcon}>{'📍'}</Text>
              <Text style={[styles.modeTxt, mode === 'gps' && styles.modeTxtActive]}>
                {language === 'ta' ? 'தற்போதைய இடம்' : 'Current Location'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'map' && styles.modeBtnActive]}
              onPress={() => { setMode('map'); openMap(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.modeIcon}>{'🗺️'}</Text>
              <Text style={[styles.modeTxt, mode === 'map' && styles.modeTxtActive]}>
                {language === 'ta' ? 'வரைபடத்தில் தேர்வு' : 'Select on Map'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Detected location card */}
          {mode !== null && (
            <View style={styles.gpsCard}>
              {locLoading ? (
                <ActivityIndicator color={C.green} />
              ) : (
                <>
                  <Text style={styles.gpsCardLabel}>
                    {mode === 'map' ? '🗺️' : '📍'}{' '}
                    {language === 'ta' ? 'கண்டறியப்பட்ட இடம்' : 'Detected Location'}
                  </Text>
                  <Text style={styles.gpsCardText} numberOfLines={2}>
                    {gpsLabel || (language === 'ta' ? 'இடம் கிடைக்கவில்லை' : 'Location not detected')}
                  </Text>
                  <TouchableOpacity
                    onPress={mode === 'map' ? openMap : detectLocation}
                    style={styles.refreshBtn}
                  >
                    <Text style={styles.refreshTxt}>
                      {'↻ '}{mode === 'map'
                        ? (language === 'ta' ? 'வரைபடம் திற' : 'Open Map')
                        : (language === 'ta' ? 'புதுப்பி' : 'Refresh')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          <Text style={styles.dividerLabel}>
            {language === 'ta' ? 'முகவரி உள்ளிடவும்' : 'Enter Address'}
          </Text>

          <Field
            label={language === 'ta' ? 'வீடு / கடை எண் *' : 'House / Flat / Shop No. *'}
            value={line1} onChangeText={t => { setLine1(t); setErrors(e => ({ ...e, line1: null })); }}
            placeholder="e.g. Flat 3B, Sri Murugan Apts" error={errors.line1}
          />
          <Field
            label={language === 'ta' ? 'தெரு / பகுதி' : 'Street / Area'}
            value={line2}
            onChangeText={t => {
              setLine2(t);
              if (shouldDropGpsForLine2Edit(gpsBaseline, t)) {
                setCoords(null); setGpsBaseline('');
              }
            }}
            placeholder="e.g. Usman Road, T. Nagar"
          />
          <Field
            label={language === 'ta' ? 'அடையாளச் சின்னம் (விரும்பினால்)' : 'Landmark (Optional)'}
            value={landmark} onChangeText={setLandmark}
            placeholder="e.g. Near Saravana Stores"
          />
          <Field
            label={language === 'ta' ? 'பின்கோட் *' : 'Pincode *'}
            value={pincode}
            onChangeText={t => { if (/^\d*$/.test(t)) { setPincode(t); setErrors(e => ({ ...e, pincode: null })); }}}
            placeholder="6-digit pincode" keyboardType="number-pad" maxLength={6} error={errors.pincode}
          />

          <Text style={styles.typeLabel}>{language === 'ta' ? 'முகவரி வகை' : 'Address Type'}</Text>
          <View style={styles.typeRow}>
            {['Home', 'Office', 'Other'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, addrType === t && styles.typeChipActive]}
                onPress={() => setAddrType(t)}
                activeOpacity={0.75}
              >
                <Text style={[styles.typeChipText, addrType === t && styles.typeChipTextActive]}>
                  {t === 'Home' ? '🏠' : t === 'Office' ? '🏢' : '📍'} {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>
                {language === 'ta' ? '✓ சேமி' : '✓ Save Address'}
              </Text>}
        </TouchableOpacity>
      </View>

      {/* Map modal */}
      <Modal visible={mapVisible} animationType="slide" onRequestClose={() => setMapVisible(false)}>
        <View style={styles.mapRoot}>
          <SafeAreaView edges={['top']} style={styles.mapHeader}>
            <TouchableOpacity onPress={() => setMapVisible(false)} style={styles.mapClose}>
              <Text style={styles.mapCloseText}>{'✕'}</Text>
            </TouchableOpacity>
            <Text style={styles.mapTitle}>
              {language === 'ta' ? 'இடத்தை தேர்வு செய்யவும்' : 'Select Location'}
            </Text>
            <View style={{ width: 36 }} />
          </SafeAreaView>

          {mapRegion ? (
            <WebView
              ref={webViewRef}
              style={styles.map}
              source={{ html: leafletHtml(mapRegion.latitude, mapRegion.longitude) }}
              onMessage={handleWebMapMessage}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
              applicationNameForUserAgent={MAP_APP_NAME_FOR_USER_AGENT}
              onShouldStartLoadWithRequest={onMapShouldStartLoad}
            />
          ) : (
            <View style={[styles.map, { alignItems: 'center', justifyContent: 'center' }]}>
              <ActivityIndicator size="large" color={C.green} />
            </View>
          )}

          <View style={styles.mapBottom}>
            {pinLoading ? (
              <ActivityIndicator color={C.green} style={{ marginBottom: 8 }} />
            ) : pinLabel ? (
              <Text style={styles.pinLabel} numberOfLines={2}>{'📍 '}{pinLabel}</Text>
            ) : (
              <Text style={styles.pinHint}>
                {language === 'ta' ? 'இடத்தை தட்டுங்கள் அல்லது பின்னை இழுங்கள்' : 'Tap the map or drag the pin to set location'}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.confirmBtn, !pinCoords && styles.confirmBtnDisabled]}
              onPress={confirmMapLocation}
              disabled={!pinCoords}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>
                {language === 'ta' ? '✓ இந்த இடத்தை தேர்வு செய்' : '✓ Confirm This Location'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', maxLength, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, focused && styles.fieldFocused, error && styles.fieldError]}
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor={C.light} keyboardType={keyboardType} maxLength={maxLength}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.bdr,
  },
  backBtn:     { width: 36, height: 36, justifyContent: 'center' },
  backText:    { fontFamily: FONTS.semiBold, fontSize: 22, color: C.text },
  headerTitle: { fontFamily: FONTS.black, fontSize: 18, color: C.text },

  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  existingCard: {
    backgroundColor: C.mint, borderRadius: 14,
    borderWidth: 1, borderColor: C.mintBdr,
    padding: 14, marginBottom: 20,
  },
  existingLabel: { fontFamily: FONTS.semiBold, fontSize: 11, color: C.green, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 },
  existingText:  { fontFamily: FONTS.medium, fontSize: 14, color: C.text, lineHeight: 20 },

  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: C.bdr, backgroundColor: C.surface,
  },
  modeBtnActive: { borderColor: C.green, backgroundColor: C.mint },
  modeIcon:      { fontSize: 16 },
  modeTxt:       { fontFamily: FONTS.semiBold, fontSize: 13, color: C.sub },
  modeTxtActive: { color: C.green },

  gpsCard: {
    backgroundColor: C.mint, borderRadius: 14, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: C.mintBdr, minHeight: 68,
  },
  gpsCardLabel: { fontFamily: FONTS.semiBold, fontSize: 12, color: C.green, marginBottom: 4 },
  gpsCardText:  { fontFamily: FONTS.medium, fontSize: 14, color: C.text, lineHeight: 20 },
  refreshBtn:   { alignSelf: 'flex-end', marginTop: 8 },
  refreshTxt:   { fontFamily: FONTS.semiBold, fontSize: 13, color: C.green },

  dividerLabel: {
    fontFamily: FONTS.extraBold, fontSize: 12, color: C.light,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16,
  },

  fieldLabel:   { fontFamily: FONTS.semiBold, fontSize: 13, color: C.text, marginBottom: 6 },
  fieldInput: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1.5, borderColor: C.bdr,
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: FONTS.medium, fontSize: 15, color: C.text,
  },
  fieldFocused: { borderColor: C.green, backgroundColor: C.mint },
  fieldError:   { borderColor: C.red },
  errorText:    { fontFamily: FONTS.regular, fontSize: 12, color: C.red, marginTop: 4 },

  typeLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: C.text, marginBottom: 10 },
  typeRow:   { flexDirection: 'row', gap: 10 },
  typeChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.bdr, backgroundColor: C.surface, alignItems: 'center',
  },
  typeChipActive:     { borderColor: C.green, backgroundColor: C.mint },
  typeChipText:       { fontFamily: FONTS.semiBold, fontSize: 13, color: C.sub },
  typeChipTextActive: { color: C.green },

  footer: {
    paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12,
    backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.bdr,
  },
  saveBtn: {
    backgroundColor: C.green, borderRadius: 16, paddingVertical: 17, alignItems: 'center',
    elevation: 4, shadowColor: C.green, shadowOpacity: 0.3, shadowRadius: 8,
  },
  saveBtnText: { fontFamily: FONTS.extraBold, fontSize: 17, color: '#fff' },

  mapRoot:   { flex: 1, backgroundColor: C.bg },
  mapHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.bdr, backgroundColor: C.bg,
  },
  mapClose:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  mapCloseText: { fontFamily: FONTS.bold, fontSize: 18, color: C.text },
  mapTitle:     { fontFamily: FONTS.extraBold, fontSize: 16, color: C.text },
  map:          { flex: 1 },
  mapBottom: {
    backgroundColor: C.bg, padding: 20, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: C.bdr,
  },
  pinLabel:  { fontFamily: FONTS.medium, fontSize: 14, color: C.text, marginBottom: 14, lineHeight: 20 },
  pinHint:   { fontFamily: FONTS.regular, fontSize: 13, color: C.sub, marginBottom: 14, textAlign: 'center' },
  confirmBtn: {
    backgroundColor: C.green, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    elevation: 4, shadowColor: C.green, shadowOpacity: 0.3, shadowRadius: 8,
  },
  confirmBtnDisabled: { backgroundColor: C.light, shadowOpacity: 0, elevation: 0 },
  confirmBtnText:     { fontFamily: FONTS.extraBold, fontSize: 16, color: '#fff' },
});
