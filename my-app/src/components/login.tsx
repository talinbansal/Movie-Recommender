import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface loginProps {
  username: string;
  password: string;
}

interface createProps {
  username: string;
  password: string;
}

function Log() {
  const navigate = useNavigate();
  const [validity, setValidity] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const checkLogin = async ({ username, password }: loginProps) => {
    try {
      const url = `https://api.popcornpick.app/search_user?username=${username}&password=${password}`;
      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Response Data:", data);
      checkStatus(data.exists);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  const checkStatus = (data: any) => {
    if (data) {
      setValidity(true);
    } else {
      alert("Invalid username or password");
    }
  };

  useEffect(() => {
    if (validity === true) {
      setTimeout(() => navigate("/home", { replace: true }), 100);
    }
  }, [validity]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="w-full max-w-sm rounded-2xl bg-gray-900/80 p-8 shadow-xl backdrop-blur-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-white">
          Login
        </h1>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            required
          />
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="space-y-4 w-full">
            <button
              onClick={() => checkLogin({ username, password })}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition duration-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Login
            </button>

            {/* Divider with "OR" */}
            <div className="flex items-center justify-center my-2">
              <div className="flex-grow border-t border-gray-600"></div>
              <span className="mx-3 text-gray-400 font-medium text-sm">OR</span>
              <div className="flex-grow border-t border-gray-600"></div>
            </div>

            <button
              onClick={() => navigate("/create_account")}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition duration-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Create() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [conPassword, setConPassword] = useState("");

  const createAccount = async ({ username, password }: createProps) => {
    if (!username || !password) {
      alert("Please fill in all fields!");
      return;
    }
    try {
      const url = `http://localhost:5050/add_user?username=${username}&password=${password}&setup=${false}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMessage(data.message);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  useEffect(() => {
    if (message === "New user") {
      navigate("/setup_profile", {
        state: { username: username, password: password },
      });
    } else if (message == "User already exists") {
      alert("User already exists");
      navigate("/", { replace: true });
    }
  }, [message]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="w-full max-w-sm rounded-2xl bg-gray-900/80 p-8 shadow-xl backdrop-blur-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-white">
          Create Account
        </h1>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            required
          />
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm Password"
              id="password"
              value={conPassword}
              onChange={(e) => setConPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <button
            onClick={() => {
              if (password !== conPassword) {
                alert("Passwords do not match!");
                return;
              }
              createAccount({ username, password });
            }}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition duration-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default Log;
export { Create };
