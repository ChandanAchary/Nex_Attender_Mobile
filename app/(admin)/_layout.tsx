import { withLayoutContext } from "expo-router";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Ionicons } from "@expo/vector-icons";
import { FloatingTabBar } from "@/components/FloatingTabBar";

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

export default function AdminLayout() {
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
          tabBarIcon: ({ color }: { color: string }) =><Ionicons name="grid" size={24} color={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="employees"
        options={{
          title: "People",
          tabBarIcon: ({ color }: { color: string }) =><Ionicons name="people" size={24} color={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="leave"
        options={{
          title: "Leave",
          tabBarIcon: ({ color }: { color: string }) =><Ionicons name="calendar" size={24} color={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="offices"
        options={{
          title: "Offices",
          tabBarIcon: ({ color }: { color: string }) =><Ionicons name="business" size={24} color={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="holidays"
        options={{
          title: "Holidays",
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="calendar-clear-outline" size={24} color={color} />
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }: { color: string }) =><Ionicons name="person" size={24} color={color} />,
        }}
      />
    </MaterialTopTabs>
  );
}
