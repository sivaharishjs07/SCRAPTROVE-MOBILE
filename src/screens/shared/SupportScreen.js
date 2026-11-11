import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Modal, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTickets, createTicket, getSellerOrders, getDealerOrders } from '../../services/api';
import { FONTS } from '../../constants/typography';

const C = {
  bg: '#FFFFFF', text: '#0A1628', sub: '#6B7280', light: '#9CA3AF',
  bdr: '#E5E7EB', green: '#16A34A', greenLt: '#F0FDF4', greenBdr: '#DCFCE7',
  amber: '#D97706', amberLt: '#FFFBEB',
};

// `key` MUST match TICKET_ISSUE_TYPES on the worker — it validates
// issue_type against that list and 400s on anything else. These used to be
// snake_case values of our own ('order_issue', 'dealer_issue', …) that the
// worker never accepted, so every ticket raised from the app failed. The
// English text is the stored key; `ta` is display only.
const ISSUE_TYPES = [
  { key: "Dealer didn't arrive",  en: "Pickup team didn't arrive", ta: 'குழு வரவில்லை',              icon: '🚛' },
  { key: 'Wrong weight recorded', en: 'Wrong weight recorded',     ta: 'எடை தவறாக பதிவு',            icon: '⚖️' },
  { key: 'Payment issue',         en: 'Payment issue',             ta: 'பணம் பிரச்சனை',              icon: '💰' },
  { key: 'Rate dispute',          en: 'Rate dispute',              ta: 'விலை தகராறு',                icon: '💵' },
  { key: 'Damaged / lost items',  en: 'Damaged / lost items',      ta: 'சேதம் / காணவில்லை',          icon: '📦' },
  { key: 'Other',                 en: 'Other',                     ta: 'மற்றவை',                      icon: '💬' },
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

export default function SupportScreen({ navigation, route }) {
  const insets = useSafeAreaInsets(); // new-ticket sheet sits above the navigation bar
  const { language, user } = useApp();
  // When opened from an order ("Raise an Issue with this Order"), the order
  // is already known, so the flow skips the picker and starts at the issue
  // step — exactly as the website does.
  const raiseForOrder = route?.params?.raiseForOrder || null;
  // This screen is mounted in both the seller and dealer stacks, so the
  // order list has to come from the right endpoint. The worker accepts a
  // ticket from either side of an order.
  const isDealer = user?.role === 'dealer';
  const [tickets, setTickets]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  // Two-step flow, same as the website: choose the order, then the issue.
  const [phase, setPhase] = useState('order');   // 'order' | 'issue'
  // True when the sheet was opened from a specific order, so the issue
  // step has no order list behind it to go back to.
  const [orderLocked, setOrderLocked] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [message, setMessage]     = useState('');
  const [creating, setCreating]   = useState(false);

  // A ticket must be attached to one of the seller's own orders — the
  // worker requires order_id. Mirrors the website, where "Raise an Issue"
  // is reached from a specific order.
  const [orders, setOrders]           = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder]  = useState(null);

  const loadTickets = async () => {
    try {
      const res = await getTickets();
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch { setTickets([]); }
    setLoading(false);
  };

  useEffect(() => { loadTickets(); }, []);

  // Arriving from an order: open the sheet straight at the issue step with
  // that order locked in. The param is cleared so going back and returning
  // doesn't reopen it.
  useEffect(() => {
    if (!raiseForOrder) return;
    setSelectedOrder(raiseForOrder);
    setSelectedType(null);
    setMessage('');
    setOrderLocked(true);
    setPhase('issue');
    setShowCreate(true);
    navigation.setParams({ raiseForOrder: undefined });
  }, [raiseForOrder, navigation]);

  const openCreate = async () => {
    setShowCreate(true);
    setPhase('order');
    setOrderLocked(false);
    setSelectedOrder(null); setSelectedType(null); setMessage('');
    setOrdersLoading(true);
    try {
      const res = isDealer ? await getDealerOrders() : await getSellerOrders();
      setOrders(Array.isArray(res.data) ? res.data : (res.data?.orders || []));
    } catch { setOrders([]); }
    setOrdersLoading(false);
  };

  const pickOrder = (o) => { setSelectedOrder(o); setPhase('issue'); };

  const closeModal = () => {
    setShowCreate(false); setPhase('order'); setOrderLocked(false);
    setSelectedType(null); setMessage(''); setSelectedOrder(null);
  };

  const handleCreate = async () => {
    if (!selectedOrder) {
      Alert.alert(language === 'ta' ? 'ஆர்டரை தேர்வு செய்யவும்' : 'Select the order this is about');
      return;
    }
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
      const res = await createTicket(selectedOrder.id, selectedType, message.trim());
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
        {/* Every ticket belongs to an order — the worker joins order_ref,
            so show which one, as the website's ticket list does. */}
        {item.order_ref ? (
          <Text style={styles.ticketOrder}>
            {language === 'ta' ? 'ஆர்டர்' : 'Order'} · {item.order_ref}
          </Text>
        ) : null}
        <View style={styles.ticketMeta}>
          <Text style={styles.ticketRef}>{item.ticket_ref || `#${item.id}`}</Text>
          <Text style={styles.ticketDate}>{formatDate(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'ta' ? 'உதவி & ஆதரவு' : 'Help & Support'}
        </Text>
        <TouchableOpacity style={styles.newBtn} onPress={openCreate}>
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
              <TouchableOpacity style={styles.emptyBtn} onPress={openCreate}>
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
          <View style={[styles.modalSheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {phase === 'issue' && !orderLocked ? (
                  <TouchableOpacity
                    onPress={() => setPhase('order')}
                    hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    style={{ marginRight: 10 }}
                  >
                    <Text style={styles.modalBack}>←</Text>
                  </TouchableOpacity>
                ) : null}
                <Text style={styles.modalTitle}>
                  {phase === 'order'
                    ? (language === 'ta' ? 'ஆர்டரை தேர்ந்தெடுக்கவும்' : 'Select an order')
                    : (language === 'ta' ? 'பிரச்சனையை பதிவு செய்யவும்' : 'Raise an issue')}
                </Text>
              </View>
              <TouchableOpacity onPress={closeModal} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {phase === 'order' ? (
                <>
                  <Text style={styles.modalLabel}>
                    {language === 'ta' ? 'எந்த ஆர்டர் குறித்து?' : 'Which order is this about?'}
                  </Text>
                  {ordersLoading ? (
                    <ActivityIndicator color={C.green} style={{ marginVertical: 24 }} />
                  ) : orders.length === 0 ? (
                    <View style={styles.noOrders}>
                      <Text style={styles.noOrdersEmoji}>📦</Text>
                      <Text style={styles.noOrdersTitle}>
                        {language === 'ta' ? 'உங்களிடம் ஆர்டர்கள் இல்லை' : "You don't have any orders"}
                      </Text>
                      <Text style={styles.noOrdersText}>
                        {language === 'ta'
                          ? 'ஆதரவு கோரிக்கை ஒரு ஆர்டருடன் இணைக்கப்பட வேண்டும். முதலில் ஒரு பிக்கப் பதிவு செய்யுங்கள்.'
                          : 'A support request is always raised against an order. Book a pickup first, then you can raise an issue about it.'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.orderList}>
                      {orders.map(o => (
                        <TouchableOpacity
                          key={o.id}
                          style={styles.orderRow}
                          onPress={() => pickOrder(o)}
                          activeOpacity={0.75}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.orderRef}>{o.order_ref || `#${o.id}`}</Text>
                            <Text style={styles.orderMeta} numberOfLines={1}>
                              {formatDate(o.created_at)}
                              {o.status ? ` · ${o.status}` : ''}
                            </Text>
                          </View>
                          <Text style={styles.orderChevron}>›</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <>
              {/* Keeps the chosen order visible while the issue is picked. */}
              <View style={styles.orderPinned}>
                <Text style={styles.orderPinnedLabel}>{language === 'ta' ? 'ஆர்டர்' : 'ORDER'}</Text>
                <Text style={styles.orderPinnedRef}>
                  {selectedOrder?.order_ref || `#${selectedOrder?.id}`}
                </Text>
              </View>

              <Text style={[styles.modalLabel, { marginTop: 18 }]}>
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
                maxLength={500}
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
                </>
              )}
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
  ticketOrder: { fontFamily: FONTS.semiBold, fontSize: 11.5, color: C.green, marginTop: 4 },
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

  modalBack:   { fontFamily: FONTS.bold, fontSize: 20, color: C.green },

  orderList:   { gap: 8 },
  orderRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 12, borderWidth: 1.5, borderColor: C.bdr, backgroundColor: '#F9FAFB' },
  orderRef:    { fontFamily: FONTS.bold, fontSize: 13, color: C.text },
  orderMeta:   { fontFamily: FONTS.regular, fontSize: 11, color: C.sub, marginTop: 2 },
  orderChevron:{ fontFamily: FONTS.bold, fontSize: 22, color: C.light },

  orderPinned:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.greenLt, borderWidth: 1, borderColor: C.greenBdr, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  orderPinnedLabel:{ fontFamily: FONTS.bold, fontSize: 10, color: C.sub, letterSpacing: 0.6 },
  orderPinnedRef:  { fontFamily: FONTS.bold, fontSize: 13, color: C.green },

  noOrders:     { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16 },
  noOrdersEmoji:{ fontSize: 40, marginBottom: 10 },
  noOrdersTitle:{ fontFamily: FONTS.bold, fontSize: 15, color: C.text, marginBottom: 6, textAlign: 'center' },
  noOrdersText: { fontFamily: FONTS.regular, fontSize: 12.5, color: C.sub, lineHeight: 19, textAlign: 'center' },

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
