import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';
import { SUPPORT_WHATSAPP } from '../../constants/contact';

const C = {
  bg:      '#F9FAFB',
  card:    '#FFFFFF',
  border:  '#E5E7EB',
  text:    '#0A1628',
  text2:   '#374151',
  sub:     '#6B7280',
  green:   '#16A34A',
  greenBg: '#F0FDF4',
  blue600: '#2563EB',
  blue50:  '#EFF6FF',
  amber50: '#FFFBEB',
  amber200:'#FDE68A',
  amber700:'#92400E',
  wa:      '#25D366',
};

// What Scrap Trove buys from bulk / industrial sellers. Categories mirror
// the web B2B landing page. E-waste is intentionally NOT here — we don't
// currently handle it in bulk.
const CATEGORIES = [
  {
    icon: '🔩',
    en:   'Iron',
    ta:   'இரும்பு',
    desc_en: 'Punchings, turnings, plate cutting, end bits',
    desc_ta: 'பஞ்சிங், டர்னிங்ஸ், plate cutting, end bits',
  },
  {
    icon: '🪛',
    en:   'Mild Steel',
    ta:   'மைல்டு ஸ்டீல்',
    desc_en: 'MS sections, sheet, rod, wire — sorted',
    desc_ta: 'MS தகடு, கம்பி, சட்டம் — தனித்தனியாக',
  },
  {
    icon: '⚙️',
    en:   'Mixed Iron / Cast Iron',
    ta:   'கலவை இரும்பு / வார்ப்பிரும்பு',
    desc_en: 'Borings, broken castings, mixed grades, machine parts',
    desc_ta: 'போரிங்ஸ், உடைந்த casting, கலவை grades, machine parts',
  },
  {
    icon: '✨',
    en:   'Stainless Steel',
    ta:   'ஸ்டெயின்லெஸ் ஸ்டீல்',
    desc_en: 'SS304 / SS202 sorted',
    desc_ta: 'SS304 / SS202 தனித்தனியாக',
  },
  {
    icon: '🟠',
    en:   'Copper',
    ta:   'செம்பு',
    desc_en: 'Wire, cable, mixed grades',
    desc_ta: 'கம்பி, cable, கலவை',
  },
  {
    icon: '🟡',
    en:   'Brass & Gunmetal',
    ta:   'பித்தளை & கன்மெட்டல்',
    desc_en: 'Turnings, sheet, machine offcuts',
    desc_ta: 'டர்னிங்ஸ், தகடு, machine offcuts',
  },
  {
    icon: '⬜',
    en:   'Aluminium',
    ta:   'அலுமினியம்',
    desc_en: 'Sections, wire, castings',
    desc_ta: 'செக்ஷன்ஸ், கம்பி, casting',
  },
  {
    icon: '📦',
    en:   'Mixed Industrial Lots',
    ta:   'கலவை தொழிற்சாலை ஸ்கிராப்',
    desc_en: 'We segregate at our godown',
    desc_ta: 'எங்கள் கிடங்கில் தனித்தனியாக பிரிப்போம்',
  },
  {
    icon: '🏭',
    en:   'Machinery & Reusables',
    ta:   'இயந்திரங்கள் & மறு-பயன்பாடு',
    desc_en: 'Old machines, motors, panels, structural steel',
    desc_ta: 'பழைய machines, motor, panels, structural steel',
  },
];

const WHATSAPP_NUMBER = SUPPORT_WHATSAPP;

export default function BulkProductsScreen({ navigation }) {
  const { language } = useApp();
  const isTa = language === 'ta';

  const openWhatsApp = () => {
    const msg = encodeURIComponent(
      "Hi Scrap Trove, we have industrial scrap to sell. Please share today's rates.",
    );
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`)
      .catch(() => Alert.alert('WhatsApp not installed'));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          🏭 {isTa ? 'நாங்கள் என்ன வாங்குகிறோம்' : 'What We Buy'}
        </Text>
        <Text style={styles.headerSub}>
          {isTa
            ? 'உங்கள் தொழிற்சாலையிலிருந்து சேகரிக்கும் ஸ்கிராப் வகைகள்'
            : 'Industrial scrap categories we accept for bulk pickup'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Rates banner — bulk rates aren't shown in-app; per-lift on WhatsApp */}
        <View style={styles.ratesBanner}>
          <Text style={styles.ratesBannerTitle}>
            {isTa ? '💬 விலைகள் WhatsApp-இல் மட்டுமே' : '💬 Rates confirmed on WhatsApp'}
          </Text>
          <Text style={styles.ratesBannerBody}>
            {isTa
              ? 'விலைகள் தினமும் மாறும். உங்கள் ஸ்கிராப் வகை மற்றும் அளவின் அடிப்படையில் நாங்கள் உங்களுக்கு தினசரி விலை பட்டியல் அனுப்புவோம்.'
              : 'Rates move daily by grade. We share the current rate per material on WhatsApp before every lift.'}
          </Text>
          <TouchableOpacity style={styles.ratesBtn} onPress={openWhatsApp} activeOpacity={0.85}>
            <Text style={styles.ratesBtnText}>
              {isTa ? '💬 இன்றைய விலைகள் கேளுங்கள்' : "💬 Ask today's rates"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Categories grid */}
        <Text style={styles.sectionLabel}>
          {isTa ? 'வகைகள்' : 'CATEGORIES'}
        </Text>
        <View style={styles.grid}>
          {CATEGORIES.map(cat => (
            <View key={cat.en} style={styles.card}>
              <View style={styles.cardIconWrap}>
                <Text style={styles.cardIcon}>{cat.icon}</Text>
              </View>
              <Text style={styles.cardTitle}>{isTa ? cat.ta : cat.en}</Text>
              <Text style={styles.cardDesc} numberOfLines={3}>
                {isTa ? cat.desc_ta : cat.desc_en}
              </Text>
            </View>
          ))}
        </View>

        {/* Post CTA */}
        <TouchableOpacity
          style={styles.postCta}
          onPress={() => navigation.navigate('BulkPostFlow')}
          activeOpacity={0.9}
        >
          <Text style={styles.postCtaTitle}>
            📋 {isTa ? 'ஸ்கிராப் பிக்-அப் கோரிக்கை பதிவிடு' : 'Request a Bulk Pickup'}
          </Text>
          <Text style={styles.postCtaSub}>
            {isTa
              ? 'உங்கள் தொழிற்சாலைக்கு நேரடியாக வந்து சேகரிப்போம்'
              : 'We come directly to your factory or site'}
          </Text>
        </TouchableOpacity>

        {/* Note */}
        <Text style={styles.footNote}>
          {isTa
            ? 'குறைந்தபட்ச பிக்-அப் — 500 கிலோ. அதற்கு குறைவாக இருந்தால், சிறிய விற்பனையாளர் பதிவு பயன்படுத்தவும்.'
            : 'Minimum bulk pickup — 500 kg. For smaller loads, register as a Small Seller instead.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.card, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontFamily: FONTS.black, fontSize: 22, color: C.text, marginBottom: 4 },
  headerSub:   { fontFamily: FONTS.regular, fontSize: 13, color: C.sub, lineHeight: 18 },

  body: { padding: 16, paddingBottom: 100 },

  ratesBanner: {
    backgroundColor: C.blue50, borderColor: '#BFDBFE', borderWidth: 1,
    borderRadius: 16, padding: 14, marginBottom: 20,
  },
  ratesBannerTitle: { fontFamily: FONTS.bold, fontSize: 14, color: C.blue600, marginBottom: 6 },
  ratesBannerBody:  { fontFamily: FONTS.regular, fontSize: 13, color: '#1E3A8A', lineHeight: 18, marginBottom: 12 },
  ratesBtn: {
    backgroundColor: C.wa, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center',
  },
  ratesBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: '#FFFFFF' },

  sectionLabel: {
    fontFamily: FONTS.bold, fontSize: 11, color: C.sub,
    letterSpacing: 0.8, marginBottom: 10,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20,
  },
  card: {
    flexGrow: 1, flexBasis: '45%', minWidth: '45%',
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    padding: 14,
  },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.greenBg, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  cardIcon:  { fontSize: 22 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 13, color: C.text, marginBottom: 4 },
  cardDesc:  { fontFamily: FONTS.regular, fontSize: 11, color: C.sub, lineHeight: 15 },

  postCta: {
    backgroundColor: C.green, borderRadius: 16, padding: 18,
    marginBottom: 14,
    shadowColor: C.green, shadowOpacity: 0.25, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  postCtaTitle: { fontFamily: FONTS.black, fontSize: 15, color: '#FFFFFF', marginBottom: 4 },
  postCtaSub:   { fontFamily: FONTS.regular, fontSize: 12, color: '#DCFCE7' },

  footNote: {
    marginTop: 6, fontFamily: FONTS.regular, fontSize: 11,
    color: C.sub, textAlign: 'center', lineHeight: 15,
  },
});
