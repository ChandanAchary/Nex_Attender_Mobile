import { withLayoutContext } from "expo-router";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Ionicons } from "@expo/vector-icons";
import { FloatingTabBar } from "@/components/FloatingTabBar";

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

export default function AdminTabsLayout() {
  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ swipeEnabled: true }}
    >
      <MaterialTopTabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="grid" size={24} color={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="day-status"
        options={{
          title: "Attendance Status",
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="stats-chart" size={24} color={color} />
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="leave"
        options={{
          title: "Leave",
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="calendar" size={24} color={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="menu" size={24} color={color} />,
        }}
      />
    </MaterialTopTabs>
  );
}
