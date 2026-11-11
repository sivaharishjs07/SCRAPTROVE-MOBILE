import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';

const C = {
  bg: '#FFFFFF', text: '#0A1628', sub: '#6B7280', light: '#9CA3AF',
  bdr: '#E5E7EB', green: '#16A34A', greenLt: '#F0FDF4', greenBdr: '#DCFCE7',
};

// Seller FAQs mirror the seller website's SMALL_FAQS / BULK_FAQS wording
// (DashboardPage.jsx) so an answer is never right on one surface and wrong
// on the other. If a policy changes, change it in both places.
const FAQ_SMALL = [
  {
    q: { en: 'How do I book a pickup?', ta: 'பிக்கப் எப்படி பதிவு செய்வது?' },
    a: { en: 'Tap the recycle button on the tab bar, then choose your items, pick the weight range, choose instant or scheduled, add photos if you want, select a saved address and confirm. Minimum 30 kg per pickup.',
         ta: 'தாவ் பாரில் உள்ள பட்டனை அழுத்தி, பொருட்கள், எடை அளவு, உடனடி அல்லது திட்டமிட்ட நேரம், விருப்பப்பட்டால் புகைப்படம், முகவரி தேர்ந்தெடுத்து உறுதிப்படுத்தவும். குறைந்தது 30 கிலோ.' },
  },
  {
    q: { en: 'Is the pickup really free?', ta: 'பிக்கப் உண்மையில் இலவசமா?' },
    a: { en: 'Yes. Every pickup is free at every weight — no pickup fee, no fuel charge, nothing deducted from what you are paid.',
         ta: 'ஆம். எல்லா எடைக்கும் பிக்கப் இலவசம் — கட்டணம் இல்லை, எரிபொருள் கட்டணம் இல்லை, உங்கள் பணத்தில் எதுவும் பிடிக்கப்படாது.' },
  },
  {
    q: { en: 'How long does pickup take?', ta: 'பிக்கப் எவ்வளவு நேரம் ஆகும்?' },
    a: { en: 'Instant pickups reach you within 3 hours during working hours. Scheduled pickups happen in the slot you chose — 9 AM to 2 PM or 2 PM to 8 PM.',
         ta: 'உடனடி பிக்கப் வேலை நேரத்தில் 3 மணி நேரத்தில் வரும். திட்டமிட்டது நீங்கள் தேர்ந்தெடுத்த நேரத்தில் — காலை 9 முதல் மதியம் 2 அல்லது மதியம் 2 முதல் இரவு 8.' },
  },
  {
    q: { en: 'How is the price decided?', ta: 'விலை எப்படி நிர்ணயிக்கப்படுகிறது?' },
    a: { en: 'Prices follow the live market rates Scrap Trove publishes for your area — you can see indicative rates on the Rates screen before booking. The final amount is confirmed after your scrap is weighed at your door.',
         ta: 'உங்கள் பகுதிக்கு Scrap Trove வெளியிடும் நேரடி சந்தை விலைப்படி — பதிவு செய்வதற்கு முன் Rates திரையில் பார்க்கலாம். உங்கள் வீட்டில் எடை போட்ட பிறகு இறுதி தொகை உறுதிப்படும்.' },
  },
  {
    q: { en: 'Can I cancel a pickup after booking?', ta: 'பதிவு செய்த பிறகு ரத்து செய்யலாமா?' },
    a: { en: 'Yes — open the order from the Pickups tab and tap Cancel. You can cancel any time before our pickup team is assigned. After that, email support@scraptrove.com and we will help.',
         ta: 'ஆம் — Pickups தாவலில் ஆர்டரை திறந்து Cancel அழுத்தவும். எங்கள் குழு ஒதுக்கப்படுவதற்கு முன் எப்போதும் ரத்து செய்யலாம். அதன் பிறகு support@scraptrove.com-க்கு எழுதுங்கள்.' },
  },
  {
    q: { en: 'How do I get paid?', ta: 'பணம் எப்படி பெறுவேன்?' },
    a: { en: 'Cash on the spot after weighing, or UPI if you prefer. Confirm the amount with our team before they leave.',
         ta: 'எடை போட்ட உடன் ரொக்கம், அல்லது நீங்கள் விரும்பினால் UPI. எங்கள் குழு கிளம்பும் முன் தொகையை உறுதிப்படுத்திக் கொள்ளுங்கள்.' },
  },
  {
    q: { en: 'How do I manage my pickup addresses?', ta: 'முகவரிகளை எப்படி நிர்வகிப்பது?' },
    a: { en: 'You can keep up to 5 saved addresses and add or remove them while booking a pickup. At least one address is always required.',
         ta: 'அதிகபடசம் 5 முகவரிகள் சேமிக்கலாம், பிக்கப் பதிவு செய்யும் போது சேர்க்கவோ நீக்கவோ முடியும். குறைந்தது ஒரு முகவரி எப்போதும் தேவை.' },
  },
  {
    q: { en: 'How do I update my email?', ta: 'மின்னஞ்சலை எப்படி மாற்றுவது?' },
    a: { en: 'Go to My Details and tap Edit on the Email row.',
         ta: 'My Details-க்கு சென்று Email வரிசையில் Edit அழுத்தவும்.' },
  },
  {
    q: { en: 'I have a different problem — how do I get help?', ta: 'வேறு பிரச்சினை — உதவி எப்படி?' },
    a: { en: 'Open a support ticket below. Pick the right category and our team will respond within 24 hours.',
         ta: 'கீழே ஆதரவு டிக்கெட் திறக்கவும். சரியான வகையை தேர்ந்தெடுத்தால் 24 மணி நேரத்தில் எங்கள் குழு பதிலளிக்கும்.' },
  },
];

const FAQ_BULK = [
  {
    q: { en: 'How do I schedule a bulk pickup?', ta: 'மொத்த பிக்கப் எப்படி திட்டமிடுவது?' },
    a: { en: 'Tap the recycle button on the tab bar, then select materials, weight, date and time slot, upload photos and submit. Our team will review and contact you.',
         ta: 'தாவ் பாரில் உள்ள பட்டனை அழுத்தி, பொருட்கள், எடை, தேதி மற்றும் நேரம் தேர்ந்தெடுத்து, புகைப்படங்கள் பதிவேற்றி சமர்ப்பிக்கவும். எங்கள் குழு பரிசீலித்து தொடர்பு கொள்வார்கள்.' },
  },
  {
    q: { en: 'How long does pickup take?', ta: 'பிக்கப் எவ்வளவு நேரம் ஆகும்?' },
    a: { en: 'Scheduled bulk pickups happen in the slot you chose — 9 AM to 12 PM, 12 PM to 3 PM or 3 PM to 6 PM. Minimum 24 hours advance notice required.',
         ta: 'திட்டமிட்ட மொத்த பிக்கப் நீங்கள் தேர்ந்தெடுத்த நேரத்தில் — காலை 9 – 12, மதியம் 12 – 3 அல்லது மதியம் 3 – 6. குறைந்தது 24 மணி நேரம் முன்னதாக தெரிவிக்க வேண்டும்.' },
  },
  {
    q: { en: 'What is the minimum quantity for bulk pickup?', ta: 'மொத்த பிக்கப்பிற்கு குறைந்த அளவு என்ன?' },
    a: { en: 'Minimum 500 kg per pickup. Weight options go from 500 kg up to 10+ tons.',
         ta: 'ஒரு பிக்கப்பிற்கு குறைந்தது 500 கிலோ. எடை விருப்பங்கள் 500 கிலோ முதல் 10+ டன் வரை.' },
  },
  {
    q: { en: 'How is the price decided?', ta: 'விலை எப்படி நிர்ணயிக்கப்படுகிறது?' },
    a: { en: 'For bulk orders, our Scrap Trove team reviews your materials and quantity and contacts you with a custom price.',
         ta: 'மொத்த ஆர்டர்களுக்கு, எங்கள் Scrap Trove குழு உங்கள் பொருட்கள் மற்றும் அளவை பரிசீலித்து தனி விலையுடன் தொடர்பு கொள்வார்கள்.' },
  },
  {
    q: { en: 'Can I cancel a bulk pickup after booking?', ta: 'மொத்த பிக்கப்பை ரத்து செய்யலாமா?' },
    a: { en: 'Yes — open the order from the Pickups tab and tap Cancel. You can cancel any time before our pickup team is assigned. After that, email support@scraptrove.com and we will help.',
         ta: 'ஆம் — Pickups தாவலில் ஆர்டரை திறந்து Cancel அழுத்தவும். எங்கள் குழு ஒதுக்கப்படுவதற்கு முன் எப்போதும் ரத்து செய்யலாம். அதன் பிறகு support@scraptrove.com-க்கு எழுதுங்கள்.' },
  },
  {
    q: { en: 'How do I get paid?', ta: 'பணம் எப்படி பெறுவேன்?' },
    a: { en: 'Bulk pickups are usually paid by UPI or bank transfer. Confirm the payment method with our team at the time of pickup.',
         ta: 'மொத்த பிக்கப்பிற்கு பொதுவாக UPI அல்லது வங்கி பரிமாற்றம் மூலம் பணம். பிக்கப் நேரத்தில் எங்கள் குழுவுடன் உறுதிப்படுத்திக் கொள்ளுங்கள்.' },
  },
  {
    q: { en: 'How do I change my company address?', ta: 'நிறுவன முகவரியை எப்படி மாற்றுவது?' },
    a: { en: 'Go to My Details and tap Edit on the Address row. You can update door, street, locality, city, district, state and pincode along with GPS location.',
         ta: 'My Details-க்கு சென்று Address வரிசையில் Edit அழுத்தவும். கதவு எண், தெரு, பகுதி, நகரம், மாவட்டம், மாநிலம், பின்கோடு மற்றும் GPS இடத்தை மாற்றலாம்.' },
  },
  {
    q: { en: 'How do I update my business email?', ta: 'வணிக மின்னஞ்சலை எப்படி மாற்றுவது?' },
    a: { en: 'Go to My Details and tap Edit on the Email row.',
         ta: 'My Details-க்கு சென்று Email வரிசையில் Edit அழுத்தவும்.' },
  },
  {
    q: { en: 'I have a different problem — how do I get help?', ta: 'வேறு பிரச்சினை — உதவி எப்படி?' },
    a: { en: 'Open a support ticket below. Pick the right category and our team will respond within 24 hours.',
         ta: 'கீழே ஆதரவு டிக்கெட் திறக்கவும். சரியான வகையை தேர்ந்தெடுத்தால் 24 மணி நேரத்தில் எங்கள் குழு பதிலளிக்கும்.' },
  },
];

const FAQ_DEALER = [
  {
    q: { en: 'When do jobs go live?', ta: 'வேலைகள் எப்பொழுது தொடங்கும்?' },
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
         ta: 'நம்பகத்தன்மை மதிப்பு 10 புள்ளிகள் குறயும். திரும்ப திரும்ப தவிர்த்தால் கணக்கு நிறுத்தப்படும்.' },
  },
];

export default function FAQScreen({ navigation, route }) {
  const { language, user } = useApp();
  const role = route?.params?.role || 'seller';
  // Sellers see the set that matches their account type, exactly as the
  // website picks SMALL_FAQS vs BULK_FAQS from seller_type.
  const isBulk = user?.seller_type === 'bulk';
  const items = role === 'dealer' ? FAQ_DEALER : (isBulk ? FAQ_BULK : FAQ_SMALL);
  const [open, setOpen] = useState(null);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
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
