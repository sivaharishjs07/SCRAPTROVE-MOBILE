/**
 * PostStep3Screen — Step 3 of 4: Pickup Address
 * Two options: auto-detect current location OR pin on map.
 * Both pre-fill the editable address form below.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Modal, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { leafletHtml, MAP_APP_NAME_FOR_USER_AGENT, onMapShouldStartLoad, parseMapMessage } from '../../constants/mapConfig';
import * as Location from 'expo-location';
import { ensurePermission } from '../../services/permissions';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';
import { listAddresses, addAddress, deleteAddress, checkPincode, joinPincodeWaitlist } from '../../services/api';
import { shouldDropGpsForLine2Edit } from '../../utils/gpsBaseline';

const { width: SW, height: SH } = Dimensions.get('window');

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


// ─── Reverse-geocode helper ────────────────────────────────────────────────────
async function reverseGeocode(lat, lng) {
  try {
    const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!geo.length) return {};
    const g = geo[0];
    return {
      line1:   g.name     || '',
      line2:   g.street   || '',
      pincode: g.postalCode?.length === 6 ? g.postalCode : '',
      label:   [g.name, g.street, g.district || g.city, g.postalCode].filter(Boolean).join(', '),
    };
  } catch { return {}; }
}

export default function PostStep3Screen({ navigation }) {
  const { language, orderDraft, setOrderDraft, savedAddress, user } = useApp();

  // Location mode: null | 'gps' | 'map'  (null = nothing selected yet)
  const [mode,       setMode]      = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [gpsLabel,   setGpsLabel]  = useState('');
  const [coords,     setCoords]    = useState(orderDraft.coords ?? null);
  // Baseline street value from the last GPS / map pick — if the user edits
  // the street enough that a baseline word disappears, we drop the coords.
  // Any change to door/city/pincode/landmark leaves the baseline alone.
  const [gpsBaseline, setGpsBaseline] = useState('');

  // Map modal
  const [mapVisible,  setMapVisible]  = useState(false);
  const [mapRegion,   setMapRegion]   = useState(null);
  const [pinCoords,   setPinCoords]   = useState(null);
  const [pinLabel,    setPinLabel]    = useState('');
  const [pinLoading,  setPinLoading]  = useState(false);
  const webViewRef = useRef(null);

  // Address fields — initialised from draft so back-navigation restores them
  const [line1,    setLine1]    = useState(orderDraft.addressLine1 ?? '');
  const [line2,    setLine2]    = useState(orderDraft.addressLine2 ?? '');
  const [landmark, setLandmark] = useState(orderDraft.landmark     ?? '');
  const [pincode,  setPincode]  = useState(orderDraft.pincode      ?? '');
  const [addrType, setAddrType] = useState(orderDraft.addrType     ?? 'Home');
  const [errors,   setErrors]   = useState({});

  // Address book — up to 5 saved addresses, backed by /api/addresses.
  // subStep === 'list' shows the picker + Add-new tile.
  // subStep === 'form' shows the GPS + fields form (existing UI below).
  const [saved,     setSaved]     = useState([]);
  const [savedLoad, setSavedLoad] = useState(true);
  const [subStep,   setSubStep]   = useState('list'); // 'list' | 'form'
  const [saveErr,   setSaveErr]   = useState('');

  const loadSaved = async () => {
    setSavedLoad(true);
    try {
      const res = await listAddresses();
      const list = Array.isArray(res?.data) ? res.data : [];
      setSaved(list);
      // If nothing saved yet, drop straight into the form so first-time
      // sellers don't stare at an empty picker.
      if (list.length === 0) setSubStep('form');
    } catch { setSaved([]); setSubStep('form'); }
    setSavedLoad(false);
  };

  useEffect(() => { loadSaved(); }, []);

  const pickSaved = (a) => {
    // Fill draft + local state from a saved row and advance immediately.
    setLine1(a.line1 || '');
    setLine2(a.line2 || '');
    setLandmark(a.landmark || '');
    setPincode(a.pincode || '');
    setAddrType(a.type || 'Home');
    if (a.lat && a.lng) setCoords({ lat: a.lat, lng: a.lng });
    const addressStr = [a.line1, a.line2, a.landmark, a.pincode].filter(Boolean).join(', ');
    setOrderDraft({
      address:      addressStr,
      addressLine1: a.line1 || '',
      addressLine2: a.line2 || '',
      landmark:     a.landmark || '',
      pincode:      a.pincode || '',
      addrType:     a.type || 'Home',
      coords:       (a.lat && a.lng) ? { lat: a.lat, lng: a.lng } : null,
    });
    navigation.navigate('PostStep4');
  };

  // Small sellers must keep at least one saved address — the worker enforces
  // this too (DELETE /api/addresses/:id returns 400 on the last one), but
  // without this guard the user would tap 🗑 and get a raw server error.
  // This screen is the small-seller flow only; bulk uses BulkPostFlow.
  const isLastAddress = saved.length <= 1;

  const removeSaved = (a) => {
    if (isLastAddress) {
      Alert.alert(
        language === 'ta' ? 'ஒரு முகவரி தேவை' : 'One address is required',
        language === 'ta'
          ? 'பிக்கப்பிற்கு குறைந்தது ஒரு முகவரி வேண்டும். புதிய முகவரியை சேர்த்த பிறகு இதை நீக்கலாம்.'
          : 'You need at least one saved address for pickups. Add a new address first, then you can remove this one.',
      );
      return;
    }
    Alert.alert(
      language === 'ta' ? 'நீக்கவா?' : 'Delete address?',
      language === 'ta' ? 'இந்த முகவரி நிரந்தரமாக நீக்கப்படும்.' : 'This address will be permanently removed.',
      [
        { text: language === 'ta' ? 'ரத்து' : 'Cancel', style: 'cancel' },
        {
          text: language === 'ta' ? 'நீக்கு' : 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteAddress(a.id);
              await loadSaved();
            } catch (e) {
              Alert.alert('Error', e?.response?.data?.error || e.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  // ── Pincode serviceability check ───────────────────────────────────────
  // Debounced so we don't hammer the worker on every keystroke. The
  // status feeds a green/red inline banner AND blocks 'Save & Next'
  // when the pincode is out of service area — no more waiting until
  // PostStep4 order submit to discover the pincode is unserviced.
  const [pinCheck, setPinCheck] = useState({ state: 'idle', city: null }); // idle | checking | serviced | not_serviced | error
  const [notifyState, setNotifyState] = useState('idle'); // idle | joining | joined
  useEffect(() => {
    if (!/^\d{6}$/.test(pincode)) { setPinCheck({ state: 'idle', city: null }); setNotifyState('idle'); return; }
    setPinCheck({ state: 'checking', city: null });
    const t = setTimeout(async () => {
      try {
        const res = await checkPincode(pincode);
        if (res?.data?.serviced) {
          setPinCheck({ state: 'serviced', city: res.data.city_label || null });
        } else {
          setPinCheck({ state: 'not_serviced', city: null });
          setNotifyState('idle');
        }
      } catch { setPinCheck({ state: 'error', city: null }); }
    }, 400);
    return () => clearTimeout(t);
  }, [pincode]);

  const handleNotifyMe = async () => {
    if (!/^\d{6}$/.test(pincode)) return;
    setNotifyState('joining');
    try {
      await joinPincodeWaitlist(pincode, user?.mobile || null);
      setNotifyState('joined');
    } catch { setNotifyState('idle'); }
  };

  const startAddNew = () => {
    if (saved.length >= 5) {
      Alert.alert(
        language === 'ta' ? 'அதிகபட்சம் 5' : 'Max 5 addresses',
        language === 'ta'
          ? 'ஏற்கனவே 5 முகவரி சேமிக்கப்பட்டுள்ளன. பழையதை நீக்கி புதியதை சேர்க்கவும்.'
          : 'You already have 5 saved addresses. Delete one to add a new one.',
      );
      return;
    }
    // Reset local form + draft address so the "add new" form starts clean.
    setLine1(''); setLine2(''); setLandmark(''); setPincode(''); setAddrType('Home');
    setCoords(null); setMode(null); setGpsLabel('');
    setOrderDraft({ addressLine1: '', addressLine2: '', landmark: '', pincode: '', addrType: 'Home', coords: null });
    setErrors({});
    setSaveErr('');
    setSubStep('form');
  };

  // ── Saved address banner: shown when a previous address exists and draft is empty ──
  const showSavedBanner =
    savedAddress &&
    !orderDraft.addressLine1 &&
    !orderDraft.pincode;

  const applySavedAddress = () => {
    if (!savedAddress) return;
    setLine1(savedAddress.line1 || '');
    setLine2(savedAddress.line2 || '');
    setLandmark(savedAddress.landmark || '');
    setPincode(savedAddress.pincode || '');
    setAddrType(savedAddress.addrType || 'Home');
    const c = savedAddress.coords || null;
    setCoords(c);
    setOrderDraft({
      addressLine1: savedAddress.line1    || '',
      addressLine2: savedAddress.line2    || '',
      landmark:     savedAddress.landmark || '',
      pincode:      savedAddress.pincode  || '',
      addrType:     savedAddress.addrType || 'Home',
      coords:       c,
    });
  };
  // Location permission NOT requested on mount — only when user taps a button

  // Explains first; offers Settings if blocked. Manual address entry stays
  // available either way.
  const requestPermission = () => ensurePermission('location', language);

  // ── GPS detect ─────────────────────────────────────────────────────────────
  const detectLocation = async () => {
    setLocLoading(true);
    const ok = await requestPermission();
    if (!ok) { setLocLoading(false); return; }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude: lat, longitude: lng } = pos.coords;
      setCoords({ lat, lng });
      setOrderDraft({ coords: { lat, lng } });
      setMapRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 });
      const addr = await reverseGeocode(lat, lng);
      setGpsLabel(addr.label || '');
      if (addr.line1)   { setLine1(addr.line1);     setOrderDraft({ addressLine1: addr.line1 }); }
      if (addr.line2)   { setLine2(addr.line2);     setOrderDraft({ addressLine2: addr.line2 }); }
      if (addr.pincode) { setPincode(addr.pincode); setOrderDraft({ pincode: addr.pincode }); }
      setGpsBaseline(addr.line2 || '');
    } catch { setGpsLabel(''); }
    setLocLoading(false);
  };

  // ── Open map modal ─────────────────────────────────────────────────────────
  const openMap = async () => {
    const ok = await requestPermission();
    if (!ok) return;
    let region = mapRegion;
    if (!region) {
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude: lat, longitude: lng } = pos.coords;
        region = { latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 };
        setMapRegion(region);
        setPinCoords({ latitude: lat, longitude: lng });
      } catch {}
    } else {
      setPinCoords({ latitude: region.latitude, longitude: region.longitude });
    }
    setMapVisible(true);
  };

  // WebView message from Leaflet map (pin dragged / map tapped)
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
    const c = { lat: pinCoords.latitude, lng: pinCoords.longitude };
    setCoords(c);
    setOrderDraft({ coords: c });
    const addr = await reverseGeocode(pinCoords.latitude, pinCoords.longitude);
    setGpsLabel(addr.label || pinLabel || '');
    if (addr.line1)   { setLine1(addr.line1);     setOrderDraft({ addressLine1: addr.line1 }); }
    if (addr.line2)   { setLine2(addr.line2);     setOrderDraft({ addressLine2: addr.line2 }); }
    if (addr.pincode) { setPincode(addr.pincode); setOrderDraft({ pincode: addr.pincode }); }
    setGpsBaseline(addr.line2 || '');
  };

  // ── Validation & Next ──────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!line1.trim())                    e.line1   = 'Required';
    if (!pincode || pincode.length !== 6) e.pincode = 'Enter valid 6-digit pincode';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    // Block advancing when the pincode is confirmed out-of-service. This
    // catches the case at PostStep3 instead of letting the seller walk
    // all the way through photos+timing and hit a rejection at submit.
    if (pinCheck.state === 'not_serviced') {
      Alert.alert(
        language === 'ta' ? 'கிடைக்கவில்லை' : 'Not available',
        language === 'ta'
          ? 'இந்த பின்கோடில் இப்போது சேவை கிடைக்கவில்லை. Notify me தட்டவும்.'
          : "We don't service this pincode yet. Please tap the Notify Me button below the pincode field.",
      );
      return;
    }
    setSaveErr('');
    const addressStr = [line1.trim(), line2.trim(), landmark.trim(), pincode]
      .filter(Boolean).join(', ');
    // Persist the new address to the server address book (up to 5).
    // Worker's INSERT requires a non-empty line2, so fall it back to
    // line1 when the seller only filled house/flat + pincode. Silent
    // failure only if the save actually errors on the server side; on
    // success we refresh the local list so back-nav shows the new row.
    try {
      const line2Safe = line2.trim() || line1.trim();
      await addAddress({
        type:     addrType || 'Home',
        line1:    line1.trim(),
        line2:    line2Safe,
        landmark: landmark.trim(),
        pincode,
        lat:      coords?.lat || null,
        lng:      coords?.lng || null,
        is_default: saved.length === 0,
      });
    } catch {}
    setOrderDraft({
      address:      addressStr,
      addressLine1: line1.trim(),
      addressLine2: line2.trim(),
      landmark:     landmark.trim(),
      pincode,
      addrType,
      coords,
    });
    navigation.navigate('PostStep4');
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
          <View key={s} style={[styles.stepDot, s < 3 && styles.stepDotDone, s === 3 && styles.stepDotActive]}>
            <Text style={[styles.stepNum, s <= 3 && styles.stepNumActive]}>{s < 3 ? '✓' : s}</Text>
          </View>
        ))}
        <View style={styles.stepLine} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Text style={styles.stepTitle}>{language === 'ta' ? 'பிக்கப் இடம்' : 'Pickup Address'}</Text>
          <Text style={styles.stepSub}>
            {subStep === 'list'
              ? (language === 'ta' ? 'சேமிக்கப்பட்ட முகவரி தேர்ந்தெடுக்கவும் அல்லது புதிது சேர்க்கவும்.' : 'Pick a saved address or add a new one.')
              : (language === 'ta' ? 'எங்கள் குழு எங்கு வர வேண்டும்?' : 'Where should our team come?')}
          </Text>

          {/* ── Address book list (saved addresses + Add-new tile) ── */}
          {subStep === 'list' && (
            <>
              {savedLoad ? (
                <View style={{ paddingVertical: 24 }}>
                  <ActivityIndicator color={C.green} />
                </View>
              ) : (
                <>
                  {saved.map(a => (
                    <View key={a.id} style={styles.savedRow}>
                      <TouchableOpacity
                        style={styles.savedRowMain}
                        onPress={() => pickSaved(a)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.savedRowTop}>
                          <View style={styles.savedTypeBadge}>
                            <Text style={styles.savedTypeText}>
                              {a.type === 'Office' ? '🏢' : a.type === 'Other' ? '📍' : '🏠'} {a.type || 'Home'}
                            </Text>
                          </View>
                          {a.is_default ? (
                            <View style={styles.defaultBadge}>
                              <Text style={styles.defaultBadgeText}>{language === 'ta' ? 'இயல்பு' : 'Default'}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.savedRowAddr} numberOfLines={2}>
                          {[a.line1, a.line2, a.landmark].filter(Boolean).join(', ')}
                        </Text>
                        <Text style={styles.savedRowPin}>📍 {a.pincode}</Text>
                      </TouchableOpacity>
                      {/* Hidden on the last address — a small seller must keep one. */}
                      {!isLastAddress ? (
                        <TouchableOpacity style={styles.savedDeleteBtn} onPress={() => removeSaved(a)}>
                          <Text style={styles.savedDeleteTxt}>🗑</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}
                  <TouchableOpacity
                    style={[styles.addNewTile, saved.length >= 5 && { opacity: 0.5 }]}
                    onPress={startAddNew}
                    disabled={saved.length >= 5}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addNewIcon}>➕</Text>
                    <Text style={styles.addNewText}>
                      {language === 'ta' ? 'புதிய முகவரி சேர்' : 'Add new address'}
                    </Text>
                    <Text style={styles.addNewCount}>
                      {saved.length}/5
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              <View style={{ height: 120 }} />
            </>
          )}

          {/* ── Saved address banner (in-progress order draft) ── */}
          {subStep === 'form' && showSavedBanner && (
            <View style={styles.savedCard}>
              <View style={styles.savedCardHeader}>
                <Text style={styles.savedCardTitle}>
                  📍 {language === 'ta' ? 'சேமிக்கப்பட்ட முகவரி' : 'Saved Address'}
                </Text>
                <View style={styles.savedBadge}>
                  <Text style={styles.savedBadgeText}>
                    {savedAddress.addrType || 'Home'}
                  </Text>
                </View>
              </View>
              <Text style={styles.savedCardAddr} numberOfLines={2}>
                {savedAddress.label || [savedAddress.line1, savedAddress.line2, savedAddress.pincode].filter(Boolean).join(', ')}
              </Text>
              <TouchableOpacity
                style={styles.useAddrBtn}
                onPress={applySavedAddress}
                activeOpacity={0.8}
              >
                <Text style={styles.useAddrBtnText}>
                  ✓ {language === 'ta' ? 'இந்த முகவரியை பயன்படுத்து' : 'Use This Address'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Form mode: GPS auto-fill + editable fields ── */}
          {subStep === 'form' && (<>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtnFull, mode === 'gps' && styles.modeBtnActive]}
              onPress={() => { setMode('gps'); detectLocation(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.modeIcon}>📍</Text>
              <Text style={[styles.modeTxt, mode === 'gps' && styles.modeTxtActive]}>
                {language === 'ta' ? 'தற்போதைய இடத்தை கண்டறிக' : 'Auto-fill from GPS'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Detected address card — only shown after user picks a mode ── */}
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
                  <View style={styles.gpsCardActions}>
                    <TouchableOpacity onPress={mode === 'map' ? openMap : detectLocation} style={styles.refreshBtn}>
                      <Text style={styles.refreshTxt}>
                        ↻ {mode === 'map'
                          ? (language === 'ta' ? 'வரைபடம் திற' : 'Open Map')
                          : (language === 'ta' ? 'புதுப்பி' : 'Refresh')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}

          <Text style={styles.dividerLabel}>
            {language === 'ta' ? 'முகவரி திருத்தவும் / உள்ளிடவும்' : 'Edit / Enter Address'}
          </Text>

          {/* Address fields */}
          <Field
            label={language === 'ta' ? 'வீடு / கடை எண் *' : 'House / Flat / Shop No. *'}
            value={line1}
            onChangeText={t => { setLine1(t); setOrderDraft({ addressLine1: t }); setErrors(e => ({ ...e, line1: null })); }}
            placeholder="e.g. Flat 3B, Sri Murugan Apts"
            error={errors.line1}
          />
          <Field
            label={language === 'ta' ? 'தெரு / பகுதி' : 'Street / Area'}
            value={line2}
            onChangeText={t => {
              setLine2(t); setOrderDraft({ addressLine2: t });
              // Drop the GPS pin if the edit removes any baseline word — the
              // pin no longer represents this street. Additions / re-casings
              // are fine and keep the coords intact.
              if (shouldDropGpsForLine2Edit(gpsBaseline, t)) {
                setCoords(null); setOrderDraft({ coords: null }); setGpsBaseline('');
              }
            }}
            placeholder="e.g. Usman Road, T. Nagar"
          />
          <Field
            label={language === 'ta' ? 'அடையாளச் சின்னம் (விரும்பினால்)' : 'Landmark (Optional)'}
            value={landmark}
            onChangeText={t => { setLandmark(t); setOrderDraft({ landmark: t }); }}
            placeholder="e.g. Near Saravana Stores"
          />
          <Field
            label={language === 'ta' ? 'பின்கோட் *' : 'Pincode *'}
            value={pincode}
            onChangeText={t => { if (/^\d*$/.test(t)) { setPincode(t); setOrderDraft({ pincode: t }); setErrors(e => ({ ...e, pincode: null })); }}}
            placeholder="6-digit pincode"
            keyboardType="number-pad"
            maxLength={6}
            error={errors.pincode}
          />

          {/* Pincode serviceability inline banner + Notify Me button. */}
          {pinCheck.state === 'checking' && (
            <View style={styles.pinChecking}>
              <ActivityIndicator size="small" color={C.green} />
              <Text style={styles.pinCheckingTxt}>{language === 'ta' ? 'சரிபார்க்கிறது…' : 'Checking availability…'}</Text>
            </View>
          )}
          {pinCheck.state === 'serviced' && (
            <View style={styles.pinOK}>
              <Text style={styles.pinOKTxt}>
                ✓ {language === 'ta' ? 'இந்த பகுதியில் பிக்-அப் கிடைக்கும்' : 'Available in your area'}
                {pinCheck.city ? ` · ${pinCheck.city}` : ''}
              </Text>
            </View>
          )}
          {pinCheck.state === 'not_serviced' && (
            <View style={styles.pinBad}>
              <Text style={styles.pinBadTitle}>
                📍 {language === 'ta' ? 'இந்த பகுதியில் இப்போது கிடைக்கவில்லை' : 'Not available at your location yet'}
              </Text>
              <Text style={styles.pinBadBody}>
                {language === 'ta'
                  ? 'விரைவில் உங்கள் பகுதியில் தொடங்கப்படும். Notify me தட்டினால், தொடங்கியவுடன் WhatsApp செய்வோம்.'
                  : "We'll be there soon. Tap Notify me and we'll WhatsApp you the moment we open in your pincode."}
              </Text>
              {notifyState === 'joined' ? (
                <View style={styles.notifyDone}>
                  <Text style={styles.notifyDoneTxt}>
                    ✓ {language === 'ta' ? 'சேர்க்கப்பட்டது! நாங்கள் தொடர்பு கொள்வோம்.' : "Added! We'll message you when we launch here."}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.notifyBtn}
                  onPress={handleNotifyMe}
                  disabled={notifyState === 'joining'}
                  activeOpacity={0.85}
                >
                  {notifyState === 'joining'
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.notifyBtnTxt}>🔔 {language === 'ta' ? 'கிடைக்கும்போது Notify' : 'Notify me when available'}</Text>}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Address type */}
          <Text style={styles.typeLabel}>{language === 'ta' ? 'முகவரி வகை' : 'Address Type'}</Text>
          <View style={styles.typeRow}>
            {['Home', 'Office', 'Other'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, addrType === t && styles.typeChipActive]}
                onPress={() => { setAddrType(t); setOrderDraft({ addrType: t }); }}
                activeOpacity={0.75}
              >
                <Text style={[styles.typeChipText, addrType === t && styles.typeChipTextActive]}>
                  {t === 'Home' ? '🏠' : t === 'Office' ? '🏢' : '📍'} {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 100 }} />
          </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {subStep === 'form' && (
        <View style={styles.footer}>
          {saved.length > 0 && (
            <TouchableOpacity style={styles.backToListBtn} onPress={() => setSubStep('list')}>
              <Text style={styles.backToListText}>{language === 'ta' ? '← சேமிக்கப்பட்டவை' : '← Saved addresses'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>{language === 'ta' ? 'சேமித்து அடுத்து →' : 'Save & Next →'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Full-screen Map Modal ── */}
      <Modal visible={mapVisible} animationType="slide" onRequestClose={() => setMapVisible(false)}>
        <View style={styles.mapRoot}>
          {/* Map header */}
          <SafeAreaView edges={['top']} style={styles.mapHeader}>
            <TouchableOpacity onPress={() => setMapVisible(false)} style={styles.mapClose}>
              <Text style={styles.mapCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.mapTitle}>
              {language === 'ta' ? 'இடத்தை தேர்வு செய்யவும்' : 'Select Pickup Location'}
            </Text>
            <View style={{ width: 36 }} />
          </SafeAreaView>

          {/* Map — OpenStreetMap via Leaflet.js (no API key required) */}
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
              <Text style={{ marginTop: 12, color: C.sub, fontFamily: FONTS.medium }}>
                Loading map…
              </Text>
            </View>
          )}

          {/* Pin info + confirm */}
          <View style={styles.mapBottom}>
            {pinLoading ? (
              <ActivityIndicator color={C.green} style={{ marginBottom: 8 }} />
            ) : pinLabel ? (
              <Text style={styles.pinLabel} numberOfLines={2}>📍 {pinLabel}</Text>
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

  // Mode toggle
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: C.bdr, backgroundColor: C.surface,
  },
  // Full-width variant used now that 'Select on Map' has been removed.
  modeBtnFull: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.bdr, backgroundColor: C.surface,
  },
  modeBtnActive: { borderColor: C.green, backgroundColor: C.mint },
  modeIcon: { fontSize: 16 },
  modeTxt:       { fontFamily: FONTS.semiBold, fontSize: 13, color: C.sub },
  modeTxtActive: { color: C.green },

  // GPS card
  gpsCard: { backgroundColor: C.mint, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.mintBdr, minHeight: 72 },
  gpsCardLabel: { fontFamily: FONTS.semiBold, fontSize: 12, color: C.green, marginBottom: 4 },
  gpsCardText:  { fontFamily: FONTS.medium, fontSize: 14, color: C.text, lineHeight: 20 },
  gpsCardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  refreshBtn: {},
  refreshTxt: { fontFamily: FONTS.semiBold, fontSize: 13, color: C.green },

  // Address book — list of saved addresses (up to 5) + Add-new tile
  savedRow: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.bdr,
    marginBottom: 10, overflow: 'hidden',
  },
  savedRowMain:   { flex: 1, padding: 14 },
  savedRowTop:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  savedTypeBadge: { backgroundColor: C.mint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: C.mintBdr },
  savedTypeText:  { fontFamily: FONTS.bold, fontSize: 11, color: C.green },
  defaultBadge:   { backgroundColor: '#EFF6FF', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#BFDBFE' },
  defaultBadgeText: { fontFamily: FONTS.bold, fontSize: 10, color: '#1D4ED8' },
  savedRowAddr:   { fontFamily: FONTS.semiBold, fontSize: 14, color: C.text, lineHeight: 20 },
  savedRowPin:    { fontFamily: FONTS.regular, fontSize: 12, color: C.sub, marginTop: 4 },
  savedDeleteBtn: { width: 46, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: C.bdr },
  savedDeleteTxt: { fontSize: 18 },
  addNewTile: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: C.green, backgroundColor: C.mint, marginTop: 4,
  },
  addNewIcon: { fontSize: 18 },
  addNewText: { flex: 1, fontFamily: FONTS.bold, fontSize: 14, color: C.green },
  addNewCount: { fontFamily: FONTS.semiBold, fontSize: 12, color: C.green, opacity: 0.7 },

  backToListBtn: { paddingVertical: 10, alignItems: 'center' },
  backToListText: { fontFamily: FONTS.semiBold, fontSize: 13, color: C.sub },

  // Pincode serviceability inline banners
  pinChecking:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -8, marginBottom: 12 },
  pinCheckingTxt: { fontFamily: FONTS.regular, fontSize: 12, color: C.sub },
  pinOK: {
    marginTop: -8, marginBottom: 12,
    backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  pinOKTxt: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#15803D' },
  pinBad: {
    marginTop: -8, marginBottom: 12,
    backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1,
    borderRadius: 14, padding: 14,
  },
  pinBadTitle: { fontFamily: FONTS.bold, fontSize: 13, color: '#B91C1C', marginBottom: 6 },
  pinBadBody:  { fontFamily: FONTS.regular, fontSize: 12, color: '#991B1B', lineHeight: 17, marginBottom: 10 },
  notifyBtn: {
    backgroundColor: '#B91C1C', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  notifyBtnTxt: { fontFamily: FONTS.bold, fontSize: 13, color: '#fff' },
  notifyDone: {
    backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  notifyDoneTxt: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#15803D' },

  // Saved address banner
  savedCard: {
    backgroundColor: C.mint, borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1.5, borderColor: C.mintBdr,
  },
  savedCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  savedCardTitle:  { fontFamily: FONTS.extraBold, fontSize: 13, color: C.green },
  savedBadge:      { backgroundColor: C.green, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  savedBadgeText:  { fontFamily: FONTS.bold, fontSize: 11, color: '#fff' },
  savedCardAddr:   { fontFamily: FONTS.medium, fontSize: 14, color: C.text, lineHeight: 20, marginBottom: 12 },
  useAddrBtn: {
    backgroundColor: C.green, borderRadius: 12, paddingVertical: 10, alignItems: 'center',
  },
  useAddrBtnText: { fontFamily: FONTS.extraBold, fontSize: 14, color: '#fff' },

  dividerLabel: { fontFamily: FONTS.extraBold, fontSize: 12, color: C.light, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16 },

  fieldLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: C.text, marginBottom: 6 },
  fieldInput: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1.5, borderColor: C.bdr, paddingHorizontal: 16, paddingVertical: 14, fontFamily: FONTS.medium, fontSize: 15, color: C.text },
  fieldFocused: { borderColor: C.green, backgroundColor: C.mint },
  fieldError:   { borderColor: C.red },
  errorText:    { fontFamily: FONTS.regular, fontSize: 12, color: C.red, marginTop: 4 },

  typeLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: C.text, marginBottom: 10 },
  typeRow:   { flexDirection: 'row', gap: 10 },
  typeChip:       { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: C.bdr, backgroundColor: C.surface, alignItems: 'center' },
  typeChipActive: { borderColor: C.green, backgroundColor: C.mint },
  typeChipText:       { fontFamily: FONTS.semiBold, fontSize: 13, color: C.sub },
  typeChipTextActive: { color: C.green },

  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.bdr },
  nextBtn: { backgroundColor: C.green, borderRadius: 16, paddingVertical: 17, alignItems: 'center', elevation: 4, shadowColor: C.green, shadowOpacity: 0.3, shadowRadius: 8 },
  nextBtnText: { fontFamily: FONTS.extraBold, fontSize: 17, color: '#fff' },

  // Map modal
  mapRoot:   { flex: 1, backgroundColor: C.bg },
  mapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.bdr, backgroundColor: C.bg },
  mapClose:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  mapCloseText: { fontFamily: FONTS.bold, fontSize: 18, color: C.text },
  mapTitle:  { fontFamily: FONTS.extraBold, fontSize: 16, color: C.text },
  map:       { flex: 1 },
  mapBottom: { backgroundColor: C.bg, padding: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: C.bdr },
  pinLabel:  { fontFamily: FONTS.medium, fontSize: 14, color: C.text, marginBottom: 14, lineHeight: 20 },
  pinHint:   { fontFamily: FONTS.regular, fontSize: 13, color: C.sub, marginBottom: 14, textAlign: 'center' },
  confirmBtn: { backgroundColor: C.green, borderRadius: 16, paddingVertical: 16, alignItems: 'center', elevation: 4, shadowColor: C.green, shadowOpacity: 0.3, shadowRadius: 8 },
  confirmBtnDisabled: { backgroundColor: C.light, shadowOpacity: 0, elevation: 0 },
  confirmBtnText: { fontFamily: FONTS.extraBold, fontSize: 16, color: '#fff' },
});
