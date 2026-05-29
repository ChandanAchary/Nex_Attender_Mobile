import React from "react";
import { Loading } from "@/components/ui";

// Landing route. The root navigator redirects to the correct area
// (auth / employee / admin) once auth state resolves.
export default function Index() {
  return <Loading label="Starting Nex Attender…" />;
}
