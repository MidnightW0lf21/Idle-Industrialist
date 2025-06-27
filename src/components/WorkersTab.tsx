"use client";

import { useGameState } from '@/contexts/GameStateContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, User, Briefcase, DollarSign, Zap } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Progress } from '@/components/ui/progress';

const WORKER_HIRE_COST = 500;

export default function WorkersTab() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const handleHireWorker = () => {
    if (state.money >= WORKER_HIRE_COST) {
      dispatch({ type: 'HIRE_WORKER' });
      toast({
        title: "Worker Hired!",
        description: `A new worker has joined the team. Don't forget to assign them!`,
      });
    } else {
      toast({
        title: "Hiring Failed",
        description: "Not enough money to hire a new worker.",
        variant: "destructive",
      });
    }
  };

  const handleAssignWorker = (workerId: number, lineId: string | null) => {
    const numericLineId = lineId ? parseInt(lineId, 10) : null;
    dispatch({ type: 'ASSIGN_WORKER', workerId, lineId: numericLineId });
  };
  
  const idleLines = state.productionLines.filter(line => line.assignedWorkerId === null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recruitment</CardTitle>
          <CardDescription>Hire new workers to staff your production lines.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button 
            onClick={handleHireWorker} 
            disabled={state.money < WORKER_HIRE_COST}
            className="w-full"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Hire Worker for ${WORKER_HIRE_COST.toLocaleString()}
          </Button>
        </CardFooter>
      </Card>
      
      <div>
        <h3 className="text-lg font-semibold mb-2 font-headline">Your Team</h3>
        <ScrollArea className="h-80 pr-4">
          <div className="space-y-4">
            {state.workers.map(worker => {
              const assignedLine = worker.assignedLineId ? state.productionLines.find(l => l.id === worker.assignedLineId) : null;
              return (
                <Card key={worker.id} className="bg-secondary/30">
                  <CardHeader>
                    <CardTitle className="text-base flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <User className="w-5 h-5"/> {worker.name}
                      </span>
                      <span className="text-sm font-mono flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="w-3 h-3" /> {worker.wage.toFixed(2)}/s
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                       <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          <Progress value={worker.energy} className="h-2 [&>div]:bg-yellow-400" />
                      </div>
                      {assignedLine ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-primary">
                            <Briefcase className="w-4 h-4"/>
                            <p>Working on Line {assignedLine.id}</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleAssignWorker(worker.id, null)}
                          >
                            Unassign
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                           <p className="text-sm text-muted-foreground">{worker.energy > 0 ? 'Idle' : 'Exhausted'}</p>
                          <Select
                            onValueChange={(lineId) => handleAssignWorker(worker.id, lineId)}
                            disabled={idleLines.length === 0 || worker.energy <= 0}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Assign to Line..." />
                            </SelectTrigger>
                            <SelectContent>
                              {idleLines.length > 0 ? idleLines.map(line => (
                                <SelectItem key={line.id} value={String(line.id)}>
                                  Production Line {line.id}
                                </SelectItem>
                              )) : (
                                <SelectItem value="none" disabled>No idle lines</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
