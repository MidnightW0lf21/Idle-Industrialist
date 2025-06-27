"use client";

import { useGameState } from '@/contexts/GameStateContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Warehouse, Truck, AlertCircle, Package } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';

export default function WarehouseDisplay() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const totalPallets = Object.values(state.pallets).reduce((sum, p) => sum + p.quantity, 0);

  const handleShip = () => {
    if (totalPallets > 0) {
      const earnings = Object.values(state.pallets).reduce((sum, p) => sum + (p.quantity * p.value), 0);
      dispatch({ type: 'SHIP_GOODS' });
      toast({
        title: "Shipment Sent!",
        description: `You earned $${Math.floor(earnings).toLocaleString()} for ${totalPallets} pallets.`,
      })
    } else {
      toast({
        title: "Shipping Failed",
        description: "No pallets in warehouse to ship.",
        variant: "destructive",
      })
    }
  };
  
  const warehouseUsage = (totalPallets / state.warehouseCapacity) * 100;
  const isFull = totalPallets >= state.warehouseCapacity;

  return (
    <Card className="shadow-lg flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-headline">
          <Warehouse className="w-6 h-6 text-primary" />
          Warehouse
        </CardTitle>
        <CardDescription>
          Stores finished goods ready for shipping.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium">Storage</span>
            <span className="text-muted-foreground">{totalPallets.toLocaleString()} / {state.warehouseCapacity.toLocaleString()} Pallets</span>
          </div>
          <Progress value={warehouseUsage} className="transition-all duration-500 ease-out" />
        </div>
        
        {isFull && (
          <div className="flex items-center p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p className="text-sm font-medium">Warehouse full! Production is blocked.</p>
          </div>
        )}

        {totalPallets > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
                <h4 className="font-medium">Stored Goods</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {Object.entries(state.pallets).map(([productName, details]) => (
                    <div key={productName} className="flex items-center justify-between bg-secondary/30 p-2 rounded-md">
                        <span className="flex items-center gap-1.5 truncate" title={productName}><Package className="w-4 h-4 text-muted-foreground flex-shrink-0" /> <span className="truncate">{productName}</span></span>
                        <span className="font-mono">{details.quantity.toLocaleString()}</span>
                    </div>
                ))}
                </div>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleShip}
          disabled={totalPallets === 0}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          size="lg"
        >
          <Truck className="mr-2 h-5 w-5" />
          Ship All Goods
        </Button>
      </CardFooter>
    </Card>
  );
}
