"use client";

import { useGameState } from '@/contexts/GameStateContext';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Factory, Layers, Cpu } from 'lucide-react';

export default function Header() {
  const { state } = useGameState();
  const totalPallets = Object.values(state.pallets).reduce((sum, p) => sum + p.quantity, 0);
  const totalComponents = state.rawMaterials['Electronic Components']?.quantity || 0;

  return (
    <header className="bg-card border-b sticky top-0 z-10">
      <div className="container mx-auto p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Factory className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground font-headline tracking-tight">Idle Industrialist</h1>
        </div>
        <div className="flex items-center gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-2 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="font-semibold text-lg">${state.money.toLocaleString()}</span>
            </CardContent>
          </Card>
           <Card className="shadow-sm">
            <CardContent className="p-2 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-purple-500" />
              <span className="font-semibold text-lg">{totalComponents.toLocaleString()}</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-2 flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">{totalPallets.toLocaleString()}</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </header>
  );
}
