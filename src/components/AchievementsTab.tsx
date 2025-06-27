"use client";

import { useGameState } from '@/contexts/GameStateContext';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Award, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AchievementsTab() {
  const { state } = useGameState();
  const achievements = Object.values(state.achievements).sort((a, b) => (a.isCompleted ? 1 : 0) - (b.isCompleted ? 1 : 0));

  return (
    <div className="space-y-4">
       <h3 className="text-lg font-semibold font-headline">Achievements</h3>
      <ScrollArea className="h-[28rem] pr-4">
        <div className="space-y-3">
          {achievements.map(achievement => (
            <Card 
              key={achievement.id}
              className={cn("transition-colors", achievement.isCompleted ? "bg-primary/10 border-primary/40" : "bg-secondary/30")}
            >
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                {achievement.isCompleted ? (
                    <CheckCircle2 className="w-8 h-8 text-primary shrink-0"/>
                ) : (
                    <Award className="w-8 h-8 text-muted-foreground shrink-0"/>
                )}
                <div className="flex-grow">
                    <CardTitle className="text-base">{achievement.name}</CardTitle>
                    <CardDescription className="text-xs">{achievement.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
