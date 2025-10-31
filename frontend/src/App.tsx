import { Routes, Route } from "react-router";

import Search from "./components/search_bar.tsx";
import NavBar from "./components/nav_bar.tsx";
import WatchList from "./components/watchlist.tsx";
import Profile from "./components/profile.tsx";
import Genre from "./components/genre.tsx";
import API from "./components/api.tsx";
import Movie from "./components/movie.tsx";
import Info from "./components/info.tsx";
import TopRated from "./components/top_rated.tsx";
import ProtectedRoute from "./components/protected_route.tsx";
import "./components/search_bar.css";
import "./components/api.css";

interface AppProps {
  recs: string[];
  setRecs: React.Dispatch<React.SetStateAction<string[]>>;
  searched: string;
  setSearched: React.Dispatch<React.SetStateAction<string>>;
}

function App({ recs, setRecs, searched, setSearched }: AppProps) {
  return (
    <div className="bg-black">
      <Search
        recs={recs}
        searched={searched}
        setRecs={setRecs}
        setSearched={setSearched}
      />
      <NavBar setRecs={setRecs} />
      <Routes>
        <Route index element={<Info />} />
        <Route path="search/:searched" element={<API recs={recs} />} />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="movie/:id"
          element={
            <ProtectedRoute>
              <Movie />
            </ProtectedRoute>
          }
        />
        <Route
          path="top_rated"
          element={
            <ProtectedRoute>
              <TopRated />
            </ProtectedRoute>
          }
        />
        <Route
          path="watchlist"
          element={
            <ProtectedRoute>
              <WatchList />
            </ProtectedRoute>
          }
        />
        <Route
          path="genres/:genre"
          element={
            <ProtectedRoute>
              <Genre />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
