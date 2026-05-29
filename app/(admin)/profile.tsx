import React, { useState } from "react";
import { Alert } from "react-native";
import { Screen } from "@/components/Screen";
import { ProfileCommon } from "@/components/ProfileCommon";
import { Button, Card, Muted } from "@/components/ui";
import { reports } from "@/api/endpoints";
import { ApiError } from "@/api/client";
import { currentMonthIso } from "@/lib/format";
import { shareCsv } from "@/lib/share";

export default function AdminProfile() {
  const [downloading, setDownloading] = useState(false);

  const exportMonthly = async () => {
    setDownloading(true);
    const month = currentMonthIso();
    try {
      const csv = await reports.monthlyCsv(month);
      await shareCsv(`attendance-summary-${month}.csv`, csv);
    } catch (e) {
      Alert.alert("Export failed", e instanceof ApiError ? e.message : "Try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Screen title="Profile" subtitle="Account & reports">
      <ProfileCommon />
      <Card>
        <Muted>Download this month's per-employee attendance summary.</Muted>
        <Button
          title="Export monthly report (CSV)"
          variant="secondary"
          onPress={exportMonthly}
          loading={downloading}
        />
      </Card>
    </Screen>
  );
}
