import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '@/theme/ThemeProvider';

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

const MoneyStack = createNativeStackNavigator<MoneyStackParamList>();
const HabitsStack = createNativeStackNavigator<HabitsStackParamList>();
const ReportsStack = createNativeStackNavigator<ReportsStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function MoneyNavigator() {
  return (
    <MoneyStack.Navigator screenOptions={{ headerShown: false }}>
      <MoneyStack.Screen name="TransactionList" component={TransactionListScreen} />
      <MoneyStack.Screen name="AddEditTransaction" component={AddEditTransactionScreen} options={{ presentation: 'modal' }} />
      <MoneyStack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <MoneyStack.Screen name="AccountsList" component={AccountsListScreen} />
      <MoneyStack.Screen name="AddEditAccount" component={AddEditAccountScreen} options={{ presentation: 'modal' }} />
      <MoneyStack.Screen name="AccountDetail" component={AccountDetailScreen} />
      <MoneyStack.Screen name="BudgetsList" component={BudgetsListScreen} />
      <MoneyStack.Screen name="AddEditBudget" component={AddEditBudgetScreen} options={{ presentation: 'modal' }} />
      <MoneyStack.Screen name="BudgetDetail" component={BudgetDetailScreen} />
      <MoneyStack.Screen name="CategoriesList" component={CategoriesListScreen} />
      <MoneyStack.Screen name="AddEditCategory" component={AddEditCategoryScreen} options={{ presentation: 'modal' }} />
      <MoneyStack.Screen name="RecurringList" component={RecurringListScreen} />
      <MoneyStack.Screen name="AddEditRecurring" component={AddEditRecurringScreen} options={{ presentation: 'modal' }} />
    </MoneyStack.Navigator>
  );
}

function HabitsNavigator() {
  return (
    <HabitsStack.Navigator screenOptions={{ headerShown: false }}>
      <HabitsStack.Screen name="HabitList" component={HabitListScreen} />
      <HabitsStack.Screen name="AddEditHabit" component={AddEditHabitScreen} options={{ presentation: 'modal' }} />
      <HabitsStack.Screen name="HabitDetail" component={HabitDetailScreen} />
    </HabitsStack.Navigator>
  );
}

function ReportsNavigator() {
  return (
    <ReportsStack.Navigator screenOptions={{ headerShown: false }}>
      <ReportsStack.Screen name="Reports" component={ReportsScreen} />
      <ReportsStack.Screen name="CategoryDrilldown" component={CategoryDrilldownScreen} />
      <ReportsStack.Screen name="SingleHabitReport" component={SingleHabitReportScreen} />
    </ReportsStack.Navigator>
  );
}

function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
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
      <Tabs.Screen name="Money" component={MoneyNavigator} options={{
        tabBarIcon: ({ color, size }) => <Feather name="credit-card" size={21} color={color} />,
      }} />
      <Tabs.Screen name="Habits" component={HabitsNavigator} options={{
        tabBarIcon: ({ color, size }) => <Feather name="check-square" size={21} color={color} />,
      }} />
      <Tabs.Screen name="Reports" component={ReportsNavigator} options={{
        tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={21} color={color} />,
      }} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={MainTabs} />
      <RootStack.Screen name="Settings" component={SettingsScreen} />
      <RootStack.Screen name="SettingsSub" component={SettingsSubScreen} />
    </RootStack.Navigator>
  );
}
