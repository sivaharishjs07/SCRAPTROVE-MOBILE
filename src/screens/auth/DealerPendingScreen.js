import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';

// ─── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:      '#FFFFFF',
  green:   '#22C55E',
  greenMid:'#16A34A',
  mint:    '#F0FDF4',
  mintBdr: '#DCFCE7',
  text:    '#0A1628',
  sub:     '#6B7280',
  light:   '#9CA3AF',
  bdr:     '#E5E7EB',
  amber:   '#F59E0B',
  amberBg: '#FFFBEB',
  amberBdr:'#FDE68A',
  blue:    '#3B82F6',
  blueBg:  '#EFF6FF',
  blueBdr: '#BFDBFE',
};

export default function DealerPendingScreen({ navigation }) {
  const { language, logout } = useApp();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const steps = [
    {
      icon: '📋',
      title: language === 'ta' ? 'விண்ணப்பம் பெறப்பட்டது'      : 'Application Received',
      desc:  language === 'ta' ? 'உங்கள் தகவல்கள் சேமிக்கப்பட்டன' : 'Your details have been saved',
      done:  true,
    },
    {
      icon: '🔍',
      title: language === 'ta' ? 'ஆய்வு செய்கிறோம்'            : 'Under Review',
      desc:  language === 'ta' ? '24–48 மணி நேரத்தில் முடியும்'  : 'Completed within 24–48 hours',
      done:  false,
    },
    {
      icon: '✅',
      title: language === 'ta' ? 'SMS மூலம் அறிவிப்பு'         : 'SMS Notification',
      desc:  language === 'ta' ? 'அனுமதிக்கப்படும்போது SMS வரும்' : "You'll receive an SMS when approved",
      done:  false,
    },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>

      {/* ── Animated hero ── */}
      <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.successRing}>
          <View style={styles.successCircle}>
            <Text style={styles.successEmoji}>⏳</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>
          {language === 'ta' ? 'விண்ணப்பம் சமர்ப்பிக்கப்பட்டது!' : 'Application Submitted!'}
        </Text>
        <Text style={styles.heroSub}>
          {language === 'ta'
            ? 'நாங்கள் உங்கள் கணக்கை விரைவில் ஆய்வு செய்வோம்'
            : 'Our team will review your account shortly'}
        </Text>
      </Animated.View>

      {/* ── Steps timeline ── */}
      <Animated.View style={[styles.steps, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepLeft}>
              <View style={[styles.stepDot, step.done && styles.stepDotDone]}>
                <Text style={styles.stepDotIcon}>{step.done ? '✓' : (i + 1).toString()}</Text>
              </View>
              {i < steps.length - 1 && <View style={[styles.stepLine, step.done && styles.stepLineDone]} />}
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepIcon}>{step.icon}</Text>
              <View>
                <Text style={[styles.stepTitle, step.done && styles.stepTitleDone]}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          </View>
        ))}
      </Animated.View>

      {/* ── Actions ── */}
      <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
        {/* WhatsApp support */}
        <TouchableOpacity
          style={styles.whatsappBtn}
          onPress={() => Linking.openURL('https://wa.me/919999999999?text=Hi%2C%20I%20applied%20as%20a%20dealer%20on%20Scrap%20Trove')}
          activeOpacity={0.85}
        >
          <Text style={styles.whatsappBtnText}>
            {'💬'} {language === 'ta' ? 'WhatsApp-ல் தொடர்பு கொள்ளுங்கள்' : 'Contact Us on WhatsApp'}
          </Text>
        </TouchableOpacity>

        {/* Log out */}
        <TouchableOpacity style={styles.logoutLink} onPress={logout}>
          <Text style={styles.logoutLinkText}>
            {language === 'ta' ? 'வேறு கணக்கில் உள்நுழைய' : 'Sign in with a different account'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 24 },

  // Hero
  hero: { alignItems: 'center', paddingTop: 32, paddingBottom: 24 },
  successRing: {
    width: 116, height: 116, borderRadius: 58,
    backgroundColor: C.amberBg, borderWidth: 2, borderColor: C.amberBdr,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  successCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: C.amberBg, borderWidth: 3, borderColor: C.amber,
    alignItems: 'center', justifyContent: 'center',
  },
  successEmoji: { fontSize: 40 },
  heroTitle: { fontFamily: FONTS.black, fontSize: 24, color: C.text, textAlign: 'center', marginBottom: 8 },
  heroSub:   { fontFamily: FONTS.regular, fontSize: 15, color: C.sub, textAlign: 'center', lineHeight: 22 },

  // Steps timeline
  steps: { flex: 1, paddingTop: 4 },
  stepRow: { flexDirection: 'row', marginBottom: 4 },
  stepLeft: { alignItems: 'center', marginRight: 16, width: 28 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: C.bdr,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: C.greenMid, borderColor: C.greenMid },
  stepDotIcon: { fontFamily: FONTS.black, fontSize: 12, color: C.sub },
  stepLine: { width: 2, flex: 1, backgroundColor: C.bdr, marginVertical: 4 },
  stepLineDone: { backgroundColor: C.mintBdr },
  stepBody: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingBottom: 20 },
  stepIcon:  { fontSize: 22 },
  stepTitle: { fontFamily: FONTS.semiBold, fontSize: 15, color: C.light, marginBottom: 2 },
  stepTitleDone: { color: C.greenMid },
  stepDesc:  { fontFamily: FONTS.regular, fontSize: 13, color: C.sub, lineHeight: 18 },

  // Actions
  actions: { paddingBottom: 16 },
  whatsappBtn: {
    backgroundColor: '#25D366', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginBottom: 20,
    shadowColor: '#25D366', shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  whatsappBtnText: { fontFamily: FONTS.extraBold, fontSize: 16, color: '#fff' },

  logoutLink: { alignItems: 'center' },
  logoutLinkText: { fontFamily: FONTS.medium, fontSize: 13, color: C.light },
});
