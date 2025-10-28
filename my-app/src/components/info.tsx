import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface InfoProps {
  title: string;
  backdrop_path: string;
  id: number;
}

interface TrendingProps {
  title: string;
  poster_path: string;
  movie_id: number;
}

function Info() {
  const [info, setInfo] = useState<InfoProps[]>([]);
  const [trending, setTrending] = useState<TrendingProps[]>([]);
  const [rated, setRated] = useState<TrendingProps[]>([]);
  const [current, setCurrent] = useState(0);

  const navigate = useNavigate();

  const getInfo = async () => {
    try {
      const url = "https://www.popcornpick.app/get_latest_releases";
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setInfo(data.latest);
      console.log(data.latest);
    } catch (error) {
      console.error("Error fetching latest movies:", error);
    }
  };

  const getTrending = async () => {
    try {
      const url = `https://www.popcornpick.app/trending`;
      const resp = await fetch(url);

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const data = await resp.json();
      setTrending(data.trending);
      console.log(data.trending);
    } catch (error) {
      console.error("Error fetching trending movies:", error);
    }
  };

  const getTopRated = async () => {
    try {
      const url = `https://www.popcornpick.app/top_rated`;
      const resp = await fetch(url);

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const data = await resp.json();
      setRated(data.rated);
      console.log(data.rated);
    } catch (error) {
      console.error("Error fetching top rated movies:", error);
    }
  };

  useEffect(() => {
    getInfo();
    getTrending();
    setTimeout(() => {
      getTopRated();
    }, 300);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % info.length);
    }, 5000); // 5 sec autoplay
    return () => clearInterval(interval);
  }, [info.length]);

  const handleClick = (id: number) => {
    navigate(`/home/movie/${id}`, { state: { from: location.pathname } });
  };

  return (
    <>
      <div className="bg-black min-h-[780px] text-white px-6 py-4">
        <h1 className="text-2xl font-extrabold mb-6 text-white drop-shadow-lg">
          Now Playing
        </h1>

        <div className="relative w-full overflow-hidden">
          {/* Carousel container */}
          <div
            className="flex transition-transform duration-700"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {info.map((item, index) => (
              <div
                key={index}
                className="w-full flex-shrink-0 cursor-pointer relative"
                onClick={() => handleClick(item.id)}
              >
                {/* Use backdrop */}
                <img
                  src={`https://image.tmdb.org/t/p/original${item.backdrop_path}`}
                  alt={item.title}
                  className="w-full h-[800px] object-cover" // increased height
                />

                {/* Overlay */}
                <div className="absolute inset-0 flex items-end p-6">
                  <p className="text-4xl font-extrabold text-white drop-shadow-xl">
                    {item.title}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Arrows & numeric indicator */}
          <div className="absolute bottom-4 w-full flex justify-center items-center gap-4 text-white text-lg">
            <button
              onClick={() =>
                setCurrent((prev) => (prev === 0 ? info.length - 1 : prev - 1))
              }
              className="px-2 py-1"
            >
              &lt;
            </button>

            <span>
              {current + 1} / {info.length}
            </span>

            <button
              onClick={() =>
                setCurrent((prev) => (prev === info.length - 1 ? 0 : prev + 1))
              }
              className="px-2 py-1"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      <div className="bg-black text-white px-6">
        <h1 className="text-2xl font-bold mb-6 pt-16">
          What Everyone is Watching
        </h1>

        <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
          {trending.map((item, index) => (
            <div
              key={index}
              className="relative min-w-[200px] rounded-xl overflow-hidden group"
              onClick={() => handleClick(item.movie_id)}
            >
              <img
                src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                alt={item.title}
                className="w-full h-72 object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end">
                <p className="text-lg font-semibold">{item.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-black mb-10 text-white px-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6 pt-16">
          <h1 className="text-2xl font-bold">Top Rated</h1>
          <button
            onClick={() => navigate("/home/top_rated")} // optional route
            className="text-lg text-gray-300 hover:text-white transition-colors"
          >
            See more &gt;
          </button>
        </div>

        {/* Carousel row */}
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
          {rated.map((item, index) => (
            <div
              key={index}
              className="relative min-w-[200px] rounded-xl overflow-hidden group"
              onClick={() => handleClick(item.movie_id)}
            >
              <img
                src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                alt={item.title}
                className="w-full h-72 object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end">
                <p className="text-lg font-semibold">{item.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default Info;
