import React, { useEffect, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, TouchableOpacity, ActivityIndicator, View, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '../context/AppContext';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';

export const navigationRef = createNavigationContainerRef();

// Auth
import WelcomeScreen       from '../screens/auth/WelcomeScreen';
import UserTypeScreen      from '../screens/auth/UserTypeScreen';
import PhoneScreen         from '../screens/auth/PhoneScreen';
import OTPScreen           from '../screens/auth/OTPScreen';
import DetailsFormScreen   from '../screens/auth/DetailsFormScreen';
import BulkDetailsScreen   from '../screens/auth/BulkDetailsScreen';
// Kept in the tree so previously-registered dealers can still open the app.
// New dealer registration is disabled pre-launch (UserTypeScreen no longer
// offers the dealer option); once we resume onboarding, add a dealer card
// back and route new signups here.
import DealerPendingScreen from '../screens/auth/DealerPendingScreen';

// Seller
import SellerHomeScreen    from '../screens/seller/SellerHomeScreen';
import SuspendedScreen     from '../screens/seller/SuspendedScreen';
import EditDetailsScreen   from '../screens/seller/EditDetailsScreen';
import PostStep1Screen     from '../screens/seller/PostStep1Screen';
import PostStep2Screen     from '../screens/seller/PostStep2Screen';
import PostStep3Screen     from '../screens/seller/PostStep3Screen';
import PostStep4Screen     from '../screens/seller/PostStep4Screen';
import OrderStatusScreen   from '../screens/seller/OrderStatusScreen';
import SellerHistoryScreen from '../screens/seller/SellerHistoryScreen';
import RateDealerScreen    from '../screens/seller/RateDealerScreen';

// Dealer
import DealerHomeScreen     from '../screens/dealer/DealerHomeScreen';
import IncomingOrderScreen  from '../screens/dealer/IncomingOrderScreen';
import ActiveOrderScreen    from '../screens/dealer/ActiveOrderScreen';
import DealerProfileScreen  from '../screens/dealer/DealerProfileScreen';
import DealerEarningsScreen from '../screens/dealer/DealerEarningsScreen';

// Shared
import ScrapRatesScreen    from '../screens/shared/ScrapRatesScreen';
import YardFindsScreen     from '../screens/shared/YardFindsScreen';
import BulkProductsScreen  from '../screens/seller/BulkProductsScreen';
import BulkPostFlow       from '../screens/seller/BulkPostFlow';
import SettingsScreen      from '../screens/shared/SettingsScreen';
import SupportScreen       from '../screens/shared/SupportScreen';
import TicketChatScreen    from '../screens/shared/TicketChatScreen';
import FAQScreen           from '../screens/shared/FAQScreen';
import MyDetailsScreen     from '../screens/shared/MyDetailsScreen';
import LanguageScreen      from '../screens/shared/LanguageScreen';
import AboutScreen         from '../screens/shared/AboutScreen';
import AddressFormScreen   from '../screens/shared/AddressFormScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ─── Design tokens ──────────────────────────────────────────────────────────────
const GREEN    = '#16A34A';
const GREEN_LT = '#F0FDF4';
const BORDER   = '#DCFCE7';

// ─── Center FAB tab button ───────────────────────────────────────────────────────
function FabTabButton({ children, onPress }) {
  return (
    <TouchableOpacity
      style={fabStyles.wrap}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={fabStyles.btn}>
        <Text style={{ fontSize: 28 }}>♻️</Text>
      </View>
    </TouchableOpacity>
  );
}

const fabStyles = StyleSheet.create({
  wrap: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: GREEN,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: GREEN, shadowOpacity: 0.45, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 10,
    borderWidth: 3, borderColor: '#FFFFFF',
  },
});

// ─── Tab icon helper ────────────────────────────────────────────────────────────
const TabIcon = (emoji) => ({ focused }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
);

// ─── Shared tab screen options ──────────────────────────────────────────────────
const sharedTabOpts = {
  headerShown: false,
  tabBarActiveTintColor: GREEN,
  tabBarInactiveTintColor: '#9CA3AF',
  tabBarStyle: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 6,
    height: 68,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  tabBarLabelStyle: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    marginTop: 2,
  },
};

// Edge-to-edge (SDK 54 / Android 16): the system navigation bar is drawn over
// the bottom of the app, so the fixed 68px tab bar grows by the bottom inset
// and keeps its icons above the gesture/3-button bar.
const tabOptions = (bottomInset) => ({
  ...sharedTabOpts,
  tabBarStyle: {
    ...sharedTabOpts.tabBarStyle,
    height: 68 + bottomInset,
    paddingBottom: 8 + bottomInset,
  },
});

// ─── Seller Tab Navigator ────────────────────────────────────────────────────────
// Tab 4 (right of the FAB) differs by seller type:
//   small seller  -> 'Yard Finds'  (browse reusable stock from our yard)
//   bulk  seller  -> 'What We Buy' (category list, WhatsApp rates CTA)
// Bulk sellers never see the market-rates screen — bulk pricing is per-lift
// on WhatsApp, not published.
const SellerTabs = ({ navigation }) => {
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const isBulk = user?.seller_type === 'bulk';

  return (
    <Tab.Navigator screenOptions={tabOptions(insets.bottom)}>
      <Tab.Screen
        name="SellerHome"
        component={SellerHomeScreen}
        options={{ tabBarLabel: 'Home', tabBarIcon: TabIcon('🏠') }}
      />
      <Tab.Screen
        name="SellerHistory"
        component={SellerHistoryScreen}
        options={{ tabBarLabel: 'Pickups', tabBarIcon: TabIcon('📋') }}
      />
      {/* Center FAB — forks by seller type:
            small -> 4-step PostStep1 flow (weights, address, photos, timing)
            bulk  -> 5-step BulkPostFlow  (materials, weight, photos, schedule, confirm) */}
      <Tab.Screen
        name="PostScrapTab"
        component={SellerHomeScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <FabTabButton
              {...props}
              onPress={() => navigation.navigate(isBulk ? 'BulkPostFlow' : 'PostStep1')}
            />
          ),
        }}
      />
      {isBulk ? (
        <Tab.Screen
          name="BulkProducts"
          component={BulkProductsScreen}
          options={{ tabBarLabel: 'Products', tabBarIcon: TabIcon('🏭') }}
        />
      ) : (
        <Tab.Screen
          name="YardFinds"
          component={YardFindsScreen}
          options={{ tabBarLabel: 'Yard Finds', tabBarIcon: TabIcon('♻️') }}
        />
      )}
      <Tab.Screen
        name="SellerSettings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Profile', tabBarIcon: TabIcon('👤') }}
      />
    </Tab.Navigator>
  );
};

// ─── Dealer center FAB button (balance/scale icon) ──────────────────────────────
function DealerFabButton({ onPress }) {
  return (
    <TouchableOpacity
      style={fabStyles.wrap}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={fabStyles.btn}>
        <Text style={{ fontSize: 26 }}>⚖️</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Dealer Tab Navigator ────────────────────────────────────────────────────────
const DealerTabs = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator screenOptions={tabOptions(insets.bottom)}>
      <Tab.Screen
        name="DealerHome"
        component={DealerHomeScreen}
        options={{ tabBarLabel: 'Home', tabBarIcon: TabIcon('🏠') }}
      />
      <Tab.Screen
        name="DealerOrders"
        component={ScrapRatesScreen}
        options={{ tabBarLabel: 'Rates', tabBarIcon: TabIcon('📊') }}
      />
      {/* Center FAB → Earnings */}
      <Tab.Screen
        name="DealerEarningsTab"
        component={DealerEarningsScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <DealerFabButton {...props} onPress={() => navigation.navigate('DealerEarnings')} />
          ),
        }}
      />
      <Tab.Screen
        name="DealerRatesList"
        component={ScrapRatesScreen}
        options={{ tabBarLabel: 'Rates', tabBarIcon: TabIcon('📊') }}
      />
      <Tab.Screen
        name="DealerProfile"
        component={DealerProfileScreen}
        options={{ tabBarLabel: 'Profile', tabBarIcon: TabIcon('👤') }}
      />
    </Tab.Navigator>
  );
};

// ─── Root Navigator ──────────────────────────────────────────────────────────────
const AppNavigator = () => {
  const { user, userType, isLoading } = useApp();

  // ── Notification tap handler (foreground, background, and cold-start) ──────────
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledRef   = useRef(null);

  useEffect(() => {
    if (!lastResponse || !user) return;
    // Avoid handling the same response twice
    const responseId = lastResponse.notification.request.identifier;
    if (handledRef.current === responseId) return;
    handledRef.current = responseId;

    if (!navigationRef.isReady()) return;

    const data    = lastResponse.notification.request.content.data || {};
    const type    = data.type;
    const orderId = data.orderId;

    if (userType === 'seller') {
      if ((type === 'order_assigned' || type === 'order_completed') && orderId) {
        // Navigate to the order's live status screen
        navigationRef.navigate('OrderStatus', {
          order: {
            id:     orderId,
            status: type === 'order_assigned' ? 'assigned' : 'completed',
          },
        });
      } else {
        // Generic / admin notification → go home
        navigationRef.navigate('SellerTabs');
      }
    } else if (userType === 'dealer') {
      if (type === 'new_order') {
        // Go to dealer home — incoming orders panel will show the new request
        navigationRef.navigate('DealerTabs');
      } else {
        navigationRef.navigate('DealerTabs');
      }
    }
  }, [lastResponse, user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator color={GREEN} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        dark: false,
        colors: {
          primary:      COLORS.primary,
          background:   COLORS.background,
          card:         COLORS.surface,
          text:         COLORS.text,
          border:       COLORS.border,
          notification: COLORS.primary,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // ── Auth flow: Welcome → UserType (small / bulk) → Phone → OTP →
          //    DetailsForm (small) or BulkDetails (bulk) → SellerTabs ──
          <>
            <Stack.Screen name="Welcome"      component={WelcomeScreen} />
            <Stack.Screen name="UserType"     component={UserTypeScreen} />
            <Stack.Screen name="Phone"        component={PhoneScreen} />
            <Stack.Screen name="OTP"          component={OTPScreen} />
            <Stack.Screen name="DetailsForm"  component={DetailsFormScreen} />
            <Stack.Screen name="BulkDetails"  component={BulkDetailsScreen} />
          </>
        ) : userType === 'dealer_pending' ? (
          // Existing dealer awaiting admin approval (no new signups now).
          <>
            <Stack.Screen name="DealerPending" component={DealerPendingScreen} />
          </>
        ) : userType === 'seller' && user?.is_suspended === 1 ? (
          // ── Suspended seller: locked out of tabs, only edit request + support ──
          <>
            <Stack.Screen name="Suspended"   component={SuspendedScreen} />
            <Stack.Screen name="EditDetails" component={EditDetailsScreen} />
            <Stack.Screen name="Support"     component={SupportScreen} />
            <Stack.Screen name="TicketChat"  component={TicketChatScreen} />
          </>
        ) : userType === 'seller' ? (
          <>
            <Stack.Screen name="SellerTabs"  component={SellerTabs} />
            {/* Small-seller 4-step PostScrap flow */}
            <Stack.Screen name="PostStep1"   component={PostStep1Screen} />
            <Stack.Screen name="PostStep2"   component={PostStep2Screen} />
            <Stack.Screen name="PostStep3"   component={PostStep3Screen} />
            <Stack.Screen name="PostStep4"   component={PostStep4Screen} />
            {/* Bulk-seller 5-step flow (single screen with internal step state) */}
            <Stack.Screen name="BulkPostFlow" component={BulkPostFlow} />
            <Stack.Screen name="OrderStatus" component={OrderStatusScreen} />
            <Stack.Screen name="RateDealer"  component={RateDealerScreen} />
            {/* Full market-rates list — opened from "See all" on the home
                screen's Today's Prices strip. Small sellers only; bulk
                pricing is quoted per lift, not published. */}
            <Stack.Screen name="ScrapRates"  component={ScrapRatesScreen} />
            {/* Profile sub-screens */}
            <Stack.Screen name="MyDetails"    component={MyDetailsScreen} />
            <Stack.Screen name="AddressForm"  component={AddressFormScreen} />
            <Stack.Screen name="Language"     component={LanguageScreen} />
            <Stack.Screen name="About"        component={AboutScreen} />
            {/* Support + FAQ */}
            <Stack.Screen name="Support"    component={SupportScreen} />
            <Stack.Screen name="TicketChat" component={TicketChatScreen} />
            <Stack.Screen name="FAQ"        component={FAQScreen} />
          </>
        ) : (
          // dealer (approved)
          <>
            <Stack.Screen name="DealerTabs"     component={DealerTabs} />
            <Stack.Screen name="IncomingOrder"  component={IncomingOrderScreen} />
            <Stack.Screen name="ActiveOrder"    component={ActiveOrderScreen} />
            <Stack.Screen name="DealerRates"    component={ScrapRatesScreen} />
            <Stack.Screen name="DealerEarnings" component={DealerEarningsScreen} />
            {/* Profile sub-screens */}
            <Stack.Screen name="MyDetails"    component={MyDetailsScreen} />
            <Stack.Screen name="AddressForm"  component={AddressFormScreen} />
            <Stack.Screen name="Language"     component={LanguageScreen} />
            <Stack.Screen name="About"        component={AboutScreen} />
            {/* Support + FAQ */}
            <Stack.Screen name="Support"    component={SupportScreen} />
            <Stack.Screen name="TicketChat" component={TicketChatScreen} />
            <Stack.Screen name="FAQ"        component={FAQScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
