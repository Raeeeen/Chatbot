import React, { useState } from "react";
import ShowPass from "../assets/showpass.png";
import HidePass from "../assets/hidepass.png";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";
import { User } from "firebase/auth";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [edp, setEdp] = useState("");
  const [address, setAddress] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getDatabase(app);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const userId = user.uid;

      await sendEmailVerification(auth.currentUser as User);

      await set(ref(db, `users/${userId}`), {
        name,
        email,
        edp,
        address,
      });

      toast.success(
        "Signup successful. Please check your email for verification."
      );

      setTimeout(() => {
        window.location.href = "/signin";
      }, 6000);
    } catch (error: any) {
      console.error("Error signing up:", error.message);
      toast.error(error.message);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleEdpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setEdp(value);
  };

  const handlePasswordFocus = () => {
    setPasswordFocused(true);
  };

  const handlePasswordBlur = () => {
    setPasswordFocused(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-600 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-gray-800 bg-opacity-90 rounded-lg p-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-100">
            Create an account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
          <input type="hidden" name="remember" value="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 bg-gray-700 bg-opacity-70 placeholder-gray-500 text-gray-100 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="edp" className="sr-only">
                EDP
              </label>
              <input
                id="edp"
                name="edp"
                type="text"
                autoComplete="edp"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 bg-gray-700 bg-opacity-70 placeholder-gray-500 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="EDP"
                value={edp}
                onChange={handleEdpChange}
              />
            </div>
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 bg-gray-700 bg-opacity-70 placeholder-gray-500 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
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
                onFocus={handlePasswordFocus}
                onBlur={handlePasswordBlur}
                onChange={(e) => setPassword(e.target.value)}
              />
              {(passwordFocused || password) && (
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
              )}
            </div>
            <div>
              <label htmlFor="address" className="sr-only">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                rows={3}
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 bg-gray-700 bg-opacity-70 placeholder-gray-500 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign up
            </button>
          </div>
        </form>
        <div className="text-center">
          <p className="text-sm text-gray-300">
            Already have an account?{" "}
            <a
              href="/signin"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Log in
            </a>
          </p>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default SignUp;
