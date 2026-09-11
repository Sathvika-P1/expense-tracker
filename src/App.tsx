import { Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import { PlaceholderPage } from "./shell/PlaceholderPage";
import { HomePage } from "./pages/HomePage";

function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<ShellLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
      </Route>
    </Routes>
  );
}
