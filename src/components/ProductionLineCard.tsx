"use client";

import type { ProductionLine } from '@/types';
import { useGameState } from '@/contexts/GameStateContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Cog, Clock, Package, User, ArrowUpCircle, Zap, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ProductionLineCardProps {
  line: ProductionLine;
}

const LINE_EFFICIENCY_UPGRADE_BASE_COST = 400;
const LINE_EFFICIENCY_CAP = 5;

export default function ProductionLineCard({ line }: ProductionLineCardProps) {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const worker = state.workers.find(w => w.id === line.assignedWorkerId);
  const efficiencyBoost = state.activeEvent?.type === 'GLOBAL_EFFICIENCY_BOOST' ? (state.activeEvent.efficiencyBoost || 1) : 1;
  const effectiveEfficiency = worker ? line.efficiency * worker.efficiency * efficiencyBoost : line.efficiency * efficiencyBoost;
  const isStrike = state.activeEvent?.type === 'WORKER_STRIKE' && !state.activeEvent.isResolved;

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

  const getStatusText = () => {
    if (isStrike) return "On Strike";
    if (!line.orderId) return "Idle";
    if (line.isBlockedByMaterials) return "Awaiting Materials";
    if (!line.assignedWorkerId) return "Awaiting Worker";
    return "Idle";
  }


  return (
    <Card className="bg-secondary/50 flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-start justify-between">
          <span className="flex items-center gap-2">
            <Cog className={`w-5 h-5 ${line.orderId && line.assignedWorkerId && !line.isBlockedByMaterials && !isStrike ? 'animate-spin' : ''}`} style={{ animationDuration: `${Math.max(0.5, 5 / effectiveEfficiency)}s` }}/>
            Production Line {line.id}
          </span>
           <div className="w-28 text-right space-y-1">
             <span className="flex items-center justify-end gap-1.5 text-sm font-normal text-muted-foreground">
                <User className="w-3 h-3"/>
                {worker ? worker.name : 'Unassigned'}
              </span>
              {worker && (
                  <div className="flex items-center justify-end gap-1.5">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    <Progress value={worker.energy} className="h-1.5 w-20 [&>div]:bg-yellow-400" />
                  </div>
              )}
           </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow pt-4">
        {line.orderId && line.productName ? (
          <div className="space-y-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="font-semibold truncate cursor-default" title={line.productName}>{line.productName}</p>
              </TooltipTrigger>
              {line.materialRequirements && Object.keys(line.materialRequirements).length > 0 && (
                <TooltipContent>
                  <p className="font-semibold mb-1">Required Materials:</p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    {Object.entries(line.materialRequirements).map(([mat, qty]) => (
                        <li key={mat}>{qty}x {mat} / pallet</li>
                    ))}
                  </ul>
                </TooltipContent>
              )}
            </Tooltip>
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
            {line.isBlockedByMaterials && (
                <div className="flex items-center gap-2 text-destructive text-xs pt-1">
                    <AlertTriangle className="w-4 h-4" />
                    <p>Production halted: no materials!</p>
                </div>
            )}
             {isStrike && (
                <div className="flex items-center gap-2 text-destructive text-xs pt-1">
                    <AlertTriangle className="w-4 h-4" />
                    <p>Production halted: worker strike!</p>
                </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            <p>{getStatusText()}</p>
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
