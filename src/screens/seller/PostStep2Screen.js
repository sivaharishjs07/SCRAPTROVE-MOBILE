/**
 * PostStep2Screen — Step 2 of 4: Material Type + Estimated Weight
 * Multi-select materials (min 1, no max limit)
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';
import ProductIconChip from '../../components/ProductIconChip';

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
  amber:   '#F59E0B',
  amberBg: '#FFFBEB',
  amberBdr:'#FDE68A',
};

const MATERIALS = [
  { id: 'iron',        en: 'Iron',               ta: 'இரும்பு'              },
  { id: 'steel',       en: 'Steel',              ta: 'எஃகு'                },
  { id: 'steel_utensil',en:'Steel Utensils',     ta: 'எஃகு பாத்திரங்கள்'   },
  { id: 'copper',      en: 'Copper',             ta: 'தாமிரம்'             },
  { id: 'brass',       en: 'Brass',              ta: 'பித்தளை'             },
  { id: 'aluminium',   en: 'Aluminium',          ta: 'அலுமினியம்'          },
  { id: 'paper',       en: 'Paper / Cardboard',  ta: 'காகிதம் / அட்டை'    },
  { id: 'newspaper',   en: 'Newspaper',          ta: 'செய்தித்தாள்'        },
  { id: 'books',       en: 'Books',              ta: 'புத்தகங்கள்'          },
  { id: 'plastic_hard',en: 'Plastic (Hard)',     ta: 'பிளாஸ்டிக் (கடினம்)' },
  { id: 'plastic_pet', en: 'Plastic Bottles',    ta: 'பிளாஸ்டிக் பாட்டில்' },
  { id: 'mobile',      en: 'Mobile / Laptop',    ta: 'மொபைல் / லேப்டாப்'   },
  { id: 'tv',          en: 'TV / Monitor',       ta: 'TV / மானிட்டர்'      },
  { id: 'washing',     en: 'Washing Machine',    ta: 'வாஷிங் மெஷின்'       },
  { id: 'fridge',      en: 'Fridge / AC',        ta: 'ஃப்ரிட்ஜ் / AC'     },
  { id: 'battery',     en: 'Batteries',          ta: 'பேட்டரிகள்'           },
  { id: 'tyre',        en: 'Tyres / Wheels',     ta: 'டயர் / சக்கரம்'      },
  { id: 'ewaste',      en: 'E-Waste / Electronic',ta:'மின்னணு கழிவு'       },
  { id: 'mixed',       en: 'Mixed / Other',      ta: 'கலவை / மற்றவை'       },
];

// Weight brackets + pickup-fee schedule.
// Below-50 kg pickups carry a small ₹30 fee to cover fuel and labour; anything
// 50 kg and above is free. The fee is stored on the order (worker: orders.
// pickup_fee) so admin sees exactly what was charged.
const WEIGHT_OPTIONS = [
  { label: '15–30 kg',      fee: 30, ta: '15–30 கிலோ' },
  { label: '30–50 kg',      fee: 30, ta: '30–50 கிலோ' },
  { label: '50–75 kg',      fee: 0,  ta: '50–75 கிலோ' },
  { label: '75–100 kg',     fee: 0,  ta: '75–100 கிலோ' },
  { label: 'More than 100 kg', fee: 0, ta: '100 கிலோவுக்கு மேல்' },
];

export default function PostStep2Screen({ navigation }) {
  const { language, orderDraft, setOrderDraft } = useApp();

  // Initialise from saved draft so back-navigation restores selections
  const [materials, setMaterials] = useState(orderDraft.materials?.length ? orderDraft.materials : []);
  const [weight,    setWeight]    = useState(orderDraft.weight ?? null);

  const canNext = materials.length > 0 && !!weight;

  const toggleMaterial = (id) => {
    setMaterials(prev => {
      const next = prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id];
      setOrderDraft({ materials: next });
      return next;
    });
  };

  const handleSetWeight = (w) => {
    setWeight(w);
    const opt = WEIGHT_OPTIONS.find(o => o.label === w);
    setOrderDraft({ weight: w, pickup_fee: opt?.fee ?? 0 });
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
          <View key={s} style={[styles.stepDot, s < 2 && styles.stepDotDone, s === 2 && styles.stepDotActive]}>
            <Text style={[styles.stepNum, s <= 2 && styles.stepNumActive]}>{s < 2 ? '✓' : s}</Text>
          </View>
        ))}
        <View style={styles.stepLine} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>{language === 'ta' ? 'என்ன விற்கிறீர்கள்?' : 'What are you selling?'}</Text>
        <Text style={styles.stepSub}>{language === 'ta' ? 'பொருட்களை தேர்ந்தெடுங்கள் (ஒன்று அல்லது அதிகம்)' : 'Select one or more material types'}</Text>

        {/* Material — multi-select */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>{language === 'ta' ? 'பொருள் வகை *' : 'Material Type *'}</Text>
          {materials.length > 0 && (
            <Text style={styles.selectedCount}>{materials.length} selected</Text>
          )}
        </View>

        <View style={styles.materialGrid}>
          {MATERIALS.map(m => {
            const isSelected = materials.includes(m.id);
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.materialCard, isSelected && styles.materialCardActive]}
                onPress={() => toggleMaterial(m.id)}
                activeOpacity={0.8}
              >
                <ProductIconChip name={m.en} size={16} chipSize={32} />
                <Text style={[styles.materialLabel, isSelected && { color: C.green }]}>
                  {language === 'ta' ? m.ta : m.en}
                </Text>
                {isSelected && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Weight */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          {language === 'ta' ? 'எடை அளவு *' : 'Estimated Weight *'}
        </Text>
        <View style={styles.minBadge}>
          <Text style={styles.minBadgeText}>
            ⚖️ {language === 'ta'
              ? 'குறைந்தது 15 கிலோ தேவை · 50 கிலோவுக்கு கீழ் ₹30 பிக்கப் கட்டணம்'
              : 'Minimum 15 kg per pickup · ₹30 pickup fee for orders below 50 kg'}
          </Text>
        </View>
        {WEIGHT_OPTIONS.map(w => (
          <TouchableOpacity
            key={w.label}
            style={[styles.weightRow, weight === w.label && styles.weightRowActive]}
            onPress={() => handleSetWeight(w.label)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.weightLabel, weight === w.label && styles.weightLabelActive]}>
                {language === 'ta' ? w.ta : w.label}
              </Text>
              {w.fee > 0 ? (
                <Text style={styles.feeHint}>
                  {language === 'ta' ? `₹${w.fee} பிக்கப் கட்டணம்` : `₹${w.fee} pickup fee`}
                </Text>
              ) : (
                <Text style={styles.feeFree}>
                  {language === 'ta' ? '✓ இலவச பிக்கப்' : '✓ Free pickup'}
                </Text>
              )}
            </View>
            <View style={[styles.radio, weight === w.label && styles.radioActive]}>
              {weight === w.label && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, !canNext && styles.nextBtnDisabled]}
          onPress={() => navigation.navigate('PostStep3')}
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

  sectionRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionLabel:   { fontFamily: FONTS.semiBold, fontSize: 14, color: C.text },
  selectedCount:  { fontFamily: FONTS.bold, fontSize: 12, color: C.green, backgroundColor: C.mint, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },

  materialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  materialCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.bdr, backgroundColor: C.surface,
    minWidth: '46%', flex: 1,
  },
  materialCardActive: { borderColor: C.green, backgroundColor: C.mint },
  materialLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: C.text, flex: 1 },
  checkMark:     { fontFamily: FONTS.black, fontSize: 13, color: C.green },

  minBadge: { backgroundColor: C.amberBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, borderWidth: 1, borderColor: C.amberBdr },
  minBadgeText: { fontFamily: FONTS.bold, fontSize: 12, color: '#92400E' },

  weightRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, borderWidth: 2, borderColor: C.bdr, backgroundColor: C.surface, marginBottom: 8 },
  weightRowActive: { borderColor: C.green, backgroundColor: C.mint },
  weightLabel:       { fontFamily: FONTS.extraBold, fontSize: 15, color: C.text },
  weightLabelActive: { color: C.green },
  feeHint:  { fontFamily: FONTS.semiBold, fontSize: 11, color: '#92400E', marginTop: 3 },
  feeFree:  { fontFamily: FONTS.semiBold, fontSize: 11, color: C.green,   marginTop: 3 },
  radio:       { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.bdr, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: C.green, backgroundColor: C.green },
  radioDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.bdr },
  nextBtn: { backgroundColor: C.green, borderRadius: 16, paddingVertical: 17, alignItems: 'center', elevation: 4, shadowColor: C.green, shadowOpacity: 0.3, shadowRadius: 8 },
  nextBtnDisabled: { backgroundColor: C.light, shadowOpacity: 0, elevation: 0 },
  nextBtnText: { fontFamily: FONTS.extraBold, fontSize: 17, color: '#fff' },
});
