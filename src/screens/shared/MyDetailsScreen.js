import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, TextInput,
  Platform, KeyboardAvoidingView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../constants/colors';

function DetailRow({ icon, label, value, onEditPress, last = false }) {
  const empty = !value;
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <View style={styles.rowIcon}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {empty
          ? <TouchableOpacity onPress={onEditPress} disabled={!onEditPress}>
              <Text style={styles.addLink}>{onEditPress ? '+ Add' : '—'}</Text>
            </TouchableOpacity>
          : <Text style={styles.rowValue}>{value}</Text>}
      </View>
      {!empty && onEditPress && (
        <TouchableOpacity onPress={onEditPress} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={styles.editLink}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function MyDetailsScreen({ navigation }) {
  const { language, user, login, userType } = useApp();
  const [emailModal, setEmailModal] = useState(false);
  const [emailValue, setEmailValue] = useState('');

  const name       = user?.name      || '';
  const phone      = user?.mobile    || user?.phone    || '';
  const email      = user?.gmail     || user?.email    || '';
  const city       = user?.city      || '';
  const district   = user?.district  || '';
  const stateVal   = user?.state     || '';
  const savedAddr  = user?.savedAddress || '';
  const location   = city ? [city, district, stateVal].filter(Boolean).join(', ') : '';

  const openEditEmail = () => { setEmailValue(email); setEmailModal(true); };

  const saveEmail = async () => {
    const v = emailValue.trim();
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      Alert.alert(
        language === 'ta' ? 'தவறான மின்னஞ்சல்' : 'Invalid Email',
        language === 'ta' ? 'சரியான மின்னஞ்சல் உள்ளிடவும்' : 'Please enter a valid email address'
      );
      return;
    }
    await login({ ...user, gmail: v }, userType);
    setEmailModal(false);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'ta' ? 'என் விவரங்கள்' : 'My Details'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <DetailRow
            icon="👤"
            label={language === 'ta' ? 'பெயர்' : 'Name'}
            value={name}
          />
          <DetailRow
            icon="📱"
            label={language === 'ta' ? 'மொபைல்' : 'Mobile'}
            value={phone ? `+91 ${phone}` : ''}
          />
          <DetailRow
            icon="✉️"
            label={language === 'ta' ? 'மின்னஞ்சல்' : 'Email'}
            value={email}
            onEditPress={openEditEmail}
          />
          {/* City/District/State — display only, from registration */}
          {location ? (
            <DetailRow
              icon="🏙️"
              label={language === 'ta' ? 'பகுதி' : 'Area'}
              value={location}
            />
          ) : null}
          {/* Full / Pickup Address — editable */}
          <DetailRow
            icon="📍"
            label={language === 'ta' ? 'முழு முகவரி' : 'Full Address'}
            value={savedAddr}
            onEditPress={() => navigation.navigate('AddressForm')}
            last
          />
        </View>

        <Text style={styles.note}>
          {language === 'ta'
            ? 'பெயர் மற்றும் மொபைல் மாற்ற ஆதரவை தொடர்பு கொள்ளவும்.'
            : 'To update name or mobile number, please contact support.'}
        </Text>
      </ScrollView>

      {/* Email edit modal */}
      <Modal visible={emailModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {email
                ? (language === 'ta' ? 'மின்னஞ்சல் திருத்து' : 'Edit Email')
                : (language === 'ta' ? 'மின்னஞ்சல் சேர்க்க' : 'Add Email')}
            </Text>
            <TextInput
              style={styles.input}
              value={emailValue}
              onChangeText={setEmailValue}
              placeholder="email@example.com"
              placeholderTextColor={COLORS.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <View style={styles.sheetBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEmailModal(false)}>
                <Text style={styles.cancelTxt}>{language === 'ta' ? 'ரத்து' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEmail}>
                <Text style={styles.saveTxt}>{language === 'ta' ? 'சேமி' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn:     { width: 36, height: 36, justifyContent: 'center' },
  backArrow:   { fontFamily: FONTS.semiBold, fontSize: 22, color: COLORS.text },
  headerTitle: { fontFamily: FONTS.black, fontSize: 18, color: COLORS.text },
  scroll: { padding: 16 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden', marginBottom: 14,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: FONTS.medium, fontSize: 11, color: COLORS.textLight,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3,
  },
  rowValue: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text },
  addLink:  { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.primary },
  editLink: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.primary },
  note: {
    fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textLight,
    textAlign: 'center', lineHeight: 18, paddingHorizontal: 16,
  },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:   { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle: { fontFamily: FONTS.black, fontSize: 18, color: COLORS.text, marginBottom: 16 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 14,
    fontFamily: FONTS.regular, fontSize: 15, color: COLORS.text, marginBottom: 20,
  },
  sheetBtns:  { flexDirection: 'row', gap: 12 },
  cancelBtn:  { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border },
  cancelTxt:  { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.textSecondary },
  saveBtn:    { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: COLORS.primary },
  saveTxt:    { fontFamily: FONTS.extraBold, fontSize: 15, color: '#fff' },
});
