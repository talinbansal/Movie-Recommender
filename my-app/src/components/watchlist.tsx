import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface WatchListProps {
  title: string;
  poster_path: string;
  genres: string;
  id: number;
}

function WatchList() {
  const [items, setItems] = useState<WatchListProps[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchMovies = async () => {
    try {
      const url = "http://localhost:5050/get_watchlist";
      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setItems(data.watchlist);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const handleClick = (id: number) => {
    navigate(`/home/movie/${id}`, { state: { from: location.pathname } });
  };

  return (
    <div className="bg-black w-full min-h-screen text-white px-8 py-12 flex flex-col">
      <h1 className="text-6xl font-extrabold mb-16 text-center tracking-wide">
        My Watchlist
      </h1>

      <div className="flex items-end space-x-8 overflow-x-auto scrollbar-hide py-8">
        {items.map((item, index) => (
          <div
            key={index}
            className="relative flex-shrink-0 w-[300px] sm:w-[400px] md:w-[500px] lg:w-[550px] h-[70vh] rounded-3xl overflow-hidden group cursor-pointer transition-transform duration-500 hover:scale-105 hover:shadow-2xl"
            onClick={() => handleClick(item.id)}
          >
            <img
              src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 brightness-90 group-hover:brightness-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-6 flex flex-col justify-end">
              <p className="text-2xl sm:text-3xl font-extrabold">
                {item.title}
              </p>
              <p className="text-lg sm:text-xl text-gray-300 mt-2">
                {item.genres}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WatchList;
