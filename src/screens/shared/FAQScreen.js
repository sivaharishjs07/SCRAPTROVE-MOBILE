import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';

const C = {
  bg: '#FFFFFF', text: '#0A1628', sub: '#6B7280', light: '#9CA3AF',
  bdr: '#E5E7EB', green: '#16A34A', greenLt: '#F0FDF4', greenBdr: '#DCFCE7',
};

const FAQ_SELLER = [
  {
    q: { en: 'Is Scrap Trove really free for sellers?',   ta: 'Scrap Trove விற்பனையாளர்களுக்கு இலவசமா?' },
    a: { en: 'Yes — 100% free forever. No hidden charges.',
         ta: 'ஆம் — எப்போதும் இலவசம். மறைக்கப்பட்ட கட்டணம் இல்லை.' },
  },
  {
    q: { en: 'How quickly will the dealer arrive?',  ta: 'டீலர் எவ்வளவு விரைவில் வருவார்?' },
    a: { en: 'Instant pickups: within 3 hours. Scheduled: at your chosen time.',
         ta: 'உடனடி: 3 மணி நேரத்தில். திட்டமிட்ட: நீங்கள் தேர்ந்தெடுத்த நேரத்தில்.' },
  },
  {
    q: { en: 'How do I get paid?',   ta: 'பணம் எப்படி பெறுவேன்?' },
    a: { en: 'Cash or UPI — paid on the spot after weighing.',
         ta: 'கேஷ் அல்லது UPI — நிறுத்திய உடனே பணம்.' },
  },
  {
    q: { en: 'What items can I sell?',   ta: 'என்ன பொருட்களை விற்கலாம்?' },
    a: { en: 'Metals, paper, plastic, e-waste, appliances, batteries and more.',
         ta: 'உலோகம், காகிதம், பிளாஸ்டிக், மின்கழிவு, கருவிகள், பேட்டரி மேலும்.' },
  },
  {
    q: { en: 'What if my scrap is not picked up on time?',   ta: 'நேரத்தில் எடுக்கா விட்டால்?' },
    a: { en: 'If a dealer doesn\'t arrive, cancel the order and place a new one. Our team will improve coverage.',
         ta: 'டீலர் வரவில்லையென்றால் ரத்து செய்து மீண்டும் கோரிக்கை போடுங்கள்.' },
  },
  {
    q: { en: 'Can I cancel my pickup request?',  ta: 'பிக்கப் கோரிக்கையை ரத்து செய்யலாமா?' },
    a: { en: 'Yes, you can cancel before a dealer is assigned. After assignment, cancellations may affect your account.',
         ta: 'ஆம், டீலர் ஒதுக்கப்படுவதற்கு முன் ரத்து செய்யலாம்.' },
  },
];

const FAQ_DEALER = [
  {
    q: { en: 'When do jobs go live?', ta: 'வேலைகள் எப்போது தொடங்கும்?' },
    a: { en: 'Jobs appear every morning when we launch in your area.',
         ta: 'உங்கள் பகுதியில் தொடங்கும் போது தினமும் காலை வேலைகள் தெரியும்.' },
  },
  {
    q: { en: 'How is my reliability score calculated?', ta: 'என் நம்பகத்தன்மை மதிப்பு எப்படி?' },
    a: { en: 'Orders completed, ratings received, and consistency — completing every accepted job is key.',
         ta: 'முடிந்த ஆர்டர்கள், மதிப்பீடுகள், தொடர்ச்சி — கீழே விளக்கம் காண்க.' },
  },
  {
    q: { en: 'How do I get paid for jobs?', ta: 'வேலைக்கு பணம் எப்படி?' },
    a: { en: 'Earnings settle to your UPI within 24 hours of completing each job.',
         ta: 'ஒவ்வொரு வேலை முடிந்த 24 மணி நேரத்தில் UPI-ல் பணம் வரும்.' },
  },
  {
    q: { en: 'What happens if I miss an accepted order?', ta: 'ஏற்ற ஆர்டரை தவிர்த்தால்?' },
    a: { en: 'Your reliability score drops by 10 points. Multiple misses may suspend your account.',
         ta: 'நம்பகத்தன்மை மதிப்பு 10 புள்ளிகள் குறையும். திரும்ப திரும்ப தவிர்த்தால் கணக்கு நிறுத்தப்படும்.' },
  },
];

export default function FAQScreen({ navigation, route }) {
  const { language } = useApp();
  const role = route?.params?.role || 'seller';
  const items = role === 'dealer' ? FAQ_DEALER : FAQ_SELLER;
  const [open, setOpen] = useState(null);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQ</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.subtitle}>
          {language === 'ta' ? 'அடிக்கடி கேட்கப்படும் கேள்விகள்' : 'Frequently Asked Questions'}
        </Text>

        <View style={styles.card}>
          {items.map((item, i) => (
            <View key={i} style={[styles.faqItem, i === items.length - 1 && { borderBottomWidth: 0 }]}>
              <TouchableOpacity
                style={styles.faqQ}
                onPress={() => setOpen(open === i ? null : i)}
                activeOpacity={0.7}
              >
                <View style={[styles.faqNum, open === i && { backgroundColor: C.green }]}>
                  <Text style={[styles.faqNumText, open === i && { color: '#fff' }]}>{i + 1}</Text>
                </View>
                <Text style={styles.faqQText}>
                  {item.q[language === 'ta' ? 'ta' : 'en']}
                </Text>
                <Text style={styles.faqChevron}>{open === i ? '∧' : '∨'}</Text>
              </TouchableOpacity>
              {open === i && (
                <View style={styles.faqAWrap}>
                  <Text style={styles.faqA}>{item.a[language === 'ta' ? 'ta' : 'en']}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.contact}>
          <Text style={styles.contactText}>
            {language === 'ta' ? 'இன்னும் கேள்வி இருக்கா?' : 'Still have questions?'}
          </Text>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => navigation.navigate('Support')}
          >
            <Text style={styles.contactBtnText}>
              🎫 {language === 'ta' ? 'ஆதரவு டிக்கெட் திற' : 'Open a Support Ticket'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.bdr,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backText: { fontFamily: FONTS.semiBold, fontSize: 22, color: C.text },
  headerTitle: { fontFamily: FONTS.black, fontSize: 18, color: C.text },

  scroll: { padding: 16 },
  subtitle: {
    fontFamily: FONTS.medium, fontSize: 14, color: C.sub,
    marginBottom: 16, textAlign: 'center',
  },

  card: { backgroundColor: C.bg, borderRadius: 16, borderWidth: 1, borderColor: C.bdr, overflow: 'hidden' },

  faqItem: { borderBottomWidth: 1, borderBottomColor: C.bdr },
  faqQ: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  faqNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: C.greenLt, borderWidth: 1, borderColor: C.greenBdr,
    alignItems: 'center', justifyContent: 'center',
  },
  faqNumText: { fontFamily: FONTS.bold, fontSize: 11, color: C.green },
  faqQText: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 14, color: C.text, lineHeight: 20 },
  faqChevron: { fontFamily: FONTS.bold, fontSize: 14, color: C.sub },
  faqAWrap: { backgroundColor: C.greenLt, paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4 },
  faqA: { fontFamily: FONTS.regular, fontSize: 14, color: C.sub, lineHeight: 22 },

  contact: { marginTop: 28, alignItems: 'center' },
  contactText: { fontFamily: FONTS.medium, fontSize: 14, color: C.sub, marginBottom: 14 },
  contactBtn: {
    backgroundColor: C.green, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 24,
  },
  contactBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#fff' },
});
