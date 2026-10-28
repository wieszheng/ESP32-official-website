import React, { createContext, useContext, useState, useEffect } from 'react';

interface GitHubStarContextType {
  stars: number;
  isStarred: boolean;
  toggleStar: () => void;
  formattedStars: string;
}

const GitHubStarContext = createContext<GitHubStarContextType | undefined>(undefined);

const BASE_STARS = 2846;

export const GitHubStarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isStarred, setIsStarred] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('esp_pixel_starred') === 'true';
    }
    return false;
  });

  const stars = BASE_STARS + (isStarred ? 1 : 0);

  const toggleStar = () => {
    setIsStarred(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('esp_pixel_starred', String(next));
      }
      return next;
    });
  };

  const formattedStars = stars.toLocaleString();

  return (
    <GitHubStarContext.Provider value={{ stars, isStarred, toggleStar, formattedStars }}>
      {children}
    </GitHubStarContext.Provider>
  );
};

export const useGitHubStar = () => {
  const context = useContext(GitHubStarContext);
  if (!context) {
    throw new Error('useGitHubStar must be used within a GitHubStarProvider');
  }
  return context;
};
