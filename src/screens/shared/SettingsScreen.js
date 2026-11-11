import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';
import { APP_VERSION } from '../../constants/appVersion';
import { COLORS } from '../../constants/colors';

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
  red:     '#EF4444',
  redBg:   '#FEF2F2',
};

function MenuCard({ iconBg, icon, title, subtitle, onPress, danger, last }) {
  return (
    <TouchableOpacity
      style={[styles.menuCard, last && { marginBottom: 0 }]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconBg || C.mint }]}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>
      <View style={styles.menuBody}>
        <Text style={[styles.menuTitle, danger && { color: C.red }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.menuSub, danger && { color: '#F87171' }]}>{subtitle}</Text>
        ) : null}
      </View>
      {!danger && <Text style={styles.chevron}>{'›'}</Text>}
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }) {
  const { language, user, logout, userType } = useApp();

  const name   = user?.name   || '';
  const phone  = user?.mobile || user?.phone || '';
  const initials = (name || 'S').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () =>
    Alert.alert(
      language === 'ta' ? 'வெளியேறு' : 'Log out',
      language === 'ta' ? 'வெளியேற விரும்புகிறீர்களா?' : 'Are you sure you want to log out?',
      [
        { text: language === 'ta' ? 'ரத்து' : 'Cancel', style: 'cancel' },
        { text: language === 'ta' ? 'வெளியேறு' : 'Log out', style: 'destructive', onPress: logout },
      ]
    );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Avatar header ── */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>
            {name || (language === 'ta' ? 'விற்பனையாளர்' : 'Seller')}
          </Text>
          {phone ? <Text style={styles.phone}>+91 {phone}</Text> : null}
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{'♻️'} Scrap Trove Member</Text>
            </View>
          </View>
        </View>

        {/* ── Menu list ── */}
        <View style={styles.menuList}>

          <MenuCard
            iconBg="#EFF6FF" icon="👤"
            title={language === 'ta' ? 'என் விவரங்கள்' : 'My Details'}
            subtitle={language === 'ta' ? 'பெயர், மொபைல், முகவரி' : 'Name, mobile, address'}
            onPress={() => navigation.navigate('MyDetails')}
          />

          <MenuCard
            iconBg="#F0FDF4" icon="🌐"
            title={language === 'ta' ? 'மொழி' : 'Language'}
            subtitle={language === 'ta' ? 'தமிழ்' : 'English'}
            onPress={() => navigation.navigate('Language')}
          />

          <MenuCard
            iconBg="#FFF7ED" icon="🎫"
            title={language === 'ta' ? 'உதவி & ஆதரவு' : 'Help & Support'}
            subtitle={language === 'ta' ? 'ஆதரவு டிக்கெட்கள்' : 'Support tickets'}
            onPress={() => navigation.navigate('Support')}
          />

          <MenuCard
            iconBg="#F0FDF4" icon="❓"
            title="FAQ"
            subtitle={language === 'ta' ? 'அடிக்கடி கேட்கப்படும் கேள்விகள்' : 'Frequently asked questions'}
            onPress={() => navigation.navigate('FAQ', { role: 'seller' })}
          />

          <MenuCard
            iconBg="#F5F3FF" icon="ℹ️"
            title={language === 'ta' ? 'எங்களை பற்றி' : 'About Us'}
            subtitle={language === 'ta' ? 'Scrap Trove பற்றிய தகவல்' : 'App info & version'}
            onPress={() => navigation.navigate('About')}
          />

          <MenuCard
            iconBg={C.redBg} icon="🚪"
            title={language === 'ta' ? 'வெளியேறு' : 'Log out'}
            subtitle={language === 'ta' ? 'கணக்கிலிருந்து வெளியேறு' : 'Sign out of your account'}
            onPress={handleLogout}
            danger
            last
          />

        </View>

        {/* ── Branding footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerSymbol}>{'♻️'}</Text>
          <Text style={styles.footerLogo}>Scrap Trove</Text>
          <Text style={styles.footerTagline}>
            {language === 'ta'
              ? 'சென்னையில் செய்யப்பட்டது. விற்பனையாளர்களுக்கு எப்போதும் இலவசம்.'
              : 'Made in Chennai. Always free for sellers.'}
          </Text>
          <Text style={styles.footerVersion}>{APP_VERSION}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.page },
  scroll: { paddingBottom: 48 },

  header: {
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24,
    backgroundColor: C.bg,
    borderBottomWidth: 1, borderBottomColor: C.bdr, marginBottom: 20,
  },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: C.mint, borderWidth: 2, borderColor: C.mintBdr,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontFamily: FONTS.black, fontSize: 28, color: C.green },
  name:       { fontFamily: FONTS.black, fontSize: 22, color: C.text, marginBottom: 4 },
  phone:      { fontFamily: FONTS.medium, fontSize: 15, color: C.sub, marginBottom: 12 },
  badges:     { flexDirection: 'row', gap: 8 },
  badge: {
    backgroundColor: C.mint, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
    borderWidth: 1, borderColor: C.mintBdr,
  },
  badgeText: { fontFamily: FONTS.bold, fontSize: 12, color: C.green },

  menuList: { paddingHorizontal: 16, gap: 10 },

  menuCard: {
    backgroundColor: C.bg, borderRadius: 16,
    borderWidth: 1, borderColor: C.bdr,
    flexDirection: 'row', alignItems: 'center',
    padding: 16, gap: 14,
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconCircle: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
  menuBody:  { flex: 1 },
  menuTitle: { fontFamily: FONTS.bold, fontSize: 15, color: C.text, marginBottom: 2 },
  menuSub:   { fontFamily: FONTS.regular, fontSize: 13, color: C.sub, lineHeight: 18 },
  chevron:   { fontSize: 22, color: C.light },

  footer: {
    alignItems: 'center', paddingTop: 32, paddingHorizontal: 24,
  },
  footerSymbol:  { fontSize: 32 },
  footerLogo:    { fontFamily: FONTS.black, fontSize: 18, color: C.green, marginTop: 8, marginBottom: 5 },
  footerTagline: { fontFamily: FONTS.regular, fontSize: 12, color: C.light, textAlign: 'center', lineHeight: 18, marginBottom: 5 },
  footerVersion: { fontFamily: FONTS.medium, fontSize: 11, color: C.light },
});
