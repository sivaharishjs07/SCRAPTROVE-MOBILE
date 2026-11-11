import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';
import { APP_VERSION, APP_VERSION_FULL } from '../../constants/appVersion';
import { COLORS } from '../../constants/colors';
import { API_BASE } from '../../services/api';

const C = {
  bg:      '#FFFFFF',
  page:    '#F9FAFB',
  green:   '#16A34A',
  mint:    '#F0FDF4',
  mintBdr: '#DCFCE7',
  text:    '#0A1628',
  sub:     '#6B7280',
  light:   '#9CA3AF',
  bdr:     '#E5E7EB',
};

export default function AboutScreen({ navigation }) {
  const { language } = useApp();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'ta' ? 'எங்களை பற்றி' : 'About Us'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>{'♻️'}</Text>
          </View>
          <Text style={styles.appName}>Scrap Trove</Text>
          <Text style={styles.tagline}>
            {language === 'ta'
              ? 'உங்கள் நம்பகமான ரத்துப் பொருட்கள் சேவை'
              : 'Your trusted scrap pickup service'}
          </Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>{APP_VERSION}</Text>
          </View>
        </View>

        <View style={styles.cards}>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>{'🌱'}</Text>
            <View style={styles.infoBody}>
              <Text style={styles.infoTitle}>
                {language === 'ta' ? 'எங்கள் நோக்கம்' : 'Our Mission'}
              </Text>
              <Text style={styles.infoText}>
                {language === 'ta'
                  ? 'சென்னையில் ரத்துப் பொருட்களை மறுசுழற்சி செய்வதை எளிமையாகவும் வேகமாகவும் மாற்றுவது எங்கள் குறிக்கோள்.'
                  : 'To make scrap recycling easy, fast and accessible across Chennai — bringing our own trained pickup team to your door at the click of a button.'}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>{'📍'}</Text>
            <View style={styles.infoBody}>
              <Text style={styles.infoTitle}>
                {language === 'ta' ? 'தலைமையகம்' : 'Headquartered'}
              </Text>
              <Text style={styles.infoText}>
                {language === 'ta'
                  ? 'சென்னை, தமிழ்நாடு, இந்தியா'
                  : 'Chennai, Tamil Nadu, India'}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>{'💚'}</Text>
            <View style={styles.infoBody}>
              <Text style={styles.infoTitle}>
                {language === 'ta' ? 'சுற்றுச்சூழல் தாக்கம்' : 'Environmental Impact'}
              </Text>
              <Text style={styles.infoText}>
                {language === 'ta'
                  ? 'ஒவ்வொரு ரத்துப் பொருள் சேகரிப்பும் நம் சூழலை சுத்தமாக வைக்க உதவுகிறது.'
                  : 'Every pickup keeps our city cleaner. Together we reduce landfill waste one pickup at a time.'}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>{'📱'}</Text>
            <View style={styles.infoBody}>
              <Text style={styles.infoTitle}>
                {language === 'ta' ? 'பயன்பாட்டு பதிப்பு' : 'App Version'}
              </Text>
              <Text style={styles.infoText}>{APP_VERSION_FULL}</Text>
            </View>
          </View>

          {/* Which server this build talks to. Staging and production APKs
              look identical otherwise, and a build with no server address
              fails in a way that looks like a bad connection — this makes
              both cases visible without guesswork. */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>{'🌐'}</Text>
            <View style={styles.infoBody}>
              <Text style={styles.infoTitle}>
                {language === 'ta' ? 'சர்வர்' : 'Server'}
              </Text>
              <Text style={styles.infoText}>
                {API_BASE
                  ? API_BASE.replace(/^https?:\/\//, '')
                  : (language === 'ta' ? 'அமைக்கப்படவில்லை' : 'Not configured')}
              </Text>
            </View>
          </View>

        </View>

        <Text style={styles.copyright}>
          {'© 2026 Scrap Trove. '}
          {language === 'ta' ? 'அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.' : 'All rights reserved.'}
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.page },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.bg,
    borderBottomWidth: 1, borderBottomColor: C.bdr,
  },
  backBtn:     { width: 36, height: 36, justifyContent: 'center' },
  backArrow:   { fontFamily: FONTS.semiBold, fontSize: 22, color: C.text },
  headerTitle: { fontFamily: FONTS.black, fontSize: 18, color: C.text },

  scroll: { paddingBottom: 40 },

  logoSection: {
    alignItems: 'center', paddingVertical: 40,
    backgroundColor: C.bg,
    borderBottomWidth: 1, borderBottomColor: C.bdr, marginBottom: 20,
  },
  logoCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.mint, borderWidth: 2, borderColor: C.mintBdr,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  logoEmoji:    { fontSize: 48 },
  appName:      { fontFamily: FONTS.black, fontSize: 32, color: C.green, marginBottom: 8 },
  tagline:      { fontFamily: FONTS.medium, fontSize: 14, color: C.sub, textAlign: 'center', paddingHorizontal: 32, marginBottom: 16 },
  versionBadge: {
    backgroundColor: C.mint, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6,
    borderWidth: 1, borderColor: C.mintBdr,
  },
  versionText: { fontFamily: FONTS.bold, fontSize: 13, color: C.green },

  cards: { paddingHorizontal: 16, gap: 10 },

  infoCard: {
    backgroundColor: C.bg, borderRadius: 16,
    borderWidth: 1, borderColor: C.bdr,
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16, gap: 14,
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoIcon:  { fontSize: 22, marginTop: 2 },
  infoBody:  { flex: 1 },
  infoTitle: { fontFamily: FONTS.bold, fontSize: 15, color: C.text, marginBottom: 4 },
  infoText:  { fontFamily: FONTS.regular, fontSize: 13, color: C.sub, lineHeight: 19 },

  copyright: {
    fontFamily: FONTS.regular, fontSize: 12, color: C.light,
    textAlign: 'center', marginTop: 28, paddingHorizontal: 24,
  },
});
