/**
 * PostStep2Screen — Step 2 of 4: Material Type + Estimated Weight
 * Multi-select materials (min 1, no max limit)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';
import ProductIconChip from '../../components/ProductIconChip';
import api from '../../services/api';

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

// Materials come from GET /api/products — the same catalogue the seller
// website and admin use. This screen used to carry a hardcoded list plus a
// `MATERIAL_PRODUCT_MAP` of guessed product IDs; most of those IDs were
// wrong or did not exist, so orders were filed against the wrong product
// (e.g. "Newspaper" was sent as product 12 = Single Door Fridge). Never
// reintroduce a hardcoded list here — add the product in admin instead.

// Weight brackets — pickup is FREE at every bracket. `fee` is kept as a key
// so downstream code (order payload, admin display) stays intact; value is
// zero everywhere.
const WEIGHT_OPTIONS = [
  { label: '30–50 kg',      fee: 0, ta: '30–50 கிலோ' },
  { label: '50–75 kg',      fee: 0, ta: '50–75 கிலோ' },
  { label: '75–100 kg',     fee: 0, ta: '75–100 கிலோ' },
  { label: 'More than 100 kg', fee: 0, ta: '100 கிலோவுக்கு மேல்' },
];

export default function PostStep2Screen({ navigation }) {
  const { language, orderDraft, setOrderDraft } = useApp();

  // Initialise from saved draft so back-navigation restores selections.
  // Draft materials are numeric product IDs.
  const [materials, setMaterials] = useState(orderDraft.materials?.length ? orderDraft.materials : []);
  const [weight,    setWeight]    = useState(orderDraft.weight ?? null);

  const [products,    setProducts]    = useState([]);
  const [loadingPro,  setLoadingPro]  = useState(true);
  const [productError, setProductError] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoadingPro(true);
    setProductError(false);
    api.get('/products')
      .then(res => {
        if (!alive) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setProducts(list.filter(p => p.is_active !== 0));
      })
      .catch(() => { if (alive) setProductError(true); })
      .finally(() => { if (alive) setLoadingPro(false); });
    return () => { alive = false; };
  }, []);

  // Group by the product's own category, same as the website's picker.
  const grouped = useMemo(() => {
    const groups = {};
    products.forEach(p => {
      const cat = p.cat || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    Object.values(groups).forEach(g => g.sort((a, b) => a.name.localeCompare(b.name)));
    return groups;
  }, [products]);

  const canNext = materials.length > 0 && !!weight;

  const toggleMaterial = (id) => {
    setMaterials(prev => {
      const next = prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id];
      // Carry the display names too so step 4 and the order summary don't
      // need their own copy of the catalogue.
      const names = next
        .map(pid => products.find(p => p.id === pid))
        .filter(Boolean)
        .map(p => (language === 'ta' && p.name_ta) ? p.name_ta : p.name);
      setOrderDraft({ materials: next, materialNames: names });
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

        {loadingPro ? (
          <View style={styles.proLoading}>
            <ActivityIndicator color={C.green} />
            <Text style={styles.proLoadingText}>
              {language === 'ta' ? 'பொருட்கள் ஏற்றப்படுகிறது…' : 'Loading materials…'}
            </Text>
          </View>
        ) : productError || products.length === 0 ? (
          <View style={styles.proError}>
            <Text style={styles.proErrorText}>
              {language === 'ta'
                ? 'பொருட்கள் பட்டியலை ஏற்ற முடியவில்லை. இணையத்தை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.'
                : "Couldn't load the materials list. Check your connection and try again."}
            </Text>
          </View>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <View key={cat} style={{ marginBottom: 18 }}>
              <Text style={styles.catLabel}>{cat}</Text>
              <View style={styles.materialList}>
                {items.map(p => {
                  const isSelected = materials.includes(p.id);
                  const label = (language === 'ta' && p.name_ta) ? p.name_ta : p.name;
                  // Same rate line the website shows under each product.
                  const lo = p.p1 ?? p.market_price;
                  const hi = p.p2 ?? p.market_price;
                  const rate = (lo == null && hi == null)
                    ? null
                    : (lo === hi || hi == null)
                      ? `₹${lo} / ${p.unit || 'kg'}`
                      : `₹${lo}–₹${hi} / ${p.unit || 'kg'}`;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.materialCard, isSelected && styles.materialCardActive]}
                      onPress={() => toggleMaterial(p.id)}
                      activeOpacity={0.8}
                    >
                      <ProductIconChip product={p} size={20} chipSize={36} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.materialLabel, isSelected && { color: C.green }]}>
                          {label}
                        </Text>
                        {rate ? <Text style={styles.materialRate}>{rate}</Text> : null}
                      </View>
                      <View style={[styles.checkBox, isSelected && styles.checkBoxOn]}>
                        {isSelected && <Text style={styles.checkMark}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {/* Weight */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          {language === 'ta' ? 'எடை அளவு *' : 'Estimated Weight *'}
        </Text>
        <View style={styles.minBadge}>
          <Text style={styles.minBadgeText}>
            ⚖️ {language === 'ta'
              ? 'குறைந்தது 30 கிலோ தேவை · எல்லா பிக்கப்பும் இலவசம்'
              : 'Minimum 30 kg per pickup · Free pickup at every bracket'}
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

  catLabel: { fontFamily: FONTS.bold, fontSize: 10, color: C.sub, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },

  proLoading:     { paddingVertical: 28, alignItems: 'center', gap: 10 },
  proLoadingText: { fontFamily: FONTS.semiBold, fontSize: 13, color: C.sub },
  proError:       { backgroundColor: C.amberBg, borderWidth: 1, borderColor: C.amberBdr, borderRadius: 12, padding: 14 },
  proErrorText:   { fontFamily: FONTS.semiBold, fontSize: 13, color: '#92400E', lineHeight: 19 },

  materialList: { gap: 8 },
  materialCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.bdr, backgroundColor: C.surface,
  },
  materialCardActive: { borderColor: C.green, backgroundColor: C.mint },
  materialLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: C.text },
  materialRate:  { fontFamily: FONTS.regular, fontSize: 11, color: C.sub, marginTop: 2 },
  checkBox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.bdr,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
  },
  checkBoxOn: { borderColor: C.green, backgroundColor: C.green },
  checkMark:  { fontFamily: FONTS.black, fontSize: 13, color: '#FFFFFF' },

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
