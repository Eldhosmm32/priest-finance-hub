import { useState, useEffect } from "react";

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);

    // Initial check
    setMatches(mediaQueryList.matches);

    // Event handler to update state on change
    const handleChange = (event: MediaQueryListEvent) =>
      setMatches(event.matches);

    // Add listener for modern browsers (and fallback for older Safari)
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", handleChange);
    } else {
      // Deprecated but useful for older versions
      mediaQueryList.addListener(handleChange);
    }

    // Cleanup function to remove the event listener
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener("change", handleChange);
      } else {
        mediaQueryList.removeListener(handleChange);
      }
    };
  }, [query]); // Re-run effect if the query string changes

  return matches;
};

export default useMediaQuery;
