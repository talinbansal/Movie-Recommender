import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

interface movieProps {
  poster: string;
  title: string;
  id: number;
}

function ProfileSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.username;
  const pass = location.state?.password;
  const accExists = location.state?.accExists;
  const userGenres = location.state?.genres;
  const userMovies = location.state?.movies;
  const [step, setStep] = useState(1);
  const [loadedGenres, setLoadedGenres] = useState({});
  const [selectedGenres, setSelectedGenres] = useState<{
    [key: string]: number;
  }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [favoriteMovies, setFavoriteMovies] = useState<movieProps[]>([]);
  const [message, setMessage] = useState("");
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const genres = async () => {
      try {
        const url = "http://localhost:5050/load_genres";
        const response = await fetch(url, { credentials: "include" });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setLoadedGenres(data.genres);
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };
    genres();
  }, []);

  const toggleGenre = (genre: string, genre_id: number) => {
    setSelectedGenres((prev) => {
      const updated = { ...prev };
      if (updated[genre]) {
        delete updated[genre];
      } else {
        updated[genre] = genre_id;
      }
      return updated;
    });
  };

  useEffect(() => {
    if (accExists) {
      setSelectedGenres(userGenres);
      setFavoriteMovies(userMovies);
    }
  }, []);

  const handleContinue = () => {
    console.log("Selected Genres:", selectedGenres);
    if (Object.keys(selectedGenres).length === 0) {
      alert("Please select at least one genre to continue.");
      return;
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    try {
      const url = `http://localhost:5050/search_fav_movie?movie=${searchTerm}`;
      const resp = await fetch(url);

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }
      const data = await resp.json();
      console.log("Works");
      setSearchResults(data.movie);
    } catch (error) {
      console.error("Error searching movies:", error);
    }
  };

  const toggleFavorite = (movie: movieProps) => {
    setFavoriteMovies((prev) => {
      const exists = prev.some((m) => m.title === movie.title);
      if (exists) {
        return prev.filter((m) => m.title !== movie.title);
      } else {
        return [...prev, movie];
      }
    });
  };

  const handleSetUp = async () => {
    try {
      const formData = new FormData();
      formData.append("file", selectedFile as Blob);
      formData.append("username", user);
      formData.append("password", pass);
      formData.append("setup", "true");
      formData.append("genres", JSON.stringify(selectedGenres));
      formData.append("movies", JSON.stringify(favoriteMovies));

      const url = `http://localhost:5050/add_user_complete`;
      const response = await fetch(url, { method: "POST", body: formData });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMessage(data.message);
    } catch (err) {
      console.error("Fetch Error:", err);
    }

    if (message == "added") {
      navigate("/", {
        state: {
          username: user,
          genres: selectedGenres,
          movies: favoriteMovies,
        },
      });
    } else if (message == "updated") {
      navigate("/home/profile");
    }
  };

  const handleSkip = async () => {
    try {
      const url = `http://localhost:5050/add_user?username=${user}&password=${pass}&setup=${true}&genres=${encodeURIComponent(
        JSON.stringify(selectedGenres)
      )}&movies=${encodeURIComponent(JSON.stringify(favoriteMovies))}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMessage(data.message);
    } catch (err) {
      console.error("Fetch Error:", err);
    }

    if (message == "added") {
      navigate("/", {
        state: {
          username: user,
          genres: selectedGenres,
          movies: favoriteMovies,
        },
      });
    }
  };

  const handleSkipExists = async () => {
    try {
      const url = `http://localhost:5050/add_user?username=${user}&setup=exists&genres=${encodeURIComponent(
        JSON.stringify(selectedGenres)
      )}&movies=${encodeURIComponent(JSON.stringify(favoriteMovies))}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMessage(data.message);
    } catch (err) {
      console.error("Fetch Error:", err);
    }

    if (message == "updated") {
      navigate("/home/profile");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const profilePic = e.target.files?.[0] ?? null;
    setSelectedFile(profilePic);
    if (profilePic) {
      setProfilePic(URL.createObjectURL(profilePic));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center text-white px-6">
      <div className="w-full text-center">
        {accExists ? (
          <h1 className="text-4xl font-bold mb-4">
            Welcome, What Edits do you Want to Make?
          </h1>
        ) : (
          <h1 className="text-4xl font-bold mb-4">Welcome, {user} 👋</h1>
        )}

        {step === 1 && (
          <>
            <p className="text-gray-400 mb-8">
              Let’s personalize your experience. Choose your favorite genres
              below:
            </p>

            {/* Genre Selection Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10">
              {Object.keys(loadedGenres).length === 0 ? (
                <p className="col-span-full text-gray-500">Loading genres...</p>
              ) : (
                Object.entries(loadedGenres).map(([genre, genre_id]) => (
                  <button
                    key={genre_id as number}
                    onClick={() => toggleGenre(genre, genre_id as number)}
                    className={`rounded-xl px-4 py-3 font-semibold transition-all duration-300 
                  ${
                    selectedGenres[genre]
                      ? "bg-indigo-600 scale-105 shadow-lg shadow-indigo-500/30"
                      : "bg-gray-800 hover:bg-gray-700"
                  }`}
                  >
                    {genre}
                  </button>
                ))
              )}
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              className="bg-indigo-600 hover:bg-indigo-700 px-8 py-3 rounded-lg text-lg font-semibold transition duration-200 shadow-lg shadow-indigo-500/30"
            >
              Continue →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-gray-400 mb-8 text-center text-lg">
              Let’s personalize your experience. Search & Add Your Favorite
              Movies!
            </p>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <input
                type="text"
                placeholder="Search movies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 w-80 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                onClick={handleSearch}
                className="bg-indigo-600 px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                Search
              </button>
            </div>

            {/* Main Content Section */}
            <div className="flex flex-col lg:flex-row gap-10 w-full max-w-7xl mx-auto">
              {/* LEFT SIDE - Search Results */}
              <div className="lg:w-1/3 bg-gray-900/40 p-6 rounded-xl border border-gray-800">
                <h2 className="text-2xl font-semibold mb-5 text-gray-200 border-b border-gray-700 pb-2">
                  Search Results
                </h2>

                {searchResults.length > 0 ? (
                  <div className="flex justify-center mb-10">
                    {searchResults.map((movie) => (
                      <div
                        key={movie.id}
                        className={`relative cursor-pointer transition-transform hover:scale-105 ${
                          favoriteMovies.some((m) => m.title === movie.title)
                            ? "ring-4 ring-indigo-500"
                            : ""
                        }`}
                        onClick={() =>
                          toggleFavorite({
                            poster: movie.poster_path,
                            title: movie.title,
                            id: movie.id,
                          })
                        }
                      >
                        <div className="w-80 h-[28rem] overflow-hidden rounded-xl shadow-lg shadow-indigo-500/20">
                          <img
                            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                            alt={movie.title}
                            className="w-full h-full object-cover object-center"
                          />
                        </div>
                        <p className="mt-4 text-lg text-center text-gray-200 font-semibold">
                          {movie.title}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center mt-6">
                    No search results yet.
                  </p>
                )}
              </div>

              {/* RIGHT SIDE - Favorites */}
              <div className="w-full lg:w-2/3 bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg">
                <h2 className="text-2xl font-semibold mb-5 text-gray-200 border-b border-gray-700 pb-2">
                  🎬 Favorite Movies
                </h2>

                {favoriteMovies.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[550px] overflow-y-auto pr-2">
                    {favoriteMovies.map((movie, index) => (
                      <div
                        key={index}
                        className="relative bg-gray-900 rounded-lg p-2 hover:bg-gray-700 transition flex flex-col items-center"
                      >
                        <div className="w-full h-48 overflow-hidden rounded-md mb-2">
                          <img
                            src={`https://image.tmdb.org/t/p/w300${movie.poster}`}
                            alt={movie.title}
                            className="w-full h-full object-cover object-center"
                          />
                        </div>
                        <p className="text-xs text-gray-300 text-center truncate mb-1">
                          {movie.title}
                        </p>
                        <button
                          onClick={() => toggleFavorite(movie)}
                          className="text-red-400 hover:text-red-500 text-xs font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center">
                    No movies selected yet.
                  </p>
                )}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-center gap-6 mt-10">
              <button
                onClick={handleBack}
                className="bg-gray-700 hover:bg-gray-600 px-8 py-3 rounded-lg text-lg font-semibold transition duration-200 shadow-md shadow-gray-800/30"
              >
                ← Back
              </button>
              <button
                onClick={handleContinue}
                className="bg-indigo-600 hover:bg-indigo-700 px-8 py-3 rounded-lg text-lg font-semibold transition duration-200 shadow-lg shadow-indigo-500/30"
              >
                Continue →
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex flex-col items-center mt-10">
              <h1 className="text-3xl font-bold mb-8">Profile Picture</h1>

              {/* Profile Image with Upload Button */}
              <div className="relative w-36 h-36">
                <img
                  src={
                    profilePic ||
                    "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                  }
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover border-4 border-indigo-500 shadow-lg shadow-indigo-600/40 hover:scale-105 transition-transform duration-300"
                />
                <label
                  htmlFor="file-upload"
                  className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-2 cursor-pointer shadow-md transition-all flex items-center justify-center"
                  title="Upload photo"
                >
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  📷
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-6 mt-10">
                <button
                  onClick={handleBack}
                  className="bg-gray-700 hover:bg-gray-600 px-8 py-3 rounded-lg text-lg font-semibold transition duration-200 shadow-md shadow-gray-800/30"
                >
                  ← Back
                </button>

                {!profilePic && (
                  <>
                    <button
                      onClick={accExists ? handleSkipExists : handleSkip}
                      className="px-8 py-3 rounded-lg text-lg font-semibold border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition duration-200"
                    >
                      Skip for now
                    </button>
                  </>
                )}

                <button
                  onClick={handleSetUp}
                  className="bg-indigo-600 hover:bg-indigo-700 px-8 py-3 rounded-lg text-lg font-semibold transition duration-200 shadow-lg shadow-indigo-500/30
             disabled:bg-gray-500 disabled:shadow-none disabled:cursor-not-allowed disabled:text-gray-300"
                  disabled={!profilePic}
                >
                  Finish Set Up →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProfileSetup;
