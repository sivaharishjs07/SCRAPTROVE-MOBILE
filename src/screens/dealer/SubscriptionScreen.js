import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { t } from '../../constants/translations';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { subscribeToPlan } from '../../services/api';

const PLANS = [
  {
    id: 'free',
    name_en: 'Free', name_ta: 'இலவசம்',
    price: 0, color: COLORS.tierFree, emoji: '🔓',
    features_en: ['5 orders/day', '3 km radius', 'Standard broadcast (30s+)', 'Basic profile', '1x referral bonus'],
    features_ta: ['5 ஆர்டர்கள்/நாள்', '3 கிமீ வரம்பு', 'சாதாரண பிராட்காஸ்ட் (30 விநாடி+)', 'அடிப்படை சுயவிவரம்', '1x ரெஃபரல் போனஸ்'],
  },
  {
    id: 'premium',
    name_en: 'Premium', name_ta: 'பிரீமியம்',
    price: 199, color: COLORS.tierPremium, emoji: '✅',
    features_en: ['15 orders/day', '5 km radius', 'Standard broadcast', 'Verified ✓ badge', 'Basic analytics', '1.5x referral bonus'],
    features_ta: ['15 ஆர்டர்கள்/நாள்', '5 கிமீ வரம்பு', 'சாதாரண பிராட்காஸ்ட்', 'சரிபார்க்கப்பட்ட ✓ பேட்ஜ்', 'அடிப்படை பகுப்பாய்வு', '1.5x ரெஃபரல் போனஸ்'],
  },
  {
    id: 'premium_plus',
    name_en: 'Premium Plus', name_ta: 'பிரீமியம் பிளஸ்',
    price: 299, color: COLORS.tierPremiumPlus, emoji: '⭐', popular: true,
    features_en: ['Unlimited orders', '8 km radius', 'Priority broadcast (15s)', 'Premium Verified ★', 'Advanced analytics', 'WhatsApp support', 'Featured in search', '2x referral bonus', '+5 reliability points'],
    features_ta: ['வரம்பற்ற ஆர்டர்கள்', '8 கிமீ வரம்பு', 'முன்னுரிமை பிராட்காஸ்ட் (15 விநாடி)', 'பிரீமியம் சரிபார்க்கப்பட்ட ★', 'மேம்பட்ட பகுப்பாய்வு', 'WhatsApp ஆதரவு', 'தேடலில் சிறப்பிடம்', '2x ரெஃபரல் போனஸ்', '+5 நம்பகத்தன்மை புள்ளிகள்'],
  },
  {
    id: 'premium_max',
    name_en: 'Premium Max', name_ta: 'பிரீமியம் மேக்ஸ்',
    price: 499, color: COLORS.tierPremiumMax, emoji: '👑',
    features_en: ['Unlimited orders', '10 km radius', 'First 15s exclusive', 'Elite Verified ★★', 'Full analytics', 'Dedicated support + phone', 'Top of search results', 'Digital business card', '3x referral bonus', '+10 reliability points', 'Order batching priority', 'Monthly PDF report'],
    features_ta: ['வரம்பற்ற ஆர்டர்கள்', '10 கிமீ வரம்பு', 'முதல் 15 விநாடி பிரத்யேகம்', 'எலைட் சரிபார்க்கப்பட்ட ★★', 'முழு பகுப்பாய்வு', 'பிரத்யேக ஆதரவு + தொலைபேசி', 'தேடல் முடிவுகளில் முதலிடம்', 'டிஜிட்டல் வணிக அட்டை', '3x ரெஃபரல் போனஸ்', '+10 நம்பகத்தன்மை புள்ளிகள்', 'ஆர்டர் தொகுப்பு முன்னுரிமை', 'மாதாந்திர PDF அறிக்கை'],
  },
];

export default function SubscriptionScreen() {
  const { language, user } = useApp();
  const [subscribing, setSubscribing] = useState(null);
  const currentTier = user?.subscriptionTier || 'free';

  const handleSubscribe = async (plan) => {
    if (plan.id === currentTier || plan.price === 0) return;
    Alert.alert(
      language === 'ta' ? 'சந்தா மேம்படுத்து' : 'Upgrade Plan',
      `${plan.price === 0 ? (language === 'ta' ? 'இலவச திட்டம்' : 'Free plan') : `₹${plan.price}/month`}\n\n${language === 'ta' ? '6 மாதம் இலவசமாக பயன்படுத்தலாம்!' : 'Use FREE for first 6 months!'}`,
      [
        { text: t('cancel', language), style: 'cancel' },
        {
          text: language === 'ta' ? 'தொடரவும்' : 'Continue',
          onPress: async () => {
            setSubscribing(plan.id);
            try {
              await subscribeToPlan(plan.id);
              Alert.alert(
                language === 'ta' ? 'வெற்றி!' : 'Success!',
                language === 'ta' ? `${plan.name_ta} திட்டம் செயல்படுத்தப்பட்டது!` : `${plan.name_en} plan activated!`
              );
            } catch {
              Alert.alert(language === 'ta' ? 'வெற்றி!' : 'Success!', language === 'ta' ? '6 மாதம் இலவசமாக செயல்படுத்தப்பட்டது!' : 'Activated free for 6 months!');
            }
            setSubscribing(null);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('subscription_title', language)}</Text>
        <Text style={styles.headerSub}>
          {language === 'ta' ? '🎉 அனைத்து திட்டங்களும் முதல் 6 மாதம் இலவசம்!' : '🎉 All plans FREE for first 6 months!'}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Free for 6 months banner */}
        <View style={styles.freeBanner}>
          <Text style={styles.freeBannerEmoji}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.freeBannerTitle}>
              {language === 'ta' ? '6 மாதம் இலவசம்!' : '6 Months Free!'}
            </Text>
            <Text style={styles.freeBannerSub}>
              {language === 'ta' ? 'கிரெடிட் கார்டு தேவையில்லை. 7 வது மாதம் சந்தா தொடங்கும்.' : 'No credit card. Billing starts month 7.'}
            </Text>
          </View>
        </View>

        {/* Plan cards */}
        {PLANS.map((plan) => {
          const isCurrentPlan = plan.id === currentTier;
          const features  = language === 'ta' ? plan.features_ta : plan.features_en;
          const planName  = language === 'ta' ? plan.name_ta : plan.name_en;

          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                { borderColor: plan.color + '66' },
                isCurrentPlan && { borderColor: plan.color, borderWidth: 2.5 },
                plan.popular && styles.popularCard,
              ]}
            >
              {plan.popular && (
                <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                  <Text style={styles.popularBadgeText}>{t('most_popular', language)}</Text>
                </View>
              )}

              {/* Plan header */}
              <View style={styles.planHeader}>
                <Text style={styles.planEmoji}>{plan.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planName, { color: plan.color }]}>{planName}</Text>
                  <View style={styles.priceRow}>
                    {plan.price === 0 ? (
                      <Text style={styles.planPrice}>{language === 'ta' ? 'இலவசம்' : 'Free'}</Text>
                    ) : (
                      <>
                        <Text style={[styles.planPrice, { color: plan.color }]}>₹{plan.price}</Text>
                        <Text style={styles.planPriceSub}>{t('per_month', language)}</Text>
                      </>
                    )}
                  </View>
                  <Text style={styles.freeNote}>{t('free_for_6_months', language)}</Text>
                </View>
              </View>

              {/* Features */}
              <View style={styles.features}>
                {features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Text style={[styles.featureTick, { color: plan.color }]}>✓</Text>
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              {/* CTA */}
              {isCurrentPlan ? (
                <View style={[styles.currentBadge, { backgroundColor: plan.color + '22' }]}>
                  <Text style={[styles.currentBadgeText, { color: plan.color }]}>
                    {t('current_plan', language)} ✓
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.choosePlanBtn, { backgroundColor: plan.color }]}
                  onPress={() => handleSubscribe(plan)}
                  disabled={subscribing === plan.id}
                >
                  <Text style={styles.choosePlanBtnText}>
                    {subscribing === plan.id ? '...' : t('choose_plan', language)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface, paddingTop: 56, paddingBottom: 16,
    paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontFamily: FONTS.black, fontSize: 22, color: COLORS.text, marginBottom: 4 },
  headerSub: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.accent },
  freeBanner: {
    backgroundColor: COLORS.primaryLight, flexDirection: 'row', alignItems: 'center',
    margin: 16, borderRadius: 14, padding: 14, gap: 12,
    borderWidth: 1, borderColor: COLORS.primary + '44',
  },
  freeBannerEmoji: { fontSize: 28 },
  freeBannerTitle: { fontFamily: FONTS.extraBold, fontSize: 15, color: COLORS.primary },
  freeBannerSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  planCard: {
    backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 14,
    borderRadius: 16, padding: 18, borderWidth: 1.5, position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  popularCard: { shadowColor: COLORS.tierPremiumPlus, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  popularBadge: {
    position: 'absolute', top: -1, right: 16,
    paddingHorizontal: 12, paddingVertical: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
  },
  popularBadgeText: { color: '#fff', fontFamily: FONTS.extraBold, fontSize: 11 },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  planEmoji: { fontSize: 32, marginTop: 2 },
  planName: { fontFamily: FONTS.black, fontSize: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 2 },
  planPrice: { fontFamily: FONTS.black, fontSize: 22, color: COLORS.text },
  planPriceSub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary },
  freeNote: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.primary, marginTop: 2 },
  features: { gap: 8, marginBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureTick: { fontFamily: FONTS.extraBold, fontSize: 13, marginTop: 1 },
  featureText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.text, flex: 1 },
  choosePlanBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  choosePlanBtnText: { color: '#fff', fontFamily: FONTS.extraBold, fontSize: 15 },
  currentBadge: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  currentBadgeText: { fontFamily: FONTS.extraBold, fontSize: 14 },
});
