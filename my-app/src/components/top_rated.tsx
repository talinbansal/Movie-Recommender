import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface TopRatedProps {
  title: string;
  poster_path: string;
  movie_id: number;
}

function TopRated() {
  const [page, setPage] = useState(1);
  const [topRated, setTopRated] = useState<TopRatedProps[]>([]);

  const navigate = useNavigate();

  const getTopRated = async () => {
    try {
      const url = `http://localhost:5050/more_top_rated?page_num=${page}`;
      const resp = await fetch(url);

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const data = await resp.json();
      setTopRated(data.rated);
      console.log(data.rated);
    } catch (error) {
      console.error("Error fetching top rated movies:", error);
    }
  };

  useEffect(() => {
    getTopRated();
  }, [page]);

  const handleClick = ({ id }: { id: number }) => {
    navigate(`/home/movie/${id}`, {
      state: { from: location.pathname, id: id },
    });
  };

  return (
    <>
      <div className="container">
        {topRated.map((movie, index) => (
          <div
            className="cell"
            onClick={() => handleClick({ id: movie.movie_id })}
          >
            <img
              key={index}
              src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
            />
            <p>{movie.title}</p>
          </div>
        ))}
      </div>
      {/* Pagination limited to 3 pages */}
      <div className="flex justify-center items-center space-x-2 mt-6">
        {[1, 2, 3].map((num) => (
          <button
            key={num}
            onClick={() => setPage(num)}
            className={`px-3 py-1 rounded ${
              page === num
                ? "bg-yellow-400 text-black"
                : "bg-gray-700 text-white"
            }`}
          >
            {num}
          </button>
        ))}
      </div>
    </>
  );
}

export default TopRated;
