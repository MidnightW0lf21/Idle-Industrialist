"use client";

import { useGameState } from '@/contexts/GameStateContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Warehouse, Truck, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"

export default function WarehouseDisplay() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const handleShip = () => {
    if (state.pallets > 0) {
      dispatch({ type: 'SHIP_GOODS' });
      toast({
        title: "Shipment Sent!",
        description: `You earned money for ${state.pallets} pallets.`,
      })
    } else {
      toast({
        title: "Shipping Failed",
        description: "No pallets in warehouse to ship.",
        variant: "destructive",
      })
    }
  };
  
  const warehouseUsage = (state.pallets / state.warehouseCapacity) * 100;
  const isFull = state.pallets >= state.warehouseCapacity;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-headline">
          <Warehouse className="w-6 h-6 text-primary" />
          Warehouse
        </CardTitle>
        <CardDescription>
          Stores finished goods ready for shipping.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium">Storage</span>
            <span className="text-muted-foreground">{state.pallets.toLocaleString()} / {state.warehouseCapacity.toLocaleString()} Pallets</span>
          </div>
          <Progress value={warehouseUsage} className="transition-all duration-500 ease-out" />
        </div>
        
        {isFull && (
          <div className="flex items-center p-3 rounded-md bg-destructive/10 text-destructive-foreground border border-destructive/20">
            <AlertCircle className="w-5 h-5 mr-2 text-destructive" />
            <p className="text-sm font-medium">Warehouse full! Production will halt.</p>
          </div>
        )}

        <Button 
          onClick={handleShip}
          disabled={state.isShipping || state.pallets === 0}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          size="lg"
        >
          <Truck className="mr-2 h-5 w-5" />
          {state.isShipping ? 'Shipping...' : 'Ship All Goods'}
        </Button>
      </CardContent>
    </Card>
  );
}
