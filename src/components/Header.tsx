"use client";

import { useState, useEffect } from 'react';
import { useGameState } from '@/contexts/GameStateContext';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Factory, Layers, Sun, Moon, Star, Zap } from 'lucide-react';
import { Button } from './ui/button';
import NewsTicker from './NewsTicker';

export default function Header() {
  const { state } = useGameState();
  const totalPallets = Object.values(state.pallets).reduce((sum, p) => sum + p.quantity, 0);

  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const localTheme = localStorage.getItem('theme');
    if (localTheme) {
      setTheme(localTheme);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [theme, mounted]);
  
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="bg-card border-b sticky top-0 z-10">
      <div className="container mx-auto p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Factory className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground font-headline tracking-tight">Idle Industrialist</h1>
        </div>
        <div className="flex items-center gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-2 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="font-semibold text-lg">{mounted ? `$${state.money.toLocaleString()}` : '$...'}</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-2 flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">{mounted ? totalPallets.toLocaleString() : '...'}</span>
            </CardContent>
          </Card>
           <Card className="shadow-sm">
            <CardContent className="p-2 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-400" />
              <span className="font-semibold text-lg">{mounted ? state.reputation.toLocaleString() : '...'}</span>
            </CardContent>
          </Card>
           <Card className="shadow-sm">
            <CardContent className="p-2 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span className={`font-semibold text-lg ${mounted && state.powerUsage > state.powerCapacity ? 'text-destructive' : ''}`}>
                {mounted ? `${state.powerUsage.toFixed(0)}/${state.powerCapacity.toFixed(0)} MW` : '.../... MW'}
              </span>
            </CardContent>
          </Card>
          
          {mounted ? (
            <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? (
                <Moon className="h-[1.2rem] w-[1.2rem]" />
              ) : (
                <Sun className="h-[1.2rem] w-[1.2rem]" />
              )}
            </Button>
          ) : (
            <div className="w-10 h-10" />
          )}

        </div>
      </div>
      <NewsTicker />
    </header>
  );
}
