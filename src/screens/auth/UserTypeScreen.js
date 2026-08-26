import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:       '#FFFFFF',
  green:    '#22C55E',
  greenMid: '#16A34A',
  mint:     '#F0FDF4',
  mintBdr:  '#DCFCE7',
  blue50:   '#EFF6FF',
  blue100:  '#BFDBFE',
  blue600:  '#2563EB',
  blue700:  '#1D4ED8',
  text:     '#0A1628',
  sub:      '#6B7280',
  bdr:      '#E5E7EB',
};

// Dealer onboarding has been temporarily removed from the mobile app —
// no new dealers being onboarded pre-launch. The dealer screens remain
// in the repo (src/screens/dealer/*) and can be re-enabled by adding the
// dealer branch back to the navigator and a third card here.

export default function UserTypeScreen({ navigation }) {
  const { language } = useApp();
  const [selected, setSelected] = useState(null);

  const handleSelect = (sellerType) => {
    setSelected(sellerType);
    // All seller flows share role='seller' at the API layer; the
    // small vs bulk distinction is carried by sellerType.
    navigation.navigate('Phone', { role: 'seller', sellerType });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← {language === 'ta' ? 'திரும்பு' : 'Back'}</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.wave}>👋</Text>
        <Text style={styles.title}>
          {language === 'ta' ? 'நீங்கள் யார்?' : 'Who are you?'}
        </Text>
        <Text style={styles.subtitle}>
          {language === 'ta'
            ? 'உங்கள் பாத்திரத்தை தேர்ந்தெடுங்கள்'
            : 'Choose the option that fits you'}
        </Text>

        {/* Small seller — home / individual */}
        <TouchableOpacity
          style={[styles.roleCard, selected === 'small' && styles.smallCardSelected]}
          onPress={() => handleSelect('small')}
          activeOpacity={0.85}
        >
          <View style={[styles.iconWrap, { backgroundColor: C.mint, borderColor: C.mintBdr }]}>
            <Text style={styles.icon}>🏠</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.roleTitle}>
              {language === 'ta' ? 'சிறிய விற்பனையாளர்' : 'Small Seller'}
            </Text>
            <Text style={styles.roleDesc}>
              {language === 'ta'
                ? 'வீட்டிலிருந்து ஸ்கிராப் விற்கவும். டீலர்கள் வருவார்கள்.'
                : 'Sell scrap from your home. Our dealer comes to you.'}
            </Text>
            <View style={[styles.pill, { backgroundColor: C.mint, borderColor: C.mintBdr }]}>
              <Text style={[styles.pillText, { color: C.greenMid }]}>
                {language === 'ta' ? '✅ இலவச பிக்கப்' : '✅ Free pickup'}
              </Text>
            </View>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* Bulk seller — factory / business */}
        <TouchableOpacity
          style={[styles.roleCard, selected === 'bulk' && styles.bulkCardSelected]}
          onPress={() => handleSelect('bulk')}
          activeOpacity={0.85}
        >
          <View style={[styles.iconWrap, { backgroundColor: C.blue50, borderColor: C.blue100 }]}>
            <Text style={styles.icon}>🏭</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.roleTitle}>
              {language === 'ta' ? 'பெரிய விற்பனையாளர்' : 'Bulk Seller'}
            </Text>
            <Text style={styles.roleDesc}>
              {language === 'ta'
                ? 'தொழிற்சாலை / அலுவலகம் / கடையிலிருந்து பெரிய அளவில் ஸ்கிராப் விற்கவும்.'
                : 'Sell scrap from your factory, office, or shop in bulk quantities.'}
            </Text>
            <View style={[styles.pill, { backgroundColor: C.blue50, borderColor: C.blue100 }]}>
              <Text style={[styles.pillText, { color: C.blue700 }]}>
                {language === 'ta' ? '✅ சிறப்பு விலை' : '✅ Best rates for volume'}
              </Text>
            </View>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          {language === 'ta'
            ? 'தொடர்ந்து மொபைல் எண் உள்ளிடவும்'
            : "You'll enter your mobile number next"}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: C.bg },
  backBtn:  { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 },
  backText: { color: C.greenMid, fontFamily: FONTS.semiBold, fontSize: 16 },
  content:  { flex: 1, paddingHorizontal: 24, paddingTop: 16, alignItems: 'center' },

  wave:     { fontSize: 52, marginBottom: 12 },
  title:    { fontFamily: FONTS.black, fontSize: 28, color: C.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontFamily: FONTS.regular, fontSize: 15, color: C.sub, textAlign: 'center', marginBottom: 32, lineHeight: 22 },

  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', borderRadius: 20, padding: 18,
    marginBottom: 16, borderWidth: 2, borderColor: C.bdr,
    backgroundColor: '#FAFAFA',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  smallCardSelected: { borderColor: C.greenMid, backgroundColor: C.mint },
  bulkCardSelected:  { borderColor: C.blue600,  backgroundColor: C.blue50 },

  iconWrap: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginRight: 14,
  },
  icon:      { fontSize: 26 },
  body:      { flex: 1 },
  roleTitle: { fontFamily: FONTS.extraBold, fontSize: 17, color: C.text, marginBottom: 4 },
  roleDesc:  { fontFamily: FONTS.regular, fontSize: 13, color: C.sub, lineHeight: 18, marginBottom: 8 },

  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1,
  },
  pillText: { fontFamily: FONTS.bold, fontSize: 11 },
  arrow:    { fontFamily: FONTS.bold, fontSize: 22, color: C.sub, marginLeft: 8 },

  note: {
    marginTop: 16, fontFamily: FONTS.regular, fontSize: 13,
    color: C.sub, textAlign: 'center',
  },
});
