import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useApp } from '../../context/AppContext';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';

const TAGLINES = [
  { en: '🚀 Our team arrives within 3 hours',           ta: '🚀 3 மணி நேரத்தில் நாங்கள் வருவோம்' },
  { en: '📅 Book a scheduled pickup whenever you want', ta: '📅 நீங்கள் விரும்பும் நேரத்தில் பிக்கப் பதிவு செய்யுங்கள்' },
];

export default function WelcomeScreen({ navigation }) {
  const { language, toggleLanguage } = useApp();
  const fadeAnim       = useRef(new Animated.Value(0)).current;
  const slideAnim      = useRef(new Animated.Value(30)).current;
  const pillAnim       = useRef(new Animated.Value(0)).current;
  const btnAnim        = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(1)).current;
  const [taglineIndex, setTaglineIndex] = useState(0);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.timing(pillAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(btnAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const cycle = setInterval(() => {
      Animated.timing(taglineOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setTaglineIndex(i => (i + 1) % TAGLINES.length);
        Animated.timing(taglineOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 3000);
    return () => clearInterval(cycle);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* White status bar icons — green background needs light icons */}
      <StatusBar style="light" />
      {/* Language toggle — top-right */}
      <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
        <Text style={styles.langText}>{language === 'ta' ? 'EN' : 'தமிழ்'}</Text>
      </TouchableOpacity>

      {/* ── All center content in one block ── */}
      <Animated.View style={[styles.center, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Logo circle */}
        <View style={styles.logoCircle}>
          <Image
            source={require('../../../assets/scrapx-symbol-tight.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Wordmark */}
        <Text style={styles.logoText}>
          Scrap<Text style={styles.logoX}>X</Text>
        </Text>

        {/* Tagline badge */}
        <View style={styles.eyebrow}>
          <Text style={styles.eyebrowText}>
            {language === 'ta' ? 'ஸ்கிராப் பிக்கப் மார்க்கெட்' : 'The Scrap Pickup Marketplace'}
          </Text>
        </View>

        {/* Animated cycling tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          {TAGLINES[taglineIndex][language === 'ta' ? 'ta' : 'en']}
        </Animated.Text>

        {/* Feature pills */}
        <Animated.View style={[styles.pills, { opacity: pillAnim }]}>
          {[
            '🏠 ' + (language === 'ta' ? 'வீட்டிலிருந்தே' : 'From Home'),
            '⚡ ' + (language === 'ta' ? '30-60 நிமிடம்' : '30-60 Min'),
            '💰 ' + (language === 'ta' ? 'நேர்மையான விலை' : 'Fair Price'),
          ].map((pill, i) => (
            <View key={i} style={styles.pill}>
              <Text style={styles.pillText}>{pill}</Text>
            </View>
          ))}
        </Animated.View>
      </Animated.View>

      {/* ── CTA at bottom ── */}
      <Animated.View style={[styles.cta, { opacity: btnAnim }]}>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => navigation.navigate('UserType')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>
            {language === 'ta' ? 'தொடங்குங்கள்' : 'Get Started'} →
          </Text>
        </TouchableOpacity>
        <Text style={styles.freeNote}>
          {language === 'ta' ? '✅ விற்பனையாளர்களுக்கு எப்போதும் இலவசம்' : '✅ Always free for sellers'}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
  },

  langBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  langText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },

  // Everything in one vertically-centered block
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
  },
  logoCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  logoImage: { width: 64, height: 64 },
  logoText: {
    fontFamily: FONTS.black, fontSize: 44, color: '#fff',
    letterSpacing: -1, marginBottom: 8,
  },
  logoX: { color: '#4ADE80' },
  eyebrow: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 22,
  },
  eyebrowText: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#fff', letterSpacing: 0.4 },
  tagline: {
    fontFamily: FONTS.semiBold,
    fontSize: 19, color: '#fff', textAlign: 'center',
    lineHeight: 28, marginBottom: 20,
    paddingHorizontal: 8,
  },
  pills: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
  },
  pillText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 13 },

  // CTA pinned at bottom
  cta: { paddingBottom: 8 },
  ctaBtn: {
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 4,
  },
  ctaBtnText: { color: COLORS.primary, fontFamily: FONTS.black, fontSize: 18 },
  freeNote: { textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontFamily: FONTS.medium, fontSize: 14 },
});
