"use client";

import { useState, useEffect } from 'react';
import { useGameState } from '@/contexts/GameStateContext';
import { generateNewsHeadline } from '@/ai/flows/news-generation-flow';
import { Newspaper } from 'lucide-react';

export default function NewsTicker() {
  const { state } = useGameState();
  const [headlines, setHeadlines] = useState<string[]>(["Welcome to Idle Industrialist! Your journey to a manufacturing empire begins now..."]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const fetchHeadline = async () => {
      if (isFetching) return;
      setIsFetching(true);
      try {
        const { money, reputation, activeEvent } = state;
        const input = {
          playerMoney: money,
          reputation: reputation,
          activeEvent: activeEvent?.type || null,
        };
        const result = await generateNewsHeadline(input);
        if (result.headline) {
          setHeadlines(prev => {
            const newHeadlines = [...prev, result.headline];
            // Keep the array from growing too large
            return newHeadlines.slice(Math.max(newHeadlines.length - 10, 0));
          });
        }
      } catch (error) {
        console.error("Failed to fetch news headline:", error);
      } finally {
        setIsFetching(false);
      }
    };

    const intervalId = setInterval(fetchHeadline, 45000); // Fetch a new headline every 45 seconds
    
    return () => clearInterval(intervalId);
  }, [state, isFetching]);

  return (
    <div className="bg-secondary/50 text-secondary-foreground border-t border-border overflow-hidden whitespace-nowrap relative flex items-center h-8">
        <div className="flex-shrink-0 bg-primary text-primary-foreground h-full flex items-center px-3 z-10">
            <Newspaper className="w-4 h-4" />
        </div>
      <div className="flex animate-marquee hover:pause">
        {headlines.map((headline, index) => (
          <span key={index} className="mx-8 text-sm">{headline}</span>
        ))}
        {/* Duplicate for seamless looping */}
        {headlines.map((headline, index) => (
          <span key={`dup-${index}`} className="mx-8 text-sm">{headline}</span>
        ))}
      </div>
    </div>
  );
}
