import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const res = await fetch("https://api.popcornpick.app/check_session", {
        credentials: "include",
      });
      const data = await res.json();
      console.log("Session Data:", data.loggedIn);
      setIsAuth(data.loggedIn);
    };
    checkSession();
  }, []);

  // ✅ Wait until auth check finishes
  if (isAuth === null) {
    return <div>Loading...</div>; // or a spinner
  }
  if (isAuth === false) return <Navigate to="/" replace />;

  return <>{children}</>;
}

export default ProtectedRoute;
