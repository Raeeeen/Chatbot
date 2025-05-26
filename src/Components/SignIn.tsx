import React, { useState } from "react";
import ShowPass from "../assets/showpass.png";
import HidePass from "../assets/hidepass.png";
import GoogleIcon from "../assets/googleicon.png";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); 
  const [googleClicked, setGoogleClicked] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getDatabase(app);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isButtonDisabled) return; 
    setIsButtonDisabled(true); 

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (user.email === "ccsmagai@gmail.com") {
        toast.success("Sign in with Email successful!");
        setTimeout(() => {
          window.location.href = "/admin";
        }, 6000);
      } else {
        if (!user.emailVerified) {
          toast.warning("Please verify your email address.");
        } else {
          toast.success("Sign in with Email successful!");
          setTimeout(() => {
            window.location.href = "/Home";
          }, 6000);
        }
      }
    } catch (error: any) {
      console.error("Error signing in:", error.message);
      toast.error(error.message);
    } finally {
      setTimeout(() => setIsButtonDisabled(false), 5000); 
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleGoogleClick = async () => {
    if (isButtonDisabled) return; 
    setIsButtonDisabled(true); 

    setGoogleClicked(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ hd: "sccpag.edu.ph" });
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      const userName = user.displayName || "Unknown";
      const userId = user.uid;
      await set(ref(db, `users/${userId}`), {
        name: userName,
        email: user.email,
      });

      toast.success("Sign in with Google successful!");
      setTimeout(() => {
        window.location.href = "/Home";
      }, 4000);
    } catch (error: any) {
      console.error("Error signing in with Google:", error.message);
      toast.error("Error signing in with Google. Please try again.");
    } finally {
      setTimeout(() => setIsButtonDisabled(false), 5000); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-600 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-gray-800 bg-opacity-90 rounded-lg p-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-100">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <input type="hidden" name="remember" value="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 bg-gray-700 bg-opacity-70 placeholder-gray-500 text-gray-100 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 bg-gray-700 bg-opacity-70 placeholder-gray-500 text-gray-100 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 focus:outline-none"
                onClick={togglePasswordVisibility}
              >
                <img
                  src={showPassword ? HidePass : ShowPass} 
                  alt={showPassword ? "Hide Password" : "Show Password"}
                  className="h-5 w-5"
                />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-100"
              >
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a
                href="#"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isButtonDisabled}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in
            </button>
          </div>
        </form>
        <div className="text-center">
          <p className="text-sm text-gray-300">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign up
            </a>
          </p>
        </div>
        <div className="flex justify-center">
          {/* Google signup option */}
          <button
            className={`group relative flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md ${
              googleClicked
                ? ""
                : "text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            }`}
            onClick={handleGoogleClick}
            disabled={isButtonDisabled}
          >
            <img src={GoogleIcon} alt="Google Icon" className="h-5 w-5" />
          </button>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default SignIn;
