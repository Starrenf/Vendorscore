import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import { AppStateProvider } from "./state/AppState";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import OrgHub from "./pages/OrgHub";
import JoinOrg from "./pages/JoinOrg";
import Suppliers from "./pages/Suppliers";
import SupplierDetail from "./pages/SupplierDetail";
import NewEvaluation from "./pages/NewEvaluation";
import EvaluationDetail from "./pages/EvaluationDetail";
import AdminWeights from "./pages/AdminWeights";
import AdminOrganizations from "./pages/AdminOrganizations";
import Methodiek from "./pages/Methodiek";

export default function App() {
  return (
    <AppStateProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/onboarding" element={<Onboarding />} />

          <Route path="/org" element={<OrgHub />} />
          <Route path="/join/:slug" element={<JoinOrg />} />

          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/suppliers/:id" element={<SupplierDetail />} />

          <Route path="/methodiek" element={<Methodiek />} />

          <Route path="/evaluations/new" element={<NewEvaluation />} />
          <Route path="/evaluations/:id" element={<EvaluationDetail />} />

          <Route path="/admin" element={<Navigate to="/admin/orgs" replace />} />

          <Route path="/admin/orgs" element={<AdminOrganizations />} />
          <Route path="/admin/weights" element={<AdminWeights />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AppStateProvider>
  );
}