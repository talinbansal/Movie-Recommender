import { useState } from "react";
import { useNavigate } from "react-router";

interface SearchProps {
  setRecs: React.Dispatch<React.SetStateAction<string[]>>;
  recs: string[];
}

function Search({ setRecs }: SearchProps) {
  const [movie, setMovie] = useState("");
  const navigate = useNavigate();

  //  API request (rewrite)
  const getRecommendations = async (movie: string) => {
    try {
      const url = `https://api.popcornpick.app/recommend?title=${movie}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRecs(data.recommendations);
      console.log(data.recommendations);
    } catch (err) {
      console.error("Fetch error: ", err);
    }
  };

  return (
    <>
      <div className="search-container">
        <input
          name="movie"
          type="text"
          placeholder="Find Similar Movies..."
          value={movie}
          onChange={async (e) => {
            setMovie(e.target.value);
          }}
          onKeyDown={(e) => {
            console.log("Key pressed:", e.key); // 👀 check actual key
            if (e.key === "Enter") {
              setRecs([]);
              navigate(`/home/search/${movie}`);
              getRecommendations(movie);
            }
          }}
          required
        />
      </div>
    </>
  );
}

export default Search;
