import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../constants/colors';

export default function LanguageScreen({ navigation }) {
  const { language, changeLanguage } = useApp();

  const select = async (lang) => {
    await changeLanguage(lang);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'ta' ? 'மொழி' : 'Language'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Options */}
      <View style={styles.list}>

        <TouchableOpacity
          style={[styles.option, language === 'en' && styles.optionActive]}
          onPress={() => select('en')}
          activeOpacity={0.75}
        >
          <Text style={styles.flag}>🇬🇧</Text>
          <Text style={[styles.optionText, language === 'en' && styles.optionTextActive]}>
            English
          </Text>
          {language === 'en' && (
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, language === 'ta' && styles.optionActive]}
          onPress={() => select('ta')}
          activeOpacity={0.75}
        >
          <Text style={styles.flag}>🇮🇳</Text>
          <Text style={[styles.optionText, language === 'ta' && styles.optionTextActive]}>
            தமிழ்
          </Text>
          {language === 'ta' && (
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
          )}
        </TouchableOpacity>

      </View>

      <Text style={styles.hint}>
        {language === 'ta'
          ? 'மொழி தேர்வு செய்த உடனே பயன்பாடு மாறும்.'
          : 'The app language changes immediately after selection.'}
      </Text>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn:     { width: 36, height: 36, justifyContent: 'center' },
  backArrow:   { fontFamily: FONTS.semiBold, fontSize: 22, color: COLORS.text },
  headerTitle: { fontFamily: FONTS.black, fontSize: 18, color: COLORS.text },

  list: { padding: 16, gap: 12 },

  option: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16, padding: 18, gap: 16,
    borderWidth: 1.5, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  optionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.successLight,
  },
  flag:       { fontSize: 28 },
  optionText: {
    flex: 1,
    fontFamily: FONTS.semiBold, fontSize: 17, color: COLORS.text,
  },
  optionTextActive: {
    fontFamily: FONTS.bold, color: COLORS.primary,
  },
  checkCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontFamily: FONTS.bold, fontSize: 14, color: '#fff' },

  hint: {
    fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textLight,
    textAlign: 'center', paddingHorizontal: 32, marginTop: 8,
    lineHeight: 20,
  },
});
