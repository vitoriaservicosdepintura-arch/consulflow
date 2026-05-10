import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LeadProvider } from "@/contexts/LeadContext";
import LoginScreen from "@/components/LoginScreen";
import Dashboard from "@/components/Dashboard";

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? (
    <LeadProvider><Dashboard /></LeadProvider>
  ) : (
    <LoginScreen />
  );
};

const Index = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default Index;
