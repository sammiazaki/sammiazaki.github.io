import { HashRouter, Routes, Route } from "react-router-dom";
import BlogLayout from "@/layouts/BlogLayout";
import Home from "@/pages/Home";
import TutorialPage from "@/pages/TutorialPage";
import About from "@/pages/About";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<BlogLayout />}>
          <Route index element={<Home />} />
          <Route path="tutorial/:slug" element={<TutorialPage />} />
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
