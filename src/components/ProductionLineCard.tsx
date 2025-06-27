"use client";

import type { ProductionLine } from '@/types';
import { useGameState } from '@/contexts/GameStateContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Cog, Clock, Package, User, ArrowUpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from "@/hooks/use-toast"

interface ProductionLineCardProps {
  line: ProductionLine;
}

const LINE_EFFICIENCY_UPGRADE_BASE_COST = 400;
const LINE_EFFICIENCY_CAP = 5;

export default function ProductionLineCard({ line }: ProductionLineCardProps) {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const worker = state.workers.find(w => w.id === line.assignedWorkerId);
  const effectiveEfficiency = worker ? line.efficiency * worker.efficiency : line.efficiency;

  // Time remaining calculation needs to account for efficiency
  const timeRemaining = line.orderId && effectiveEfficiency > 0 ? (line.timeToProduce / effectiveEfficiency) * (1 - (line.progress / 100)) : 0;
  
  const formatTime = (seconds: number) => {
    if (seconds < 0 || !isFinite(seconds)) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleUpgrade = () => {
    const upgradeCost = Math.floor(LINE_EFFICIENCY_UPGRADE_BASE_COST * Math.pow(line.efficiencyLevel, 1.8));
    if (state.money >= upgradeCost) {
      dispatch({ type: 'UPGRADE_PRODUCTION_LINE', lineId: line.id });
       toast({
        title: "Line Upgraded!",
        description: `Production Line ${line.id} efficiency increased.`,
      })
    } else {
       toast({
        title: "Upgrade Failed",
        description: "Not enough money for this upgrade.",
        variant: "destructive",
      })
    }
  }

  const upgradeCost = Math.floor(LINE_EFFICIENCY_UPGRADE_BASE_COST * Math.pow(line.efficiencyLevel, 1.8));
  const atEffCap = line.efficiency >= LINE_EFFICIENCY_CAP;


  return (
    <Card className="bg-secondary/50 flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Cog className={`w-5 h-5 ${line.orderId && line.assignedWorkerId ? 'animate-spin' : ''}`} style={{ animationDuration: `${Math.max(0.5, 5 / effectiveEfficiency)}s` }}/>
            Production Line {line.id}
          </span>
           <span className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
              <User className="w-3 h-3"/>
              {worker ? worker.name : 'Unassigned'}
            </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow pt-4">
        {line.orderId && line.productName ? (
          <div className="space-y-2">
            <p className="font-semibold truncate" title={line.productName}>{line.productName}</p>
            <Progress value={line.progress} className="w-full transition-all duration-1000 ease-linear" />
            <div className="flex justify-between items-center text-sm text-muted-foreground pt-1">
               <div className="flex items-center gap-1.5">
                <Package className="w-4 h-4" />
                <span>{line.completedQuantity} / {line.quantity} Pallets</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{formatTime(timeRemaining)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            <p>{line.assignedWorkerId ? "Idle" : "Awaiting Worker"}</p>
          </div>
        )}
      </CardContent>
       <CardFooter>
        <Button
          size="sm"
          variant="outline"
          onClick={handleUpgrade}
          disabled={state.money < upgradeCost || atEffCap}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-1">
            <ArrowUpCircle className="h-4 w-4" /> {atEffCap ? 'Efficiency (MAX)' : `Upgrade Eff. (${line.efficiency.toFixed(1)}x)`}
          </div>
          <span className="text-xs font-mono">{atEffCap ? '—' : `$${upgradeCost.toLocaleString()}`}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
