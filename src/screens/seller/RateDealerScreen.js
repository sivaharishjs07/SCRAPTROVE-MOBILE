import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useBottomSpace } from '../../components/useBottomSpace';
import { t } from '../../constants/translations';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { rateDealer } from '../../services/api';

export default function RateDealerScreen({ navigation, route }) {
  const bottomSpace = useBottomSpace(); // edge-to-edge: keep content above the navigation bar
  const { order } = route.params;
  const { language } = useApp();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      await rateDealer(order.id, rating, review);
    } catch { /* demo ok */ }
    setLoading(false);
    setSubmitted(true);
    setTimeout(() => navigation.navigate('SellerHome'), 2000);
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>
          {language === 'ta' ? 'நன்றி!' : 'Thank you!'}
        </Text>
        <Text style={styles.successSub}>
          {language === 'ta' ? 'உங்கள் மதிப்பீடு சமர்ப்பிக்கப்பட்டது' : 'Your rating has been submitted'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomSpace }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← {t('back', language)}</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.emoji}>⭐</Text>
        <Text style={styles.title}>{t('rate_dealer', language)}</Text>
        {order.dealer && (
          <Text style={styles.dealerName}>{order.dealer.name}</Text>
        )}
        <Text style={styles.subtitle}>{t('rate_experience', language)}</Text>

        {/* Stars */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Text style={[styles.star, star <= rating && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Star label */}
        {rating > 0 && (
          <Text style={styles.ratingLabel}>
            {['', '😞 Poor', '😐 Fair', '🙂 Good', '😊 Great', '🤩 Excellent'][rating]}
          </Text>
        )}

        {/* Review */}
        <TextInput
          style={styles.reviewInput}
          placeholder={t('write_review', language)}
          placeholderTextColor={COLORS.textLight}
          value={review}
          onChangeText={setReview}
          multiline
          numberOfLines={3}
          maxLength={200}
        />

        <TouchableOpacity
          style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={rating === 0 || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>{t('submit_rating', language)}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.navigate('SellerHome')}>
          <Text style={styles.skipText}>{language === 'ta' ? 'தாண்டு' : 'Skip'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  backBtn: { paddingTop: 56, paddingHorizontal: 20 },
  backText: { color: COLORS.primary, fontFamily: FONTS.semiBold, fontSize: 16 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 24 },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontFamily: FONTS.black, fontSize: 26, color: COLORS.text, marginBottom: 4 },
  dealerName: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primary, marginBottom: 4 },
  subtitle: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.textSecondary, marginBottom: 28 },
  starsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  star: { fontSize: 44, color: COLORS.border },
  starActive: { color: '#F59E0B' },
  ratingLabel: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: 24 },
  reviewInput: {
    width: '100%', backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.border, padding: 14,
    fontFamily: FONTS.regular, fontSize: 14, color: COLORS.text,
    minHeight: 90, textAlignVertical: 'top', marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16,
    width: '100%', alignItems: 'center', marginBottom: 12,
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  submitBtnDisabled: { backgroundColor: COLORS.textLight, shadowOpacity: 0 },
  submitBtnText: { color: '#fff', fontFamily: FONTS.extraBold, fontSize: 16 },
  skipBtn: { padding: 8 },
  skipText: { color: COLORS.textSecondary, fontFamily: FONTS.medium, fontSize: 14 },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  successEmoji: { fontSize: 72, marginBottom: 20 },
  successTitle: { fontFamily: FONTS.black, fontSize: 28, color: COLORS.primary, marginBottom: 8 },
  successSub: { fontFamily: FONTS.regular, fontSize: 16, color: COLORS.textSecondary },
});
