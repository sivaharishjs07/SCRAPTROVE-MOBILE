/**
 * PostStep1Screen — Step 1 of 4: Choose Pickup Type
 * Instant (within 3 hrs) or Scheduled (pick date + time slot).
 *
 * Availability is admin-controlled:
 *   GET /api/pickup-availability -> { instant_enabled, available_dates: [YYYY-MM-DD] }
 * Instant option is greyed out when instant_enabled=false, scheduled date
 * chips are pulled from available_dates only. If no dates are open the
 * scheduled option is also disabled with a friendly message.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';

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
  amber50: '#FFFBEB',
  amber200:'#FDE68A',
  amber700:'#92400E',
};

const TIME_SLOTS = ['10am – 12pm', '12pm – 2pm', '2pm – 4pm', '4pm – 6pm'];

// Human label for an ISO date. Today / Tomorrow, else "Sat, 15 Aug".
const isoToday = () => new Date().toISOString().slice(0, 10);
const humanizeISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d); target.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0)  return 'Today';
  if (diff === 1)  return 'Tomorrow';
  return target.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

export default function PostStep1Screen({ navigation }) {
  const { language, orderDraft, setOrderDraft } = useApp();

  const [type,     setType]     = useState(orderDraft.type);
  const [slot,     setSlot]     = useState(orderDraft.slot);
  const [timeSlot, setTimeSlot] = useState(orderDraft.timeSlot);

  const [availability, setAvailability] = useState(null); // { instant_enabled, available_dates }
  const [loading, setLoading]           = useState(true);

  // Fetch availability on mount. Refetches on focus so admin toggles land
  // when the seller returns to this step from a later screen.
  useEffect(() => {
    const load = () => {
      setLoading(true);
      api.get('/pickup-availability')
        .then(res => setAvailability(res.data || { instant_enabled: false, available_dates: [] }))
        .catch(() => setAvailability({ instant_enabled: false, available_dates: [] }))
        .finally(() => setLoading(false));
    };
    load();
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation]);

  const instantEnabled  = !!availability?.instant_enabled;
  const availableDates  = availability?.available_dates || [];
  const hasSchedule     = availableDates.length > 0;

  // If the seller earlier picked an option that's now closed by the admin,
  // silently clear it so canNext stays honest.
  useEffect(() => {
    if (!instantEnabled && type === 'instant') { setType(null); setOrderDraft({ type: null, slot: null, timeSlot: null }); }
    if (type === 'scheduled' && slot && !availableDates.includes(slot)) {
      setSlot(null); setOrderDraft({ slot: null });
    }
  }, [instantEnabled, availableDates, type, slot, setOrderDraft]);

  const handleSetType     = (v) => { setType(v); setOrderDraft({ type: v, slot: null, timeSlot: null }); };
  const handleSetSlot     = (v) => { setSlot(v); setOrderDraft({ slot: v }); };
  const handleSetTimeSlot = (v) => { setTimeSlot(v); setOrderDraft({ timeSlot: v }); };

  const canNext = type === 'instant' || (type === 'scheduled' && slot && timeSlot);
  const handleNext = () => navigation.navigate('PostStep2');

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'ta' ? 'ஸ்கிராப் பிக்கப்' : 'Post Scrap Pickup'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.stepBar}>
        {[1, 2, 3, 4].map(s => (
          <View key={s} style={[styles.stepDot, s === 1 && styles.stepDotActive]}>
            <Text style={[styles.stepNum, s === 1 && styles.stepNumActive]}>{s}</Text>
          </View>
        ))}
        <View style={styles.stepLine} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>
          {language === 'ta' ? 'பிக்கப் வகை தேர்ந்தெடுங்கள்' : 'Choose Pickup Type'}
        </Text>
        <Text style={styles.stepSub}>
          {language === 'ta' ? 'எப்போது டீலர் வர வேண்டும்?' : 'When should the dealer arrive?'}
        </Text>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={C.green} />
            <Text style={styles.loadingText}>Checking availability…</Text>
          </View>
        )}

        {!loading && (
          <>
            {/* Instant */}
            <TouchableOpacity
              style={[styles.typeCard, type === 'instant' && styles.typeCardActive, !instantEnabled && styles.typeCardDisabled]}
              onPress={() => instantEnabled && handleSetType('instant')}
              disabled={!instantEnabled}
              activeOpacity={0.85}
            >
              <Text style={styles.typeEmoji}>⚡</Text>
              <View style={styles.typeBody}>
                <Text style={styles.typeTitle}>
                  {language === 'ta' ? 'உடனடி பிக்கப்' : 'Instant Pickup'}
                </Text>
                <Text style={styles.typeSub}>
                  {instantEnabled
                    ? (language === 'ta' ? '3 மணி நேரத்தில் வருவோம்' : 'Dealer arrives within 3 hours')
                    : (language === 'ta' ? 'இப்போது கிடைக்கவில்லை' : 'Not available right now')}
                </Text>
              </View>
              {instantEnabled ? (
                <View style={[styles.radio, type === 'instant' && styles.radioActive]}>
                  {type === 'instant' && <View style={styles.radioDot} />}
                </View>
              ) : (
                <Text style={styles.closedPill}>Closed</Text>
              )}
            </TouchableOpacity>

            {/* Scheduled */}
            <TouchableOpacity
              style={[styles.typeCard, type === 'scheduled' && styles.typeCardActive, !hasSchedule && styles.typeCardDisabled]}
              onPress={() => hasSchedule && handleSetType('scheduled')}
              disabled={!hasSchedule}
              activeOpacity={0.85}
            >
              <Text style={styles.typeEmoji}>📅</Text>
              <View style={styles.typeBody}>
                <Text style={styles.typeTitle}>
                  {language === 'ta' ? 'திட்டமிட்ட பிக்கப்' : 'Scheduled Pickup'}
                </Text>
                <Text style={styles.typeSub}>
                  {hasSchedule
                    ? (language === 'ta' ? 'நீங்கள் விரும்பும் தேதி தேர்ந்தெடுங்கள்' : 'Choose your preferred date & time')
                    : (language === 'ta' ? 'இப்போது தேதிகள் இல்லை' : 'No open dates right now')}
                </Text>
              </View>
              {hasSchedule ? (
                <View style={[styles.radio, type === 'scheduled' && styles.radioActive]}>
                  {type === 'scheduled' && <View style={styles.radioDot} />}
                </View>
              ) : (
                <Text style={styles.closedPill}>Closed</Text>
              )}
            </TouchableOpacity>

            {/* No availability at all — banner + note */}
            {!instantEnabled && !hasSchedule && (
              <View style={styles.emptyBanner}>
                <Text style={styles.emptyBannerTitle}>😔 No pickup slots open right now</Text>
                <Text style={styles.emptyBannerBody}>
                  We're busy with other orders. Please check back tomorrow — we open new slots regularly.
                </Text>
              </View>
            )}

            {/* Scheduled sub-options */}
            {type === 'scheduled' && hasSchedule && (
              <>
                <Text style={styles.subLabel}>
                  {language === 'ta' ? 'தேதி தேர்ந்தெடுங்கள்' : 'Select Date'}
                </Text>
                <Text style={styles.subHint}>
                  {language === 'ta'
                    ? '📅 கீழே காட்டப்பட்டவை மட்டுமே கிடைக்கக்கூடிய பிக்-அப் தேதிகள்'
                    : '📅 Only the dates below are open for pickup'}
                </Text>
                <View style={styles.chipRow}>
                  {availableDates.map(iso => (
                    <TouchableOpacity
                      key={iso}
                      style={[styles.chip, slot === iso && styles.chipActive]}
                      onPress={() => handleSetSlot(iso)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, slot === iso && styles.chipTextActive]}>
                        {humanizeISO(iso)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.subLabel}>
                  {language === 'ta' ? 'நேர இடைவெளி' : 'Time Slot'}
                </Text>
                <View style={styles.chipRow}>
                  {TIME_SLOTS.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.chip, timeSlot === t && styles.chipActive]}
                      onPress={() => handleSetTimeSlot(t)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, timeSlot === t && styles.chipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, !canNext && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!canNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>{language === 'ta' ? 'அடுத்து →' : 'Next →'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bdr },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backText: { fontFamily: FONTS.bold, fontSize: 22, color: C.green },
  headerTitle: { fontFamily: FONTS.extraBold, fontSize: 17, color: C.text },

  stepBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8, position: 'relative' },
  stepDot:        { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: C.bdr, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  stepDotActive:  { borderColor: C.green, backgroundColor: C.green },
  stepNum:        { fontFamily: FONTS.bold, fontSize: 13, color: C.light },
  stepNumActive:  { color: '#fff' },
  stepLine:       { position: 'absolute', left: '20%', right: '20%', height: 2, backgroundColor: C.bdr, zIndex: -1 },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  stepTitle: { fontFamily: FONTS.black, fontSize: 22, color: C.text, marginBottom: 6 },
  stepSub:   { fontFamily: FONTS.regular, fontSize: 14, color: C.sub, marginBottom: 24 },

  loadingRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  loadingText: { fontFamily: FONTS.regular, fontSize: 13, color: C.sub },

  typeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, borderRadius: 20, borderWidth: 2, borderColor: C.bdr,
    backgroundColor: C.surface, marginBottom: 14,
  },
  typeCardActive:   { borderColor: C.green, backgroundColor: C.mint },
  typeCardDisabled: { opacity: 0.55 },
  typeEmoji: { fontSize: 32 },
  typeBody:  { flex: 1 },
  typeTitle: { fontFamily: FONTS.extraBold, fontSize: 16, color: C.text, marginBottom: 2 },
  typeSub:   { fontFamily: FONTS.regular, fontSize: 13, color: C.sub },
  radio:       { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.bdr, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: C.green, backgroundColor: C.green },
  radioDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  closedPill:  { fontFamily: FONTS.bold, fontSize: 10, color: '#B91C1C', backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },

  emptyBanner: {
    backgroundColor: C.amber50, borderColor: C.amber200, borderWidth: 1,
    borderRadius: 14, padding: 16, marginTop: 4, marginBottom: 8,
  },
  emptyBannerTitle: { fontFamily: FONTS.bold, fontSize: 14, color: C.amber700, marginBottom: 4 },
  emptyBannerBody:  { fontFamily: FONTS.regular, fontSize: 13, color: C.amber700, lineHeight: 18 },

  subLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: C.text, marginTop: 16, marginBottom: 4 },
  subHint:  { fontFamily: FONTS.regular, fontSize: 11, color: C.sub, marginBottom: 10, lineHeight: 16 },
  chipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:       { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: C.bdr, backgroundColor: C.surface },
  chipActive: { borderColor: C.green, backgroundColor: C.mint },
  chipText:       { fontFamily: FONTS.semiBold, fontSize: 13, color: C.sub },
  chipTextActive: { color: C.green },

  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.bdr },
  nextBtn: {
    backgroundColor: C.green, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', elevation: 4,
    shadowColor: C.green, shadowOpacity: 0.3, shadowRadius: 8,
  },
  nextBtnDisabled: { backgroundColor: C.light, shadowOpacity: 0, elevation: 0 },
  nextBtnText: { fontFamily: FONTS.extraBold, fontSize: 17, color: '#fff' },
});
