import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '@/theme/ThemeProvider';
import { TourTarget } from '@/tour/TourTarget';
import { useTour } from '@/tour/TourProvider';

// Home
import DashboardScreen from '@/screens/home/DashboardScreen';

// Money
import TransactionListScreen from '@/screens/money/TransactionListScreen';
import AddEditTransactionScreen from '@/screens/money/AddEditTransactionScreen';
import TransactionDetailScreen from '@/screens/money/TransactionDetailScreen';
import AccountsListScreen from '@/screens/money/AccountsListScreen';
import AddEditAccountScreen from '@/screens/money/AddEditAccountScreen';
import AccountDetailScreen from '@/screens/money/AccountDetailScreen';
import BudgetsListScreen from '@/screens/money/BudgetsListScreen';
import AddEditBudgetScreen from '@/screens/money/AddEditBudgetScreen';
import BudgetDetailScreen from '@/screens/money/BudgetDetailScreen';
import CategoriesListScreen from '@/screens/money/CategoriesListScreen';
import AddEditCategoryScreen from '@/screens/money/AddEditCategoryScreen';
import RecurringListScreen from '@/screens/money/RecurringListScreen';
import AddEditRecurringScreen from '@/screens/money/AddEditRecurringScreen';

// Habits
import HabitListScreen from '@/screens/habits/HabitListScreen';
import AddEditHabitScreen from '@/screens/habits/AddEditHabitScreen';
import HabitDetailScreen from '@/screens/habits/HabitDetailScreen';

// Reports
import ReportsScreen from '@/screens/reports/ReportsScreen';
import CategoryDrilldownScreen from '@/screens/reports/CategoryDrilldownScreen';
import SingleHabitReportScreen from '@/screens/reports/SingleHabitReportScreen';

// Settings
import SettingsScreen from '@/screens/settings/SettingsScreen';
import SettingsSubScreen from '@/screens/settings/SettingsSubScreen';

export type MoneyStackParamList = {
  TransactionList: undefined;
  AddEditTransaction: { id?: string } | undefined;
  TransactionDetail: { id: string };
  AccountsList: undefined;
  AddEditAccount: { id?: string } | undefined;
  AccountDetail: { id: string };
  BudgetsList: undefined;
  AddEditBudget: { id?: string } | undefined;
  BudgetDetail: { id: string };
  CategoriesList: undefined;
  AddEditCategory: { id?: string } | undefined;
  RecurringList: undefined;
  AddEditRecurring: { id?: string } | undefined;
};

export type HabitsStackParamList = {
  HabitList: undefined;
  AddEditHabit: { id?: string } | undefined;
  HabitDetail: { id: string };
};

export type ReportsStackParamList = {
  Reports: undefined;
  CategoryDrilldown: { categoryId: string; monthKey: string };
  SingleHabitReport: { habitId: string };
};

export type RootStackParamList = {
  Tabs: undefined;
  Settings: undefined;
  SettingsSub: { section: string };
};

// Shared page-transition options: screens slide in from the right, modals from the bottom.
// Native-stack animations run on the UI thread, so they stay smooth under load.
const stackScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  animationDuration: 260,
} as const;

const modalOptions = { presentation: 'modal', animation: 'slide_from_bottom' } as const;

const MoneyStack = createNativeStackNavigator<MoneyStackParamList>();
const HabitsStack = createNativeStackNavigator<HabitsStackParamList>();
const ReportsStack = createNativeStackNavigator<ReportsStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function MoneyNavigator() {
  return (
    <MoneyStack.Navigator screenOptions={stackScreenOptions}>
      <MoneyStack.Screen name="TransactionList" component={TransactionListScreen} />
      <MoneyStack.Screen name="AddEditTransaction" component={AddEditTransactionScreen} options={modalOptions} />
      <MoneyStack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <MoneyStack.Screen name="AccountsList" component={AccountsListScreen} />
      <MoneyStack.Screen name="AddEditAccount" component={AddEditAccountScreen} options={modalOptions} />
      <MoneyStack.Screen name="AccountDetail" component={AccountDetailScreen} />
      <MoneyStack.Screen name="BudgetsList" component={BudgetsListScreen} />
      <MoneyStack.Screen name="AddEditBudget" component={AddEditBudgetScreen} options={modalOptions} />
      <MoneyStack.Screen name="BudgetDetail" component={BudgetDetailScreen} />
      <MoneyStack.Screen name="CategoriesList" component={CategoriesListScreen} />
      <MoneyStack.Screen name="AddEditCategory" component={AddEditCategoryScreen} options={modalOptions} />
      <MoneyStack.Screen name="RecurringList" component={RecurringListScreen} />
      <MoneyStack.Screen name="AddEditRecurring" component={AddEditRecurringScreen} options={modalOptions} />
    </MoneyStack.Navigator>
  );
}

function HabitsNavigator() {
  return (
    <HabitsStack.Navigator screenOptions={stackScreenOptions}>
      <HabitsStack.Screen name="HabitList" component={HabitListScreen} />
      <HabitsStack.Screen name="AddEditHabit" component={AddEditHabitScreen} options={modalOptions} />
      <HabitsStack.Screen name="HabitDetail" component={HabitDetailScreen} />
    </HabitsStack.Navigator>
  );
}

function ReportsNavigator() {
  return (
    <ReportsStack.Navigator screenOptions={stackScreenOptions}>
      <ReportsStack.Screen name="Reports" component={ReportsScreen} />
      <ReportsStack.Screen name="CategoryDrilldown" component={CategoryDrilldownScreen} />
      <ReportsStack.Screen name="SingleHabitReport" component={SingleHabitReportScreen} />
    </ReportsStack.Navigator>
  );
}

function MainTabs() {
  const { colors } = useTheme();
  const { registerTabSwitcher } = useTour();
  const tabNavRef = React.useRef<any>(null);

  // Let the product tour move between tabs as it walks through the app.
  React.useEffect(() => {
    registerTabSwitcher((tab: string) => tabNavRef.current?.navigate(tab));
    return () => registerTabSwitcher(null);
  }, [registerTabSwitcher]);

  return (
    <Tabs.Navigator
      screenListeners={({ navigation }) => { tabNavRef.current = navigation; return {}; }}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarActiveTintColor: colors.accent500,
        tabBarInactiveTintColor: colors.neutral400,
        tabBarStyle: {
          height: 72,
          backgroundColor: colors.surfaceCard,
          borderTopColor: colors.surfaceBorder,
          borderTopWidth: 0.5,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="Home" component={DashboardScreen} options={{
        tabBarIcon: ({ color, size }) => <Feather name="home" size={21} color={color} />,
      }} />
      <Tabs.Screen
        name="Money"
        component={MoneyNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TourTarget id="tab-money"><Feather name="credit-card" size={21} color={color} /></TourTarget>
          ),
        }}
        listeners={({ navigation: tabNav }) => ({
          // Hard reset: tapping the Money tab ALWAYS lands on the root Transactions screen and
          // discards any inner history (Accounts, a detail screen, an open add/edit modal).
          // preventDefault stops the default "restore last inner screen" behaviour; navigating
          // to TransactionList (the stack's initial route) pops everything above it.
          tabPress: (e) => {
            e.preventDefault();
            tabNav.navigate('Money', { screen: 'TransactionList' });
          },
        })}
      />
      <Tabs.Screen name="Habits" component={HabitsNavigator} options={{
        tabBarIcon: ({ color, size }) => (
          <TourTarget id="tab-habits"><Feather name="check-square" size={21} color={color} /></TourTarget>
        ),
      }} />
      <Tabs.Screen name="Reports" component={ReportsNavigator} options={{
        tabBarIcon: ({ color, size }) => (
          <TourTarget id="tab-reports"><Feather name="bar-chart-2" size={21} color={color} /></TourTarget>
        ),
      }} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={stackScreenOptions}>
      <RootStack.Screen name="Tabs" component={MainTabs} />
      {/* Settings screens fade in rather than sliding — the horizontal slide felt heavy here. */}
      <RootStack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'fade' }} />
      <RootStack.Screen name="SettingsSub" component={SettingsSubScreen} options={{ animation: 'fade' }} />
    </RootStack.Navigator>
  );
}
