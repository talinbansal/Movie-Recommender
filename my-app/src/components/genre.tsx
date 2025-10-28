import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface MovieProps {
  title: string;
  poster_path: string;
  id: number;
}

interface handleClickProps {
  id: number;
}

function Genre() {
  const location = useLocation();
  const navigate = useNavigate();
  const genreId = location.state?.genreID;
  console.log("Genre ID:", genreId);
  const [moviesByGenre, setMoviesByGenre] = useState<MovieProps[]>([]);
  const [pageNum, setPageNum] = useState(1);

  const fetchMovies = async () => {
    try {
      const url = `https://www.popcornpick.app/genre_sort?genre=${genreId}&page=${pageNum}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMoviesByGenre(data.by_genre);
      console.log(data.by_genre);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, [genreId, pageNum]);

  useEffect(() => {
    fetchMovies();
  }, []);

  const handleClick = ({ id }: handleClickProps) => {
    navigate(`/home/movie/${id}`, {
      state: { from: location.pathname, id: id, genreId: genreId },
    });
  };

  return (
    <>
      <div className="container">
        {moviesByGenre.map((movie, index) => (
          <div className="cell" onClick={() => handleClick({ id: movie.id })}>
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
        {[1, 3, 5].map((num) => (
          <button
            key={num}
            onClick={() => setPageNum(num)}
            className={`px-3 py-1 rounded ${
              pageNum === num
                ? "bg-yellow-400 text-black"
                : "bg-gray-700 text-white"
            }`}
          >
            {num == 1 ? 1 : num == 3 ? 2 : 3}
          </button>
        ))}
      </div>
    </>
  );
}

export default Genre;
