/**
 * LocationPickerModal — shared bottom-sheet picker used across the app.
 * Exports: PickerModal (the sliding modal list) + PickerBtn (the trigger button)
 *
 * Used by:
 *   • DetailsFormScreen  (registration — seller & dealer)
 *   • PostStep3Screen    (seller pickup address)
 */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, FlatList,
} from 'react-native';
import { FONTS } from '../constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = {
  text:    '#0A1628',
  light:   '#9CA3AF',
  bdr:     '#E5E7EB',
  surface: '#F9FAFB',
  green:   '#16A34A',
  mint:    '#F0FDF4',
  red:     '#EF4444',
};

// ─── Bottom-sheet modal list ───────────────────────────────────────────────────
export function PickerModal({ visible, title, items, onSelect, onClose }) {
  const insets = useSafeAreaInsets(); // list sheet sits above the navigation bar
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={pm.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[pm.sheet, { paddingBottom: insets.bottom }]}>
        <View style={pm.handle} />
        <Text style={pm.title}>{title}</Text>
        <FlatList
          data={items}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={pm.row}
              onPress={() => { onSelect(item); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={pm.rowText}>{item}</Text>
              <Text style={pm.rowArrow}>›</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={pm.sep} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
        <TouchableOpacity style={pm.cancelBtn} onPress={onClose}>
          <Text style={pm.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Trigger button (tap to open a PickerModal) ────────────────────────────────
export function PickerBtn({ label, value, placeholder, onPress, disabled, error }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity
        style={[
          s.btn,
          value    && s.btnFilled,
          disabled && s.btnDisabled,
          error    && s.btnError,
        ]}
        onPress={!disabled ? onPress : undefined}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[s.btnText, !value && s.btnPlaceholder]}>
          {value || placeholder}
        </Text>
        <Text style={s.chevron}>▾</Text>
      </TouchableOpacity>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const pm = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:      {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '72%',
    paddingHorizontal: 20, paddingTop: 12,
  },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: C.bdr, alignSelf: 'center', marginBottom: 12 },
  title:      { fontFamily: FONTS.extraBold, fontSize: 16, color: C.text, textAlign: 'center', marginBottom: 12 },
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowText:    { fontFamily: FONTS.medium, fontSize: 15, color: C.text, flex: 1 },
  rowArrow:   { fontFamily: FONTS.bold, fontSize: 18, color: C.light },
  sep:        { height: 1, backgroundColor: C.bdr },
  cancelBtn:  { paddingVertical: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: C.bdr, marginTop: 4 },
  cancelText: { fontFamily: FONTS.bold, fontSize: 15, color: C.red },
});

const s = StyleSheet.create({
  label:          { fontFamily: FONTS.semiBold, fontSize: 13, color: C.text, marginBottom: 6 },
  btn:            {
    backgroundColor: C.surface,
    borderRadius: 14, borderWidth: 1.5, borderColor: C.bdr,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
  },
  btnFilled:      { borderColor: C.green, backgroundColor: C.mint },
  btnDisabled:    { opacity: 0.45 },
  btnError:       { borderColor: C.red },
  btnText:        { fontFamily: FONTS.medium, fontSize: 15, color: C.text, flex: 1 },
  btnPlaceholder: { color: C.light },
  chevron:        { fontFamily: FONTS.bold, fontSize: 14, color: C.light },
  error:          { fontFamily: FONTS.regular, fontSize: 12, color: C.red, marginTop: 4 },
});
