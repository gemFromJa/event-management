import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import EventList from "./pages/EventList";
import CreateEvent from "./pages/CreateEvent";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<EventList />} />
        <Route path="/login" element={<Auth />} />
        <Route
          path="/create"
          element={
            <ProtectedRoute role="organizer">
              <CreateEvent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
