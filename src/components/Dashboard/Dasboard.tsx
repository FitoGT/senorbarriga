import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  // Check if user is logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUser(data.session.user);
      } else {
        navigate("/"); // Redirect to login if not authenticated
      }
    };

    checkUser();
  }, [navigate]);

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/"); // Redirect to login page
  };

  if (!user) {
    return <p>Loading...</p>; // Show loading while checking session
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <h2 className="text-2xl font-bold">Welcome, {user.email}</h2>
      <button
        onClick={handleLogout}
        className="px-6 py-2 bg-red-500 text-white rounded-md shadow-md"
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
