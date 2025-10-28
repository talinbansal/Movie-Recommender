import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

interface MovieProps {
  title: string;
  poster: string;
  id: number;
}

function Profile() {
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.user || "";

  const [profilePic, setProfilePic] = useState<string | null>();
  const [userData, setUserData] = useState<[string[], MovieProps[]]>([[], []]);
  const [userStats, setUserStats] = useState<[number, [string, number]]>([
    0,
    ["", 0],
  ]);
  const [genres, setGenres] = useState<string[]>([]);

  const getData = async () => {
    try {
      const url = "http://localhost:5050/get_user_data";
      const resp = await fetch(url, { credentials: "include" });

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const data = await resp.json();
      setUserData(data.user_data);
      setGenres(JSON.parse(data.user_data[0]));
      console.log("user:", data.user_data);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  const getStats = async () => {
    try {
      const url = "http://localhost:5050/get_user_stats";
      const resp = await fetch(url, { credentials: "include" });

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const data = await resp.json();
      setUserStats(data.user_stats);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  const fetchUpload = async () => {
    try {
      const url = `http://localhost:5050/fetch_profile_pic`;
      const resp = await fetch(url, { credentials: "include" });

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const data = await resp.json();
      setProfilePic(data.profile_pic);
    } catch (error) {
      console.error("Error fetching upload status:", error);
    }
  };

  useEffect(() => {
    getData();
    getStats();
    fetchUpload();
  }, []);

  const handleMovieClick = (id: number) => {
    navigate(`/home/movie/${id}`, { state: { from: location.pathname } });
  };

  const handleEditProfile = () => {
    const userGenres = genres;
    const userMovies = userData[1];
    console.log(
      "Editing profile with genres:",
      userGenres,
      "userMovies:",
      userMovies
    );

    navigate("/setup_profile", {
      state: {
        accExists: true,
        genres: userGenres,
        movies: userMovies,
        username: username,
      },
    });
  };

  const handleDeleteProfile = async () => {
    try {
      const url = "http://localhost:5050/delete_user";
      const response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error deleting profile:", error);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white flex">
      {/* Animated background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* LEFT SIDEBAR */}
      <aside className="hidden md:flex md:flex-col md:w-1/2 lg:w-2/5 p-8 border-r border-gray-800 bg-gray-800/30 backdrop-blur-2xl relative z-10 shadow-2xl">
        <div className="flex flex-col items-center space-y-6">
          {/* Profile Image */}
          <div className="relative">
            <img
              src={
                profilePic ||
                "https://cdn-icons-png.flaticon.com/512/149/149071.png"
              }
              alt="Profile"
              className="w-36 h-36 rounded-full object-cover border-4 border-indigo-500 shadow-indigo-600/40 shadow-lg hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Username + Bio */}
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-500 text-transparent bg-clip-text">
              {username}
            </h2>
            <p className="text-gray-400 italic text-sm">
              Cinephile & Story Enthusiast 🎬
            </p>
          </div>

          {/* Buttons */}
          <div className="w-full space-y-3">
            <button
              onClick={() => navigate("/home/watchlist")}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-2 rounded-lg shadow-md transition-all"
            >
              Watchlist
            </button>
            <button
              onClick={() => handleEditProfile()}
              className="w-full bg-gray-700/60 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg shadow-md transition-all"
            >
              ✏️ Edit Profile
            </button>
            <button
              onClick={() => {
                const confirmed = window.confirm(
                  "Are you sure you want to delete your account? This action cannot be undone."
                );
                if (confirmed) {
                  handleDeleteProfile();
                }
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-lg transition-colors duration-200"
            >
              Delete Account
            </button>
          </div>

          {/* USER STATS SECTION */}
          {/* USER STATS WITH CIRCULAR RATINGS */}
          <div className="w-full mt-6">
            <h3 className="text-xl font-bold text-indigo-400 mb-4">
              User Stats
            </h3>
            <div className="flex flex-col items-center">
              {/* Circular Stats Row */}
              <div className="flex flex-col items-center">
                {/* Heading */}
                <p className="text-sm uppercase tracking-widest text-gray-500 mb-2">
                  Highest Rated Movie
                </p>

                {/* Circular Rating */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <svg width={80} height={80}>
                      {/* Background Circle */}
                      <circle
                        cx={40}
                        cy={40}
                        r={32}
                        stroke="#4B5563"
                        strokeWidth="8"
                        fill="none"
                      />
                      {/* Progress Circle */}
                      <circle
                        cx={40}
                        cy={40}
                        r={32}
                        stroke="#6366F1"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={2 * Math.PI * 32}
                        strokeDashoffset={
                          2 * Math.PI * 32 -
                          ((userStats[1]?.[1] || 0) / 10) * 2 * Math.PI * 32
                        }
                        strokeLinecap="round"
                        transform="rotate(-90 40 40)"
                      />
                    </svg>

                    {/* Rating in the center */}
                    <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
                      {Number(userStats[1]?.[1])?.toFixed(1) || "N/A"}
                    </div>
                  </div>

                  {/* Movie Title */}
                  <p className="mt-3 text-sm text-center text-gray-300 truncate w-32">
                    {userStats[1]?.[0] || "Top Movie"}
                  </p>
                </div>
              </div>

              {/* Total Movies Rated Line */}
              <div className="mt-8 w-full text-center border-t border-gray-800 pt-6">
                <p className="text-sm uppercase tracking-widest text-gray-500 mb-2">
                  Total Movies Rated
                </p>
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text text-4xl font-extrabold drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">
                  {userStats[0] || 0}
                </span>
                <div className="mt-2 mx-auto h-1 w-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full opacity-60"></div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT PANEL */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto space-y-12 relative z-10">
        {/* Genres Section */}
        <section className="mt-8">
          <h3 className="text-2xl md:text-3xl font-semibold text-indigo-400 mb-5">
            Favorite Genres
          </h3>

          <div className="flex flex-wrap gap-3">
            {Object.keys(genres).map((g, i) => (
              <span
                key={i}
                className="px-4 py-2 bg-gradient-to-br from-indigo-600/40 to-purple-600/40 border border-indigo-400/40 rounded-full text-sm font-medium hover:scale-105 hover:from-indigo-500/60 hover:to-purple-500/60 transition-all duration-200 shadow-lg backdrop-blur-sm"
              >
                🎬 {g}
              </span>
            ))}
          </div>
        </section>

        {/* Movies Section */}
        <section>
          <h3 className="text-2xl md:text-3xl font-semibold text-indigo-400 mb-5">
            Favorite Movies
          </h3>
          <div className="flex flex-wrap justify-start gap-6">
            {userData[1].map((movie, i) => (
              <div
                key={i}
                className="group relative bg-gray-800/50 rounded-xl overflow-hidden shadow-lg transform hover:scale-[1.07] hover:shadow-indigo-600/30 transition-all duration-300"
                style={{ flex: "0 0 calc(33.333% - 1.5rem)" }} // 3 per row with gap
                onClick={() => handleMovieClick(movie.id)}
              >
                <img
                  src={`https://image.tmdb.org/t/p/w300${movie.poster}`}
                  alt={movie.title}
                  className="w-full h-80 object-cover group-hover:opacity-90 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3">
                  <p className="text-sm font-semibold text-center text-indigo-300">
                    {movie.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
export default Profile;
