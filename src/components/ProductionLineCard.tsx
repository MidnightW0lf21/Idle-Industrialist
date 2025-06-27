"use client";

import type { ProductionLine } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Cog } from 'lucide-react';

interface ProductionLineCardProps {
  line: ProductionLine;
}

export default function ProductionLineCard({ line }: ProductionLineCardProps) {
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
        {line.orderId ? (
          <div className="space-y-2">
            <p className="font-semibold">{line.productName}</p>
            <Progress value={line.progress} className="w-full transition-all duration-1000 ease-linear" />
            <p className="text-sm text-muted-foreground text-right">{Math.floor(line.progress)}%</p>
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
