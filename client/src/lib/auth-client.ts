export { signInWithEmailAndPassword as signIn, createUserWithEmailAndPassword as signUp, signOut } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase";

export const useSession = () => {
    const [user, loading, error] = useAuthState(auth);
    return {
        data: user ? { user } : null,
        isPending: loading,
        error: error || null
    };
};