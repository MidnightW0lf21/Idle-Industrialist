"use client";

import { useGameState } from '@/contexts/GameStateContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FlaskConical, CheckCircle2, Clock, Beaker } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Progress } from './ui/progress';

export default function ResearchTab() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  
  const { research } = state;
  const currentProject = research.currentProjectId ? research.projects[research.currentProjectId] : null;

  const handleStartResearch = (projectId: string) => {
    const project = research.projects[projectId];
    if (state.money >= project.cost && !research.currentProjectId) {
      dispatch({ type: 'START_RESEARCH', projectId });
      toast({
        title: "Research Started!",
        description: `Your team has begun research on "${project.name}".`,
      });
    } else if (research.currentProjectId) {
        toast({
            title: "Research In Progress",
            description: "Cannot start a new project while another is active.",
            variant: "destructive"
        });
    } else {
        toast({
            title: "Research Failed",
            description: "Not enough money to fund this project.",
            variant: "destructive"
        });
    }
  };
  
  const formatTime = (seconds: number) => {
    if (seconds < 0 || !isFinite(seconds) || isNaN(seconds)) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const availableProjects = Object.values(research.projects).filter(p => p.status === 'available');
  const completedProjects = Object.values(research.projects).filter(p => p.status === 'completed');

  return (
    <div className="space-y-6">
       <div>
        <h3 className="text-lg font-semibold mb-2 font-headline">Current Research</h3>
        {currentProject ? (
            <Card className="bg-primary/10 border-primary/40">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Beaker className="w-5 h-5 text-primary" /> {currentProject.name}</CardTitle>
                    <CardDescription>{currentProject.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Progress value={currentProject.progress} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Time Remaining:</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(currentProject.timeToComplete * (1 - currentProject.progress / 100))}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        ) : (
            <div className="text-center text-muted-foreground p-8 flex flex-col items-center justify-center h-full">
                <FlaskConical className="h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold">No Active Research</h3>
                <p className="text-sm">Select a project below to begin.</p>
            </div>
        )}
       </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-2 font-headline">Available Projects</h3>
        <ScrollArea className="h-48 pr-4">
          <div className="space-y-4">
            {availableProjects.length > 0 ? availableProjects.map(project => (
              <Card key={project.id} className="bg-secondary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="flex items-center gap-1.5">Cost: ${project.cost.toLocaleString()}</div>
                    <div className="flex items-center gap-1.5"><Clock className="w-4 h-4"/>Time: {project.timeToComplete}s</div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button 
                    onClick={() => handleStartResearch(project.id)} 
                    size="sm" 
                    className="w-full"
                    disabled={state.money < project.cost || !!research.currentProjectId}
                  >
                    Start Research
                  </Button>
                </CardFooter>
              </Card>
            )) : (
              <p className="text-center text-muted-foreground p-4">No new projects available.</p>
            )}
          </div>
        </ScrollArea>
      </div>
      
       <Separator />

       <div>
        <h3 className="text-lg font-semibold mb-2 font-headline">Completed Research</h3>
        <ScrollArea className="h-24 pr-4">
          <div className="space-y-2">
            {completedProjects.length > 0 ? completedProjects.map(project => (
               <div key={project.id} className="flex items-center gap-2 text-sm p-2 rounded-md bg-secondary/30">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <p className="font-medium">{project.name}</p>
                </div>
            )) : (
              <p className="text-center text-muted-foreground p-4">No research completed yet.</p>
            )}
          </div>
        </ScrollArea>
      </div>

    </div>
  );
}
