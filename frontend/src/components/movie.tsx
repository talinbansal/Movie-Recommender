import { useLocation, useNavigate, useParams } from "react-router";
import { useState, useEffect, useRef } from "react";

import Banner from "./show_banner.tsx";

interface dataProps {
  title: string;
  poster_path: string;
  backdrop_path: string;
  overview: string;
  release_date: string;
  director: string;
  genres: string[];
  id: number;
}

interface storeMovieProps {
  title: string;
  poster_path: string;
  genres: string[];
  id: number;
}

interface commentsProps {
  username: string;
  comment_text: string;
  created_at: string;
}

function Movie() {
  const location = useLocation();
  const [title, setTitle] = useState("");
  const from = location.state?.from || "/home";
  const genreId = location.state?.genreId || null;

  const navigate = useNavigate();
  const { id } = useParams();

  const bannerRef = useRef<{ triggerBanner: (msg: string) => void }>(null);

  const [data, setData] = useState<dataProps[]>([]);
  const [comment, setComment] = useState<string>("");
  const [comments, setComments] = useState<commentsProps[]>([]); // Array to hold comments
  const [user, setUser] = useState<string>("");
  const [watchlist, setWatchlist] = useState(false); // To toggle between add/remove buttons
  const [avgRating, setAvgRating] = useState(0); // To hold avg rating
  const [rating, setRating] = useState(0); // To hold user's rating

  useEffect(() => {
    // console.log("Movies Page Loaded");
    getTitle();
  }, []);

  useEffect(() => {
    if (title != "") {
      getData();
    }
  }, [title]);

  // API calls to Fetch Movie Details
  const getTitle = async () => {
    try {
      const url = `https://api.popcornpick.app/get_title?id=${id}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTitle(data.title);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const getData = async () => {
    const url = `https://api.popcornpick.app/search_recommended?movies=${title}`;
    const response = await fetch(url);

    try {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setData(data.details);
      console.log("Movie details fetched:", data.details);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  // API calls to Add/Remove a Movie from Watchlist
  const storeMovie = async ({
    title,
    poster_path,
    genres,
    id,
  }: storeMovieProps) => {
    try {
      const url = `https://api.popcornpick.app/add_to_watchlist?title=${title}&poster_path=${poster_path}&genres=${genres}&id=${id}`;
      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      bannerRef.current?.triggerBanner("Movie Added to Watchlist!");
      setWatchlist(true);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const removeMovie = async ({
    title,
    poster_path,
    genres,
  }: storeMovieProps) => {
    try {
      const url = `https://api.popcornpick.app/remove_from_watchlist?title=${title}&poster_path=${poster_path}&genres=${genres}`;
      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setWatchlist(false);
      bannerRef.current?.triggerBanner("Movie Removed from Watchlist!");
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  // API call to Check if Movie is Already in Watchlist
  const checkDB = async (poster_path: string) => {
    try {
      const url = `https://api.popcornpick.app/check_watchlist?poster_path=${poster_path}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setWatchlist(data.exists);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  // API calls to Fetch and Update Comments
  const updateComments = async () => {
    try {
      const url = `https://api.popcornpick.app/update_comments?comment=${comment}&movie_id=${id}`;
      const resp = await fetch(url, { credentials: "include" });

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const data = await resp.json();
      console.log("Comments updated:", data.message);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const fetchComments = async () => {
    try {
      const url = `https://api.popcornpick.app/fetch_comments?movie_id=${id}`;
      const resp = await fetch(url, { credentials: "include" });

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const data = await resp.json();
      setUser(data.user);
      setComments(data.comments);
      console.log("Comments fetched:", data.comments);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  // API call to Store Movie Rating
  const updateUserRating = async (newRating: Number) => {
    try {
      const url = `https://api.popcornpick.app/update_user_rating?movie_id=${id}&rating=${newRating}`;
      const resp = await fetch(url, { credentials: "include" });

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const data = await resp.json();
      console.log("User rating updated:", data.message);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const updateAvgRating = async () => {
    try {
      const url = `https://api.popcornpick.app/update_avg_rating?movie_id=${id}`;
      const resp = await fetch(url, { credentials: "include" });

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const data = await resp.json();
      console.log("User rating updated:", data.message);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  // API call to Fetch Movie Ratings
  const fetchRating = async () => {
    try {
      const url = `https://api.popcornpick.app/fetch_rating?movie_id=${id}`;
      const resp = await fetch(url, { credentials: "include" });

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const data = await resp.json();
      setRating(data.rating);
      setAvgRating(Number(data.avg_rating));
      console.log("User rating fetched:", data.rating);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  // Fetch comments when component mounts
  useEffect(() => {
    fetchComments();
    fetchRating();
  }, []);

  // Handle posting a new comment
  const handlePostComment = () => {
    const structuredComment = {
      username: user,
      comment_text: comment,
      created_at: new Date().toLocaleString(),
    };
    setComments((prevComments) => [...prevComments, structuredComment]);
    setComment("");
    updateComments();
  };

  // Check if movie is in watchlist when data is fetched
  useEffect(() => {
    if (data.length > 0) {
      checkDB(data[0].poster_path);
    }
  }, [data]);

  const handleRating = (newRating: Number) => {
    updateUserRating(newRating);
    updateAvgRating();
  };

  return (
    <>
      <div>
        <button
          onClick={() => navigate(from, { state: { genreID: genreId } })}
          className="ml-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <span className="text-2xl leading-none">←</span>
          <span className="text-sm font-medium">Back</span>
        </button>
        {data.map((movie, index) => (
          <div
            key={movie.title}
            className="relative w-full min-h-screen bg-black flex items-center justify-center overflow-hidden animate-fadeIn"
            style={{
              animationDelay: `${index * 0.1}s`,
              backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Overlay for blur + tint */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md"></div>

            <Banner ref={bannerRef} />
            <div className="space-y-16">
              {/* Centered movie content */}
              <div className="relative z-10 flex flex-col md:flex-row gap-12 items-start max-w-7xl w-full px-10 py-20">
                {/* Poster */}
                <div className="group/poster flex-shrink-0">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    className="rounded-2xl shadow-2xl w-[22rem] h-auto transition-transform duration-500 group-hover/poster:scale-105 group-hover/poster:shadow-[0_0_30px_#fff3]"
                  />
                </div>

                {/* Info Section */}
                <div className="flex-1 text-white">
                  <h1
                    className="text-5xl font-extrabold mb-6 tracking-wide 
                    text-white transition-all duration-500
                    group-hover/poster:text-transparent 
                    group-hover/poster:bg-clip-text 
                    group-hover/poster:bg-gradient-to-r 
                    group-hover/poster:from-pink-500 
                    group-hover/poster:via-red-500 
                    group-hover/poster:to-yellow-500"
                  >
                    {movie.title}
                  </h1>

                  <div className="space-y-2 mb-6 text-gray-400">
                    <p className="italic text-sm">
                      🎬 Release Date:{" "}
                      <span className="text-gray-300">
                        {movie.release_date}
                      </span>
                    </p>
                    <p className="italic text-sm">
                      🎥 Director:{" "}
                      <span className="text-gray-300">{movie.director}</span>
                    </p>
                    <p className="italic text-sm">
                      🏷 Genres:{" "}
                      <span className="text-gray-300">
                        {Array.isArray(movie.genres)
                          ? movie.genres.join(", ")
                          : movie.genres}
                      </span>
                    </p>

                    {/* IMDb-style rating */}
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center bg-yellow-500 text-black font-bold px-2 py-1 rounded-md">
                        <span className="text-lg">★</span>
                        <span className="ml-1 text-sm">
                          {avgRating.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-800 ml-1">/10</span>
                      </div>
                    </div>

                    {/* User rating input */}
                    <div className="flex items-center space-x-2">
                      <p className="text-gray-300 text-sm">Your Rating:</p>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                        onBlur={() => {
                          if (rating >= 0 && rating <= 10) handleRating(rating);
                        }}
                        className="bg-gray-800 text-white w-20 px-2 py-1 rounded-lg border border-gray-700 focus:ring-2 focus:ring-yellow-500 focus:outline-none text-center"
                        placeholder="0–10"
                      />
                    </div>
                  </div>

                  <p className="mb-6 text-gray-300 leading-relaxed text-lg max-w-3xl">
                    {movie.overview}
                  </p>

                  {/* CTA */}
                  {watchlist ? (
                    <button
                      className="px-6 py-3 rounded-xl bg-[#e50914] hover:bg-[#b00610] transition-colors shadow-lg shadow-[#e50914]/30 font-semibold text-lg"
                      onClick={() =>
                        removeMovie({
                          title: movie.title,
                          poster_path: movie.poster_path,
                          genres: movie.genres,
                          id: movie.id,
                        })
                      }
                    >
                      Remove From Watchlist
                    </button>
                  ) : (
                    <button
                      className="px-6 py-3 rounded-xl bg-[#e50914] hover:bg-[#b00610] transition-colors shadow-lg shadow-[#e50914]/30 font-semibold text-lg"
                      onClick={() =>
                        storeMovie({
                          title: movie.title,
                          poster_path: movie.poster_path,
                          genres: movie.genres,
                          id: movie.id,
                        })
                      }
                    >
                      Add to Watchlist
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-black text-white p-6 rounded-xl mx-auto space-y-4">
        {/* Comment input */}
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Enter a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="flex-1 bg-gray-800 text-white placeholder-gray-400 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handlePostComment}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
          >
            Post
          </button>
        </div>
        {/* 💬 Comments Section */}
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-white mb-2">Comments</h2>

          {comments.length === 0 ? (
            <p className="text-gray-400 text-sm italic">
              No comments yet. Be the first to share your thoughts!
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((c, index) => (
                <div
                  key={index}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition duration-200"
                >
                  {/* Username and Time */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-semibold text-sm">
                      {c.username}
                    </p>
                    <p className="text-gray-500 text-xs">{c.created_at}</p>
                  </div>

                  {/* Comment Text */}
                  <p className="text-gray-200 text-sm leading-relaxed">
                    {c.comment_text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Movie;
