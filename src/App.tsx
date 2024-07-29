import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignIn from "./Components/SignIn";
import SignUp from "./Components/SignUp";
import Home from "../src/Components/Pages/Home";
import Admin from "../src/Components/Pages/Admin";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/Admin" element={<Admin />} />

        <Route path="/" element={<SignIn />} />
      </Routes>
    </Router>
  );
}

export default App;
