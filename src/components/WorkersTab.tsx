
"use client";

import { useGameState } from '@/contexts/GameStateContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, User, Briefcase, DollarSign, Zap, ArrowUpCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Progress } from '@/components/ui/progress';

const WORKER_HIRE_COST = 50000;
const UPGRADE_BASE_COST = 25000;
const EFFICIENCY_CAP = 3;
const STAMINA_CAP = 8;


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
  
  const handleUpgradeWorker = (workerId: number, upgradeType: 'efficiency' | 'stamina') => {
    const worker = state.workers.find(w => w.id === workerId)!;
    const level = upgradeType === 'efficiency' ? worker.efficiencyLevel : worker.staminaLevel;
    const cost = Math.floor(UPGRADE_BASE_COST * Math.pow(level, 1.5));

    if (state.money >= cost) {
      dispatch({ type: 'UPGRADE_WORKER', workerId, upgradeType });
      toast({
        title: "Worker Upgraded!",
        description: `${worker.name}'s ${upgradeType} has been improved.`,
      });
    } else {
      toast({
        title: "Upgrade Failed",
        description: "Not enough money for this upgrade.",
        variant: "destructive",
      });
    }
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
            {state.workers.length > 0 ? state.workers.map(worker => {
              const assignedLine = worker.assignedLineId ? state.productionLines.find(l => l.id === worker.assignedLineId) : null;
              const efficiencyUpgradeCost = Math.floor(UPGRADE_BASE_COST * Math.pow(worker.efficiencyLevel, 1.5));
              const staminaUpgradeCost = Math.floor(UPGRADE_BASE_COST * Math.pow(worker.staminaLevel, 1.5));
              const atEffCap = worker.efficiency >= EFFICIENCY_CAP;
              const atStamCap = worker.stamina >= STAMINA_CAP;

              return (
                <Card key={worker.id} className="bg-secondary/30 flex flex-col">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <User className="w-5 h-5"/> {worker.name}
                      </span>
                      <span className="text-sm font-mono flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="w-3 h-3" /> {worker.wage.toLocaleString()}/s
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4">
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
                  </CardContent>
                  <CardFooter className="grid grid-cols-2 gap-2 pt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpgradeWorker(worker.id, 'efficiency')}
                      disabled={state.money < efficiencyUpgradeCost || atEffCap}
                      className="justify-between px-2"
                    >
                      <div className="flex items-center gap-1">
                        <ArrowUpCircle className="h-4 w-4" /> {atEffCap ? 'Eff. (MAX)' : `Eff. (${worker.efficiency.toFixed(1)}x)`}
                      </div>
                      <span className="text-xs font-mono">{atEffCap ? '—' : `$${efficiencyUpgradeCost.toLocaleString()}`}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpgradeWorker(worker.id, 'stamina')}
                      disabled={state.money < staminaUpgradeCost || atStamCap}
                      className="justify-between px-2"
                    >
                      <div className="flex items-center gap-1">
                        <Zap className="h-4 w-4" /> {atStamCap ? 'Stam. (MAX)' : `Stam. (${worker.stamina.toFixed(1)}x)`}
                      </div>
                      <span className="text-xs font-mono">{atStamCap ? '—' : `$${staminaUpgradeCost.toLocaleString()}`}</span>
                    </Button>
                  </CardFooter>
                </Card>
              );
            }) : <p className="text-center text-muted-foreground p-4">No workers on your team. Hire one!</p>}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
