
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useGameState, AVAILABLE_RAW_MATERIALS, RAW_MATERIAL_UNITS_PER_PALLET_SPACE } from '@/contexts/GameStateContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Warehouse, Truck, AlertCircle, Package, Clock, CircleDollarSign, Component, TrendingUp, Car, MoveHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ScrollArea } from './ui/scroll-area';

const ICONS: Record<string, LucideIcon> = {
  Truck,
  MoveHorizontal,
  Car,
};

export default function WarehouseDisplay() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  
  const [palletsToShip, setPalletsToShip] = useState<Record<string, number>>({});
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const totalStoredPallets = Object.values(state.pallets).reduce((sum, p) => sum + p.quantity, 0);
  const totalRawMaterialUnits = Object.values(state.rawMaterials).reduce((sum, m) => sum + (m?.quantity || 0), 0);
  const rawMaterialSpaceUsed = totalRawMaterialUnits / RAW_MATERIAL_UNITS_PER_PALLET_SPACE;
  const totalSpaceUsed = totalStoredPallets + rawMaterialSpaceUsed;
  const warehouseUsage = (totalSpaceUsed / state.warehouseCapacity) * 100;
  const isFull = totalSpaceUsed >= state.warehouseCapacity;

  
  const handlePalletSelectionChange = (productName: string, quantity: number) => {
    const availableQuantity = state.pallets[productName]?.quantity || 0;
    const newQuantity = Math.max(0, Math.min(availableQuantity, quantity));
    setPalletsToShip(prev => ({
      ...prev,
      [productName]: newQuantity,
    }));
  };
  
  const { totalSelectedQuantity, totalSelectedValue } = useMemo(() => {
    let quantity = 0;
    let value = 0;
    for (const [productName, num] of Object.entries(palletsToShip)) {
      if (num > 0) {
        quantity += num;
        let palletValue = state.pallets[productName]?.value || 0;
        if (state.activeEvent?.type === 'PRODUCT_DEMAND_SURGE' && state.activeEvent.targetItem === productName) {
            palletValue *= (state.activeEvent.priceMultiplier || 1);
        }
        value += num * palletValue;
      }
    }
    return { totalSelectedQuantity: quantity, totalSelectedValue: value };
  }, [palletsToShip, state.pallets, state.activeEvent]);

  const selectedVehicle = selectedVehicleId ? state.vehicles[selectedVehicleId] : null;

  const handleDispatch = () => {
    if (!selectedVehicle) {
      toast({ title: "No Vehicle Selected", description: "Please choose a truck for the shipment.", variant: "destructive" });
      return;
    }
    if (totalSelectedQuantity === 0) {
      toast({ title: "No Pallets Selected", description: "Please select some pallets to ship.", variant: "destructive" });
      return;
    }
    if (totalSelectedQuantity > selectedVehicle.capacity) {
      toast({ title: "Over Capacity", description: `Your selection (${totalSelectedQuantity}) exceeds the ${selectedVehicle.name}'s capacity of ${selectedVehicle.capacity}.`, variant: "destructive" });
      return;
    }

    dispatch({ type: 'START_SHIPMENT', vehicleId: selectedVehicle.id, palletsToShip });
    toast({ title: "Shipment Dispatched!", description: `${selectedVehicle.name} is on its way with ${totalSelectedQuantity} pallets.` });
    
    // Reset form
    setPalletsToShip({});
    setSelectedVehicleId(null);
  };
  
  const formatTime = (seconds: number) => {
    if (seconds < 0 || !isFinite(seconds) || isNaN(seconds)) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const demandSurgeEvent = state.activeEvent?.type === 'PRODUCT_DEMAND_SURGE' ? state.activeEvent : null;

  return (
    <Card className="shadow-lg flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-headline">
          <Warehouse className="w-6 h-6 text-primary" />
          Warehouse & Shipping
        </CardTitle>
        <div className="flex justify-between items-center pt-2">
            <span className="font-medium text-sm">Storage Capacity</span>
            <span className="text-muted-foreground text-sm">{isClient ? `${Math.ceil(totalSpaceUsed).toLocaleString()} / ${state.warehouseCapacity.toLocaleString()}` : '... / ...'} Pallet Spaces</span>
        </div>
        <Progress value={isClient ? warehouseUsage : 0} className="transition-all duration-500 ease-out h-2" />
        {isClient && isFull && (
          <div className="flex items-center pt-2 text-destructive text-xs">
            <AlertCircle className="w-4 h-4 mr-1" />
            <p className="font-medium">Warehouse full! Production & deliveries will be blocked.</p>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-grow space-y-6">
        <div className="space-y-2">
          <h3 className="font-semibold font-headline flex items-center gap-2">
            <Component className="w-5 h-5 text-muted-foreground" />
            Raw Materials Stock
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 rounded-md border p-2">
            {Object.keys(AVAILABLE_RAW_MATERIALS).map((name) => (
              <div key={name} className="bg-secondary/30 p-2 rounded-md text-sm flex flex-col justify-between">
                <span className="font-medium text-muted-foreground">{name}</span>
                <span className="font-mono font-bold text-lg text-right">{isClient ? (state.rawMaterials[name]?.quantity || 0).toLocaleString() : '...'}</span>
              </div>
            ))}
          </div>
        </div>


        <Separator />
        
        {/* SHIPMENT CREATION */}
        <div className="space-y-4">
          <h3 className="font-semibold font-headline">Create Shipment</h3>
          {isClient && demandSurgeEvent && (
              <div className="flex items-center gap-2 text-sm p-2 rounded-md bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
                <p className="font-medium">{demandSurgeEvent.name}: Demand for {demandSurgeEvent.targetItem} is x{demandSurgeEvent.priceMultiplier?.toFixed(1)}!</p>
              </div>
          )}
          
          {isClient && totalStoredPallets > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pallet Selection */}
              <div className="space-y-2">
                <Label>1. Select Pallets</Label>
                <ScrollArea className="h-40 w-full rounded-md border p-2">
                  <div className="space-y-2">
                    {Object.entries(state.pallets).map(([productName, details]) => (
                      <div key={productName} className="flex items-center gap-2 text-sm">
                        <Input 
                          type="number"
                          value={palletsToShip[productName] || 0}
                          onChange={(e) => handlePalletSelectionChange(productName, parseInt(e.target.value, 10))}
                          className="h-8 w-20"
                          min="0"
                          max={details.quantity}
                        />
                        <div className="flex-grow truncate">
                          <p className="font-medium truncate" title={productName}>{productName}</p>
                          <p className="text-xs text-muted-foreground">({details.quantity} available)</p>
                        </div>
                         {demandSurgeEvent && demandSurgeEvent.targetItem === productName && (
                           <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                         )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Vehicle Selection */}
              <div className="space-y-2">
                <Label>2. Select Vehicle</Label>
                <RadioGroup value={selectedVehicleId || ''} onValueChange={setSelectedVehicleId} className="rounded-md border p-2 space-y-1">
                  {Object.values(state.vehicles).map(vehicle => {
                    const VehicleIcon = ICONS[vehicle.iconName] || Truck;
                    return (
                      <Label key={vehicle.id} htmlFor={vehicle.id} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 cursor-pointer text-sm">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={vehicle.id} id={vehicle.id} />
                          <VehicleIcon className="w-4 h-4" />
                          {vehicle.name}
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          <p>Cap: {vehicle.capacity}</p>
                          <p>Time: {vehicle.timePerPallet}s/pallet</p>
                        </div>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </div>
            </div>
          ) : (
             <p className="text-sm text-center text-muted-foreground py-8">{isClient ? 'No goods in warehouse to ship.' : 'Loading...'}</p>
          )}
        </div>

        {/* ACTIVE SHIPMENTS */}
        <div className="space-y-2">
          <h3 className="font-semibold font-headline">Active Shipments</h3>
           <ScrollArea className="h-24 pr-4">
          {isClient && state.activeShipments.length > 0 ? (
            <div className="space-y-2">
              {state.activeShipments.map(shipment => {
                const timeRemaining = (shipment.arrivalTime - Date.now()) / 1000;
                const progress = (1 - (timeRemaining / shipment.totalDeliveryTime)) * 100;
                return (
                  <div key={shipment.id} className="text-sm p-2 rounded-md bg-secondary/50">
                    <div className="flex justify-between items-center">
                      <span className="font-medium flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /> {shipment.vehicle.name}</span>
                      <span className="font-mono text-green-600">${shipment.totalValue.toLocaleString()}</span>
                    </div>
                     <Progress value={progress} className="h-1 mt-1" />
                    <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                        <span>{shipment.totalQuantity} pallets</span>
                        <span>{formatTime(timeRemaining)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-center text-muted-foreground py-4">{isClient ? 'No active shipments.' : 'Loading...'}</p>
          )}
           </ScrollArea>
        </div>
      </CardContent>
      
      <CardFooter className="flex-col items-stretch space-y-2">
        <Separator />
        <div className="flex justify-between items-center text-sm p-1">
          <span className="font-semibold">Selected:</span>
          <div className="text-right space-y-1">
            <p className="flex items-center gap-1.5 justify-end"><Package className="w-4 h-4" />{isClient ? `${totalSelectedQuantity.toLocaleString()} pallets` : '...'}</p>
            <p className="flex items-center gap-1.5 justify-end"><CircleDollarSign className="w-4 h-4" />{isClient ? `$${totalSelectedValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`: '$...'}</p>
            {isClient && selectedVehicle && totalSelectedQuantity > 0 && (
              <p className="flex items-center gap-1.5 justify-end text-muted-foreground"><Clock className="w-4 h-4" />Est. Time: {formatTime(selectedVehicle.timePerPallet * totalSelectedQuantity)}</p>
            )}
          </div>
        </div>
        <Button 
          onClick={handleDispatch}
          disabled={!isClient || totalSelectedQuantity === 0 || !selectedVehicleId || totalSelectedQuantity > (selectedVehicle?.capacity ?? 0)}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          size="lg"
        >
          <Truck className="mr-2 h-5 w-5" />
          Dispatch Shipment
        </Button>
      </CardFooter>
    </Card>
  );
}
