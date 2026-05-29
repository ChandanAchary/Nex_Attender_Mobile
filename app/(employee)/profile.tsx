import React from "react";
import { Screen } from "@/components/Screen";
import { ProfileCommon } from "@/components/ProfileCommon";

export default function EmployeeProfile() {
  return (
    <Screen title="Profile" subtitle="Account & security">
      <ProfileCommon />
    </Screen>
  );
}
