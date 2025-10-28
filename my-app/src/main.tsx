import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";

import App from "./App.tsx"; // import your App component
import Log from "./components/login.tsx"; // import your Log component
import ProfileSetup from "./components/profile_setup.tsx";
import { Create } from "./components/login.tsx";
import ProtectedRoute from "./components/protected_route.tsx";

import "./components/movie.css";

import "./index.css";

function RootWrapper() {
  const [recs, setRecs] = useState<string[]>([]);
  const [searched, setSearched] = useState("");

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Log />} />
        <Route path="create_account" element={<Create />} />
        <Route path="/setup_profile" element={<ProfileSetup />} />
        <Route
          path="home/*"
          element={
            <ProtectedRoute>
              <App
                recs={recs}
                setRecs={setRecs}
                searched={searched}
                setSearched={setSearched}
              />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootWrapper />
  </StrictMode>
);
