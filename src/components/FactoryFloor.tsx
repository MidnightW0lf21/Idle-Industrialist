"use client";

import { useGameState } from '@/contexts/GameStateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProductionLineCard from './ProductionLineCard';
import { Factory } from 'lucide-react';

export default function FactoryFloor() {
  const { state } = useGameState();

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-headline">
          <Factory className="w-6 h-6 text-primary" />
          Factory Floor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {state.productionLines.map(line => (
            <ProductionLineCard key={line.id} line={line} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
