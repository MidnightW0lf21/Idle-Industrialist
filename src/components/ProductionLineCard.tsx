"use client";

import type { ProductionLine } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Cog, Clock, Package } from 'lucide-react';

interface ProductionLineCardProps {
  line: ProductionLine;
}

export default function ProductionLineCard({ line }: ProductionLineCardProps) {
  // Time remaining calculation needs to account for efficiency
  const timeRemaining = line.orderId ? (line.timeToProduce / line.efficiency) * (1 - (line.progress / 100)) : 0;
  
  const formatTime = (seconds: number) => {
    if (seconds < 0 || !isFinite(seconds)) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-secondary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cog className={`w-5 h-5 ${line.orderId ? 'animate-spin' : ''}`} style={{ animationDuration: '5s' }}/>
          Production Line {line.id}
        </CardTitle>
        <CardDescription>Efficiency: {Math.round(line.efficiency * 100)}%</CardDescription>
      </CardHeader>
      <CardContent>
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
            <p>Idle</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
