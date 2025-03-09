import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  // Check for authenticated user on page load
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUser(data.session.user);
        navigate("/dashboard");
      }
    };
    getUser();
  }, [navigate]);

  // Handle sign-up
  const handleSignup = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setUser(data.user);
      navigate("/dashboard");
    }
    setLoading(false);
  };

  // Handle login
  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setUser(data.user);
      navigate("/dashboard");
    }
    setLoading(false);
  };

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      {user ? (
        <div>
          <h2>Welcome, {user.email}</h2>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-500 text-white rounded-md"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="flex flex-col space-y-3 p-6 bg-gray-100 rounded-md shadow-md">
          <h2 className="text-xl font-bold">Login or Sign Up</h2>
          {error && <p className="text-red-500">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-2 border rounded-md"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-2 border rounded-md"
          />
          <button
            onClick={handleLogin}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-md"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          <button
            onClick={handleSignup}
            disabled={loading}
            className="px-6 py-2 bg-green-500 text-white rounded-md"
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Auth;
