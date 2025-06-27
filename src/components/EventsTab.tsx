"use client";

import { useGameState } from '@/contexts/GameStateContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, Zap, AlertTriangle, Clock } from 'lucide-react';
import { Progress } from './ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

export default function EventsTab() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const { activeEvent } = state;
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (activeEvent) {
      const updateTimer = () => {
        const remaining = (activeEvent.expiresAt - Date.now()) / 1000;
        setTimeRemaining(remaining > 0 ? remaining : 0);
      };

      updateTimer(); // Initial call
      const intervalId = setInterval(updateTimer, 1000);

      return () => clearInterval(intervalId);
    }
  }, [activeEvent]);

  const handleResolveStrike = () => {
    if (activeEvent?.type === 'WORKER_STRIKE' && state.money >= activeEvent.strikeDemand!) {
      dispatch({ type: 'RESOLVE_STRIKE' });
      toast({
        title: "Strike Resolved!",
        description: "The workers are back to work."
      });
    } else {
      toast({
        title: "Payment Failed",
        description: "Not enough money to meet the workers' demands.",
        variant: 'destructive'
      });
    }
  };
  
  const formatTime = (seconds: number) => {
    if (seconds < 0 || !isFinite(seconds) || isNaN(seconds)) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!activeEvent) {
    return (
      <div className="text-center text-muted-foreground p-8 flex flex-col items-center justify-center h-full">
        <Megaphone className="h-12 w-12 mb-4" />
        <h3 className="text-lg font-semibold">All Clear</h3>
        <p className="text-sm">No active events right now. Keep an eye out for market changes!</p>
      </div>
    );
  }

  const progress = (1 - (timeRemaining / activeEvent.duration)) * 100;
  const isNegative = activeEvent.type === 'WORKER_STRIKE' || activeEvent.type === 'SUPPLY_CHAIN_DELAY' || (activeEvent.type === 'RAW_MATERIAL_PRICE_CHANGE' && (activeEvent.priceMultiplier || 1) > 1);
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold font-headline">Active Event</h3>
       <Card className={isNegative ? "border-destructive/50" : "border-primary/50"}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {activeEvent.type === 'WORKER_STRIKE' ? <AlertTriangle className="w-5 h-5 text-destructive" /> : <Zap className="w-5 h-5 text-primary" />}
                    {activeEvent.name}
                </CardTitle>
                <CardDescription>{activeEvent.description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Time Remaining:</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(timeRemaining)}</span>
                    </div>
                </div>
            </CardContent>
            {activeEvent.type === 'WORKER_STRIKE' && !activeEvent.isResolved && (
                <CardFooter>
                    <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={handleResolveStrike}
                        disabled={state.money < activeEvent.strikeDemand!}
                    >
                        Pay Demands (${activeEvent.strikeDemand?.toLocaleString()})
                    </Button>
                </CardFooter>
            )}
       </Card>
    </div>
  );
}
