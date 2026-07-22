import React, { useState } from "react";
import { Alert } from "react-native";
import { Screen } from "@/components/Screen";
import { ProfileCommon } from "@/components/ProfileCommon";
import { Button, Card, Muted } from "@/components/ui";
import { reports } from "@/api/endpoints";
import { ApiError } from "@/api/client";
import { currentMonthIso } from "@/lib/format";
import { shareXls } from "@/lib/share";

export default function AdminProfile() {
  const [downloading, setDownloading] = useState(false);

  const exportMonthly = async () => {
    setDownloading(true);
    const month = currentMonthIso();
    try {
      const xls = await reports.dayStatusXls(month);
      await shareXls(`day-status-${month}.xls`, xls);
    } catch (e) {
      Alert.alert("Export failed", e instanceof ApiError ? e.message : "Try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Screen title="Profile" subtitle="Account & reports" showBack>
      <ProfileCommon />
      <Card>
        <Muted>Download this month's day-wise attendance status report.</Muted>
        <Button
          title="Export monthly report (Excel)"
          variant="secondary"
          onPress={exportMonthly}
          loading={downloading}
        />
      </Card>
    </Screen>
  );
}

