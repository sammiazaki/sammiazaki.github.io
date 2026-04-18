import { HashRouter, Routes, Route } from "react-router-dom";
import BlogLayout from "@/layouts/BlogLayout";
import Home from "@/pages/Home";
import Chalkboard from "@/pages/Chalkboard";
import TutorialPage from "@/pages/TutorialPage";
import About from "@/pages/About";
import Anime from "@/pages/Anime";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<BlogLayout />}>
          <Route index element={<Home />} />
          <Route path="chalkboard" element={<Chalkboard />} />
          <Route path="chalkboard/:slug" element={<TutorialPage />} />
          <Route path="about" element={<About />} />
          <Route path="anime" element={<Anime />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
