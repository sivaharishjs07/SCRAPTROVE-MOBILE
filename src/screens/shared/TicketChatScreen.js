import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { getTicket, addTicketMessage, reopenTicket } from '../../services/api';
import { FONTS } from '../../constants/typography';

const C = {
  bg: '#FFFFFF', chatBg: '#F8FAFC', text: '#0A1628', sub: '#6B7280', light: '#9CA3AF',
  bdr: '#E5E7EB', green: '#16A34A', greenLt: '#F0FDF4', greenBdr: '#DCFCE7',
  amber: '#D97706', amberLt: '#FFFBEB',
};

const ISSUE_LABELS = {
  order_issue:   { en: 'Order Issue',       ta: 'ஆர்டர் பிரச்சனை' },
  payment_issue: { en: 'Payment Issue',     ta: 'பணம் பிரச்சனை' },
  dealer_issue:  { en: 'Pickup Team Behaviour', ta: 'எங்கள் குழு நடத்தை' },
  app_problem:   { en: 'App Problem',       ta: 'ஆப் பிரச்சனை' },
  account_issue: { en: 'Account Issue',     ta: 'கணக்கு பிரச்சனை' },
  other:         { en: 'Other',             ta: 'மற்றவை' },
};

const issueLabel = (key, lang) =>
  (ISSUE_LABELS[key] || { en: key, ta: key })[lang === 'ta' ? 'ta' : 'en'];

const formatTime = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

const formatDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

export default function TicketChatScreen({ navigation, route }) {
  const { ticket: initialTicket } = route.params;
  const { language } = useApp();
  const [ticket, setTicket]       = useState(initialTicket);
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [text, setText]           = useState('');
  const [sending, setSending]     = useState(false);
  const [reopening, setReopening] = useState(false);
  const listRef = useRef(null);

  const loadTicket = async () => {
    try {
      const res = await getTicket(initialTicket.id);
      setTicket(res.data.ticket || initialTicket);
      setMessages(res.data.messages || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadTicket(); }, []);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    if (ticket.status === 'closed') {
      Alert.alert(
        language === 'ta' ? 'டிக்கெட் மூடப்பட்டது' : 'Ticket Closed',
        language === 'ta' ? 'முதலில் டிக்கெட்டை மீண்டும் திறக்கவும்' : 'Please reopen the ticket first'
      );
      return;
    }
    const msg = text.trim();
    setText('');
    setSending(true);
    const optimistic = { id: `opt-${Date.now()}`, sender: 'user', message: msg, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    try {
      await addTicketMessage(initialTicket.id, msg);
      await loadTicket();
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setText(msg);
    }
    setSending(false);
  };

  const handleReopen = () => {
    Alert.alert(
      language === 'ta' ? 'டிக்கெட் மீண்டும் திற' : 'Reopen Ticket',
      language === 'ta' ? 'இந்த டிக்கெட்டை மீண்டும் திறக்கவா?' : 'Mark this issue as not yet resolved and reopen?',
      [
        { text: language === 'ta' ? 'ரத்து' : 'Cancel', style: 'cancel' },
        { text: language === 'ta' ? 'மீண்டும் திற' : 'Reopen', onPress: doReopen },
      ]
    );
  };

  const doReopen = async () => {
    setReopening(true);
    try {
      await reopenTicket(initialTicket.id);
      await loadTicket();
    } catch (e) {
      Alert.alert(
        language === 'ta' ? 'பிழை' : 'Error',
        e?.response?.data?.error || (language === 'ta' ? 'மீண்டும் திறக்க முடியவில்லை' : 'Could not reopen ticket')
      );
    }
    setReopening(false);
  };

  const renderMessage = ({ item, index }) => {
    const isUser   = item.sender === 'user';
    const isSystem = item.sender === 'system';

    // Date separator
    const prev = messages[index - 1];
    const showDate = !prev || formatDate(item.created_at) !== formatDate(prev.created_at);

    return (
      <>
        {showDate && (
          <View style={styles.dateSep}>
            <Text style={styles.dateSepText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        {isSystem ? (
          <View style={styles.systemMsg}>
            <Text style={styles.systemMsgText}>{item.message}</Text>
          </View>
        ) : (
          <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
            {!isUser && (
              <View style={styles.supportAvatar}>
                <Text style={{ fontSize: 14 }}>♻️</Text>
              </View>
            )}
            <View style={[styles.bubble, isUser ? styles.userBubble : styles.supportBubble]}>
              {!isUser && (
                <Text style={styles.senderName}>
                  {language === 'ta' ? 'Scrap Trove ஆதரவு' : 'Scrap Trove Support'}
                </Text>
              )}
              <Text style={[styles.bubbleText, isUser && { color: '#fff' }]}>{item.message}</Text>
              <Text style={[styles.bubbleTime, isUser && { color: 'rgba(255,255,255,0.65)' }]}>
                {formatTime(item.created_at)}
              </Text>
            </View>
          </View>
        )}
      </>
    );
  };

  const isClosed = ticket.status === 'closed';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{issueLabel(ticket.issue_type, language)}</Text>
          <Text style={styles.headerSub}>
            {ticket.ticket_ref || `#${ticket.id}`} · {isClosed
              ? (language === 'ta' ? '✅ தீர்க்கப்பட்டது' : '✅ Resolved')
              : (language === 'ta' ? '🟡 திறந்தது' : '🟡 Open')}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={C.green} size="large" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item, i) => String(item.id || i)}
            renderItem={renderMessage}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Closed banner */}
        {isClosed && (
          <TouchableOpacity
            style={styles.reopenBanner}
            onPress={handleReopen}
            disabled={reopening}
            activeOpacity={0.8}
          >
            {reopening
              ? <ActivityIndicator color={C.amber} size="small" />
              : <Text style={styles.reopenText}>
                  🔔 {language === 'ta' ? 'பிரச்சனை இன்னும் தீரவில்லையா? மீண்டும் திறக்க' : 'Issue still not resolved? Tap to reopen'}
                </Text>
            }
          </TouchableOpacity>
        )}

        {/* Input */}
        {!isClosed && (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={language === 'ta' ? 'செய்தி உள்ளிடவும்...' : 'Type a message...'}
              placeholderTextColor={C.light}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
              onPress={sendMessage}
              disabled={!text.trim() || sending}
            >
              {sending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.sendIcon}>↑</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.chatBg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.bdr,
    backgroundColor: C.bg,
  },
  backBtn: { padding: 4, marginRight: 10 },
  backText: { fontFamily: FONTS.semiBold, fontSize: 22, color: C.text },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 15, color: C.text },
  headerSub: { fontFamily: FONTS.regular, fontSize: 12, color: C.sub, marginTop: 1 },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  msgList: { padding: 16, paddingBottom: 12 },

  dateSep: { alignItems: 'center', marginVertical: 12 },
  dateSepText: {
    fontFamily: FONTS.medium, fontSize: 11, color: C.light,
    backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 12,
  },

  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },

  supportAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.greenLt, borderWidth: 1, borderColor: C.greenBdr,
    alignItems: 'center', justifyContent: 'center',
  },

  bubble: {
    maxWidth: '75%', borderRadius: 16, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  userBubble: { backgroundColor: C.green, borderBottomRightRadius: 4 },
  supportBubble: {
    backgroundColor: C.bg, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: C.bdr,
  },
  senderName: { fontFamily: FONTS.bold, fontSize: 11, color: C.green, marginBottom: 4 },
  bubbleText: { fontFamily: FONTS.regular, fontSize: 14, color: C.text, lineHeight: 20 },
  bubbleTime: { fontFamily: FONTS.regular, fontSize: 10, color: C.light, marginTop: 4, textAlign: 'right' },

  systemMsg: {
    alignSelf: 'center', backgroundColor: '#EEF2FF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 6, marginBottom: 12, maxWidth: '80%',
  },
  systemMsgText: { fontFamily: FONTS.regular, fontSize: 12, color: '#4F46E5', textAlign: 'center' },

  reopenBanner: {
    backgroundColor: C.amberLt, borderTopWidth: 1, borderTopColor: '#FDE68A',
    paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center',
  },
  reopenText: { fontFamily: FONTS.bold, fontSize: 14, color: C.amber, textAlign: 'center' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 12, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.bdr,
  },
  input: {
    flex: 1, fontFamily: FONTS.regular, fontSize: 14, color: C.text,
    borderWidth: 1.5, borderColor: C.bdr, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
  },
  sendIcon: { color: '#fff', fontFamily: FONTS.black, fontSize: 20 },
});
