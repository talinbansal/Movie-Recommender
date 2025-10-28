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
  const initialMessage = "Fetching similar movies...";
  const [loadingMessage, setLoadingMessage] = useState(initialMessage);

  useEffect(() => {
    let timer: number;

    if (detailsList.length === 0) {
      // Reset to initial message immediately
      setLoadingMessage(initialMessage);

      // After 4 seconds, update the message
      timer = setTimeout(() => {
        setLoadingMessage("Sorry, I'm looking for the best ones");
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
      // console.log(data.details);
    } catch (err) {
      console.error("Fetch error: ", err);
    }
  };

  useEffect(() => {
    if (recs.length > 1) {
      posters();
    } else {
      setDetailsList([]);
    }
  }, [recs]);

  useEffect(() => {
    console.log(recs);
    posters();
  }, []);

  const handleClick = ({ title, id }: handleClickProps) => {
    // console.log(title, id);
    navigate(`/home/movie/${id}`, {
      state: { from: location.pathname, title, id, searched },
    });
  };

  return (
    <div className="container">
      {detailsList.length === 0 ? (
        <p className="text-center bg-black text-gray-400 mt-4">
          {loadingMessage}
        </p>
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
