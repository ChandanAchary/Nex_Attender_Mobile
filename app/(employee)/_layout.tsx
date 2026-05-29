import { withLayoutContext } from "expo-router";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Ionicons } from "@expo/vector-icons";
import { FloatingTabBar } from "@/components/FloatingTabBar";

// Material top tabs give native, finger-following swipe between tabs (via
// react-native-pager-view). We render them with the tab bar pinned to the
// bottom and use our floating pill bar as the custom tab bar.
const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

export default function EmployeeLayout() {
  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ swipeEnabled: true }}
    >
      <MaterialTopTabs.Screen
        name="index"
        options={{
          title: "Attendance",
          tabBarIcon: ({ color }: { color: string }) =><Ionicons name="location" size={24} color={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }: { color: string }) =><Ionicons name="time" size={24} color={color} />,
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
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }: { color: string }) =><Ionicons name="person" size={24} color={color} />,
        }}
      />
    </MaterialTopTabs>
  );
}
