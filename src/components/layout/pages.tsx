import { lazy, Suspense } from "react";
import { pageRegistry } from "./page-registry";
import { HomePage } from "@/pages/HomePage";

const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);

pageRegistry.register({
  id: "home",
  render: (ctx) => (
    <HomePage
      onNavigate={ctx.navigate}
      onOpenDrawer={ctx.openDrawer}
      onOpenFullScreen={ctx.openFullScreen}
    />
  ),
}, { default: true });

pageRegistry.register({
  id: "settings",
  render: (ctx) => (
    <Suspense fallback={null}>
      <SettingsPage onBack={() => ctx.navigate("home")} />
    </Suspense>
  ),
});