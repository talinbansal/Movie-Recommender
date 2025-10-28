import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

interface NavBarProps {
  setRecs: React.Dispatch<React.SetStateAction<string[]>>;
}

function NavBar({ setRecs }: NavBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [loadedGenres, setLoadedGenres] = useState({});
  const [user, setUser] = useState("");
  const [profilePic, setProfilePic] = useState<string | null>();
  const navigate = useNavigate();

  const genres = async () => {
    try {
      const url = "https://api.popcornpick.app/load_genres";
      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUser(data.user);
      setLoadedGenres(data.genres);
    } catch (error) {
      console.error("Error fetching genres:", error);
    }
  };

  const fetchUpload = async () => {
    try {
      const url = `https://api.popcornpick.app/fetch_profile_pic`;
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

  const handleLogout = async () => {
    try {
      const url = "https://api.popcornpick.app/logout";
      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const msg = await response.json();
      alert(msg.message);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  useEffect(() => {
    genres();
    fetchUpload();
  }, [open]);

  return (
    <>
      {/* Toggle Button */}
      <button
        className="fixed top-4 left-4 z-50 p-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          // X icon
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          // Hamburger icon
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-gray-800 text-white transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out z-40`}
      >
        <div className="p-4 flex flex-col h-full">
          {/* Main Menu */}
          <ul className="flex flex-col space-y-4 mt-12">
            <li
              className="cursor-pointer hover:text-yellow-400"
              onClick={() => {
                console.log("Home clicked");
                setRecs([]);
                navigate("/home", { replace: true });
              }}
            >
              Home
            </li>
            <li
              className="cursor-pointer hover:text-yellow-400"
              onClick={() => navigate("/home/watchlist")}
            >
              Watchlist
            </li>
            <li className="cursor-pointer">
              <div
                className="flex items-center hover:text-yellow-400"
                onClick={() => setOpen((prev) => !prev)}
              >
                Genres
                <svg
                  className={`w-4 h-4 inline-block ml-2 transform transition-transform ${
                    open ? "rotate-180" : "rotate-0"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              {open && (
                <ul className="mt-2 ml-4 space-y-2 max-h-40 overflow-y-auto p-2">
                  {Object.entries(loadedGenres).map(([key, val]) => (
                    <li
                      key={val as number}
                      className="cursor-pointer hover:text-yellow-400"
                      onClick={() =>
                        navigate(`/home/genres/${key.toLowerCase()}`, {
                          state: { genreID: val as number },
                        })
                      }
                    >
                      {key}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          </ul>

          {/* Spacer pushes bottom items down */}
          <div className="mt-auto flex flex-col space-y-4">
            {/* Logout Button */}
            <div
              className="flex items-center cursor-pointer hover:text-yellow-400 px-4 py-2"
              onClick={handleLogout}
            >
              Logout
            </div>

            {/* Profile Section */}
            <div
              className="flex items-center space-x-3 p-4 border-t border-gray-700 cursor-pointer"
              onClick={() => navigate("/home/profile", { state: { user } })}
            >
              <img
                src={
                  profilePic ||
                  "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                }
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
              />
              <span>{user}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  );
}

export default NavBar;
