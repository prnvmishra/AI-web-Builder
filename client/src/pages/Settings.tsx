import { auth } from "@/lib/firebase";
import { signOut } from "@/lib/auth-client";
import { useNavigate } from "react-router-dom";

const Settings = () => {
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut(auth);
        navigate("/auth/signin");
    };

  return (
    <div className="w-full p-4 flex justify-center items-center min-h-[90vh] flex-col gap-6 py-12 text-white">
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-xl p-8 mb-6 shadow-xl">
        <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Account Settings</h2>
        <div className="space-y-4">
            <div>
                <p className="text-gray-400 text-sm">Email Address</p>
                <p className="font-medium text-lg">{auth.currentUser?.email || "Not signed in"}</p>
            </div>
            {/* Additional settings can go here */}
        </div>
      </div>

       <div className="bg-black/40 backdrop-blur-xl border border-red-500/30 rounded-2xl w-full max-w-xl p-8 shadow-xl">
        <h2 className="text-xl font-bold text-red-400 mb-2">Danger Zone</h2>
        <p className="text-gray-400 text-sm mb-6">Take caution before proceeding with these actions.</p>
        
        <button 
            onClick={handleSignOut}
            className="px-6 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-500/50 rounded-lg transition"
        >
            Sign Out
        </button>
      </div>
    </div>     
  )
}

export default Settings;
