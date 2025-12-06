import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useParams } from "react-router";
// import { useQuery } from "@tanstack/react-query";

interface APIProps {
  recs: string[];
}

interface MovieProps {
  title: string;
  poster_path: string;
  overview: string;
  release_date: string;
  id: number;
}

interface handleClickProps {
  title: string;
  id: number;
}

function API({ recs }: APIProps) {
  const [detailsList, setDetailsList] = useState<MovieProps[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { searched } = useParams();
  const initialMessage = "Looking for similar movies...";
  const [loadingMessage, setLoadingMessage] = useState(initialMessage);

  useEffect(() => {
    let timer: number;

    if (detailsList.length === 0) {
      // Reset to initial message immediately
      setLoadingMessage(initialMessage);

      // After 4 seconds, update the message
      timer = setTimeout(() => {
        setLoadingMessage("Get some Popcorn while I search");
      }, 4000);

      timer = setTimeout(() => {
        setLoadingMessage("Almost There!!");
      }, 6000);
    }

    return () => clearTimeout(timer); // cleanup previous timer
  }, [detailsList]);

  const posters = async () => {
    try {
      const query = recs
        .map((title) => `movies=${encodeURIComponent(title)}`)
        .join("&");
      console.log(query);
      const url = `https://api.popcornpick.app/search_recommended?${query}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDetailsList(data.details);
    } catch (err) {
      console.error("Fetch error: ", err);
    }
  };

  const problemMsg = recs.length === 0 ? "Please Re-enter movie name" : "";

  useEffect(() => {
    if (recs.length > 1) {
      posters();
    } else {
      setDetailsList([]);
    }
  }, [recs]);

  useEffect(() => {
    posters();
  }, []);

  const handleClick = ({ title, id }: handleClickProps) => {
    navigate(`/home/movie/${id}`, {
      state: { from: location.pathname, title, id, searched },
    });
  };

  return (
    <div className="container">
      {recs.length == 0 && problemMsg && (
        <div className="text-center bg-black text-gray-400 mt-4 flex flex-col items-center">
          <p className="mt-2">{problemMsg}</p>
        </div>
      )}
      {detailsList.length === 0 ? (
        <div className="text-center bg-black text-gray-400 mt-4 flex flex-col items-center">
          <div className="w-7 h-7 border-4 border-gray-600 border-t-white rounded-full animate-spin"></div>
          <p className="mt-2">{loadingMessage}</p>
        </div>
      ) : (
        detailsList.map((movie, index) => (
          <div
            className="cell"
            onClick={() => handleClick({ title: movie.title, id: movie.id })}
          >
            <img
              key={index}
              src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
            />
            <p>{movie.title}</p>
          </div>
        ))
      )}
    </div>
  );
}
export default API;
