import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Modal, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { getTickets, createTicket } from '../../services/api';
import { FONTS } from '../../constants/typography';

const C = {
  bg: '#FFFFFF', text: '#0A1628', sub: '#6B7280', light: '#9CA3AF',
  bdr: '#E5E7EB', green: '#16A34A', greenLt: '#F0FDF4', greenBdr: '#DCFCE7',
  amber: '#D97706', amberLt: '#FFFBEB',
};

const ISSUE_TYPES = [
  { key: 'order_issue',   en: 'Order Issue',       ta: 'ஆர்டர் பிரச்சனை',  icon: '📦' },
  { key: 'payment_issue', en: 'Payment Issue',     ta: 'பணம் பிரச்சனை',     icon: '💰' },
  { key: 'dealer_issue',  en: 'Dealer Behaviour',  ta: 'டீலர் நடத்தை',      icon: '🚛' },
  { key: 'app_problem',   en: 'App Problem',       ta: 'ஆப் பிரச்சனை',      icon: '📱' },
  { key: 'account_issue', en: 'Account Issue',     ta: 'கணக்கு பிரச்சனை',   icon: '👤' },
  { key: 'other',         en: 'Other',             ta: 'மற்றவை',             icon: '💬' },
];

const statusInfo = (s, lang) =>
  s === 'closed'
    ? { bg: C.greenLt, color: C.green, label: lang === 'ta' ? 'தீர்க்கப்பட்டது' : 'Resolved' }
    : { bg: C.amberLt, color: C.amber, label: lang === 'ta' ? 'திறந்தது' : 'Open' };

const issueLabel = (key, lang) => {
  const it = ISSUE_TYPES.find(i => i.key === key);
  if (!it) return key;
  return lang === 'ta' ? it.ta : it.en;
};

const formatDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

export default function SupportScreen({ navigation }) {
  const { language } = useApp();
  const [tickets, setTickets]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [message, setMessage]     = useState('');
  const [creating, setCreating]   = useState(false);

  const loadTickets = async () => {
    try {
      const res = await getTickets();
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch { setTickets([]); }
    setLoading(false);
  };

  useEffect(() => { loadTickets(); }, []);

  const closeModal = () => { setShowCreate(false); setSelectedType(null); setMessage(''); };

  const handleCreate = async () => {
    if (!selectedType) {
      Alert.alert(language === 'ta' ? 'பிரச்சனை தேர்வு செய்யவும்' : 'Select an issue type');
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      Alert.alert(language === 'ta' ? 'விவரமாக எழுதவும்' : 'Describe issue in detail (min 10 chars)');
      return;
    }
    setCreating(true);
    try {
      const res = await createTicket(selectedType, message.trim());
      if (res.data?.ticket_id) {
        closeModal();
        await loadTickets();
        navigation.navigate('TicketChat', {
          ticket: { id: res.data.ticket_id, issue_type: selectedType, status: 'open', ticket_ref: res.data.ticket_ref || '' },
        });
      }
    } catch (e) {
      Alert.alert(
        language === 'ta' ? 'பிழை' : 'Error',
        e?.response?.data?.error || (language === 'ta' ? 'டிக்கெட் உருவாக்க முடியவில்லை' : 'Failed to create ticket')
      );
    }
    setCreating(false);
  };

  const renderTicket = ({ item }) => {
    const si = statusInfo(item.status, language);
    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={() => navigation.navigate('TicketChat', { ticket: item })}
        activeOpacity={0.75}
      >
        <View style={styles.ticketRow}>
          <Text style={styles.ticketIssue}>{issueLabel(item.issue_type, language)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: si.bg }]}>
            <Text style={[styles.statusText, { color: si.color }]}>{si.label}</Text>
          </View>
        </View>
        <View style={styles.ticketMeta}>
          <Text style={styles.ticketRef}>{item.ticket_ref || `#${item.id}`}</Text>
          <Text style={styles.ticketDate}>{formatDate(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'ta' ? 'உதவி & ஆதரவு' : 'Help & Support'}
        </Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.newBtnText}>{language === 'ta' ? '+ புதியது' : '+ New'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={C.green} style={{ marginTop: 60 }} size="large" />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={item => String(item.id)}
          renderItem={renderTicket}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎫</Text>
              <Text style={styles.emptyTitle}>
                {language === 'ta' ? 'டிக்கெட்கள் இல்லை' : 'No tickets yet'}
              </Text>
              <Text style={styles.emptyDesc}>
                {language === 'ta'
                  ? '+ புதியது அழுத்தி ஒரு பிரச்சனை பதிவு செய்யுங்கள்'
                  : 'Tap + New to raise a support request'}
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
                <Text style={styles.emptyBtnText}>
                  {language === 'ta' ? 'ஆதரவு கோரு' : 'Get Support'}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create Ticket Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'ta' ? 'புதிய ஆதரவு கோரிக்கை' : 'New Support Request'}
              </Text>
              <TouchableOpacity onPress={closeModal} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalLabel}>
                {language === 'ta' ? 'பிரச்சனை வகை' : 'What is your issue?'}
              </Text>
              <View style={styles.issueGrid}>
                {ISSUE_TYPES.map(it => (
                  <TouchableOpacity
                    key={it.key}
                    style={[styles.issueChip, selectedType === it.key && styles.issueChipSel]}
                    onPress={() => setSelectedType(it.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.issueIcon}>{it.icon}</Text>
                    <Text style={[styles.issueChipLabel, selectedType === it.key && { color: C.green }]}>
                      {language === 'ta' ? it.ta : it.en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { marginTop: 20 }]}>
                {language === 'ta' ? 'விவரம்' : 'Describe your issue'}
              </Text>
              <TextInput
                style={styles.msgInput}
                multiline
                numberOfLines={5}
                placeholder={
                  language === 'ta'
                    ? 'உங்கள் பிரச்சனையை விவரமாக எழுதுங்கள்...'
                    : 'Describe your issue in detail...'
                }
                placeholderTextColor={C.light}
                value={message}
                onChangeText={setMessage}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitBtn, (!selectedType || message.trim().length < 10) && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={creating || !selectedType || message.trim().length < 10}
              >
                {creating
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>
                      {language === 'ta' ? 'ஆதரவு கோரு' : 'Submit Ticket'}
                    </Text>
                }
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.bdr,
  },
  backBtn: { padding: 4, marginRight: 8 },
  backText: { fontFamily: FONTS.semiBold, fontSize: 22, color: C.text },
  headerTitle: { flex: 1, fontFamily: FONTS.black, fontSize: 18, color: C.text },
  newBtn: { backgroundColor: C.green, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  newBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: '#fff' },

  list: { padding: 16, paddingBottom: 32 },
  ticketCard: {
    backgroundColor: C.bg, borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: C.bdr,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  ticketRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ticketIssue: { fontFamily: FONTS.bold, fontSize: 15, color: C.text, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginLeft: 8 },
  statusText: { fontFamily: FONTS.bold, fontSize: 12 },
  ticketMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  ticketRef: { fontFamily: FONTS.regular, fontSize: 12, color: C.light },
  ticketDate: { fontFamily: FONTS.regular, fontSize: 12, color: C.light },

  empty: { paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontFamily: FONTS.black, fontSize: 18, color: C.text, marginBottom: 8 },
  emptyDesc: { fontFamily: FONTS.regular, fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  emptyBtn: { backgroundColor: C.green, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 24 },
  emptyBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#fff' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: FONTS.black, fontSize: 18, color: C.text },
  modalClose: { fontFamily: FONTS.bold, fontSize: 20, color: C.sub },
  modalLabel: { fontFamily: FONTS.extraBold, fontSize: 12, color: C.light, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  issueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  issueChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.bdr, backgroundColor: C.bg,
  },
  issueChipSel: { borderColor: C.green, backgroundColor: C.greenLt },
  issueIcon: { fontSize: 16 },
  issueChipLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: C.text },

  msgInput: {
    borderWidth: 1.5, borderColor: C.bdr, borderRadius: 14, padding: 14,
    fontFamily: FONTS.regular, fontSize: 14, color: C.text,
    minHeight: 120, marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: C.green, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnText: { fontFamily: FONTS.extraBold, fontSize: 16, color: '#fff' },
});
