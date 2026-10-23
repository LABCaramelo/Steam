import { useEffect, useState } from "react";
import PromptsPage from "./PromptsPage";
import SlidePresentation from "./SlidePresentation";

export default function App() {
  const [showSlides, setShowSlides] = useState(
    () => location.hash === "#apresentacao" || location.hash === "#slides"
  );

  useEffect(() => {
    const handleHash = () => {
      setShowSlides(
        location.hash === "#apresentacao" || location.hash === "#slides"
      );
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  if (showSlides) {
    return (
      <SlidePresentation
        onBackToPrompts={() => {
          location.hash = "";
          setShowSlides(false);
        }}
      />
    );
  }

  return <PromptsPage />;
}
