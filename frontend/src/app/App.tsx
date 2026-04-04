import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "../features/admin/LoginPage";
import { DashboardPage } from "../features/admin/DashboardPage";
import { ValidationPage } from "../features/validation/ValidationPage";
import { PrivateRoute } from "../shared/components/PrivateRoute";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route path="/validar/:uuid" element={<ValidationPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
