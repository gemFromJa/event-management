import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import OrganizerDashboard from "@/components/OrganizerDashboard";
import AttendeeDashboard from "@/components/AttendeeDashboard";

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="max-w-content mx-auto px-7 py-8">
      {user.role === "organizer" ? (
        <OrganizerDashboard />
      ) : (
        <AttendeeDashboard />
      )}
    </div>
  );
}
