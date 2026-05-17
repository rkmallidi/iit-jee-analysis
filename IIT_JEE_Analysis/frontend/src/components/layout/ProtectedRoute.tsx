import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";

interface Props {
  children: React.ReactNode;
  check: (auth: ReturnType<typeof useAuthStore.getState>) => boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({ children, check, redirectTo = "/" }: Props) {
  const auth = useAuthStore();
  if (!check(auth)) {
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
}
