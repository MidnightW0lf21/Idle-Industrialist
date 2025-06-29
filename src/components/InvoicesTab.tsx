
"use client";

import React, { useState, useEffect } from 'react';
import { useGameState, AVAILABLE_RAW_MATERIALS } from '@/contexts/GameStateContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, FileText, Clock, Truck, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';

export default function InvoicesTab() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const [selectedMaterial, setSelectedMaterial] = useState(Object.keys(AVAILABLE_RAW_MATERIALS)[0]);
  const [quantity, setQuantity] = useState(100);
  const [totalCost, setTotalCost] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const priceChangeEvent = state.activeEvent?.type === 'RAW_MATERIAL_PRICE_CHANGE' ? state.activeEvent : null;
  const deliveryDelayEvent = state.activeEvent?.type === 'SUPPLY_CHAIN_DELAY' ? state.activeEvent : null;
  
  useEffect(() => {
    const materialDetails = AVAILABLE_RAW_MATERIALS[selectedMaterial];
    const numericQuantity = Number(quantity);

    if (materialDetails && numericQuantity > 0) {
      let costMultiplier = 1;
      if (priceChangeEvent && priceChangeEvent.targetItem === selectedMaterial) {
        costMultiplier = priceChangeEvent.priceMultiplier || 1;
      }
      setTotalCost(materialDetails.costPerUnit * numericQuantity * costMultiplier);

      let time = materialDetails.timePerUnit * numericQuantity * state.deliveryTimeModifier;
      if (deliveryDelayEvent) {
          time += deliveryDelayEvent.delayTime || 0;
      }
      setTotalTime(time);
    } else {
      setTotalCost(0);
      setTotalTime(0);
    }
  }, [selectedMaterial, quantity, priceChangeEvent, deliveryDelayEvent, state.deliveryTimeModifier]);


  const handleOrderMaterials = () => {
    dispatch({ 
      type: 'ORDER_RAW_MATERIALS', 
      materialName: selectedMaterial,
      quantity: Number(quantity),
    });
    toast({
      title: "Order Placed!",
      description: `Invoice for ${quantity}x ${selectedMaterial} created.`,
    });
  };

  const handlePayInvoice = (invoiceId: number) => {
    const invoice = state.invoices.find(i => i.id === invoiceId);
    if (invoice && state.money >= invoice.totalCost) {
      dispatch({ type: 'PAY_INVOICE', invoiceId });
      toast({
        title: "Invoice Paid!",
        description: `Delivery for ${invoice.itemName} has started.`,
      });
    } else {
       toast({
        title: "Payment Failed",
        description: "Not enough money to pay this invoice.",
        variant: 'destructive'
      });
    }
  }

  const formatTime = (seconds: number) => {
    if (seconds < 0 || !isFinite(seconds) || isNaN(seconds)) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const unpaidInvoices = state.invoices.filter(i => i.status === 'unpaid');
  const paidInvoices = state.invoices.filter(i => i.status === 'paid');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Order Raw Materials</CardTitle>
          <CardDescription>Order shipments of raw materials to keep your factory running.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isClient && priceChangeEvent && (
             <div className="flex items-center gap-2 text-sm p-2 rounded-md bg-destructive/10 text-destructive">
              <TrendingUp className="h-5 w-5" />
              <p className="font-medium">{priceChangeEvent.name}: {priceChangeEvent.targetItem} prices are x{priceChangeEvent.priceMultiplier?.toFixed(1)}!</p>
            </div>
          )}
           {isClient && deliveryDelayEvent && (
             <div className="flex items-center gap-2 text-sm p-2 rounded-md bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">{deliveryDelayEvent.name}: All deliveries delayed by {formatTime(deliveryDelayEvent.delayTime || 0)}!</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
             <div>
                <Label htmlFor="material-select">Material</Label>
                <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                  <SelectTrigger id="material-select">
                    <SelectValue placeholder="Select material..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AVAILABLE_RAW_MATERIALS).map(([name, details]) => {
                       let costMultiplier = 1;
                        if (priceChangeEvent && priceChangeEvent.targetItem === name) {
                          costMultiplier = priceChangeEvent.priceMultiplier || 1;
                        }
                       const displayCost = details.costPerUnit * costMultiplier;

                      return (
                        <SelectItem key={name} value={name}>
                          {name} (${displayCost.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}/unit)
                          {costMultiplier !== 1 && (
                            costMultiplier > 1 
                            ? <TrendingUp className="inline w-4 h-4 ml-2 text-destructive" />
                            : <TrendingDown className="inline w-4 h-4 ml-2 text-green-500" />
                          )}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
             </div>
              <div>
                <Label htmlFor="quantity-input">Quantity</Label>
                <Input
                  id="quantity-input"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                />
              </div>
          </div>
           <div className="flex justify-between items-center p-2 bg-secondary/30 rounded-md text-sm">
                <div className="space-y-1">
                    <p className="font-semibold">Total Cost:</p>
                    <p className="font-semibold">Est. Delivery Time:</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-mono">${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  <p className="font-mono">{formatTime(totalTime)}</p>
                </div>
            </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleOrderMaterials} className="w-full" disabled={quantity <= 0}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Place Order
          </Button>
        </CardFooter>
      </Card>

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 font-headline">Pending Invoices</h3>
          <ScrollArea className="h-40 pr-4">
            <div className="space-y-3">
              {isClient && unpaidInvoices.length > 0 ? unpaidInvoices.map(invoice => (
                <Card key={invoice.id} className="bg-secondary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Invoice #{invoice.id}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p>{invoice.quantity}x {invoice.itemName}</p>
                    <p className="font-semibold">Total: ${invoice.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => handlePayInvoice(invoice.id)}
                      disabled={state.money < invoice.totalCost}
                    >
                      Pay Invoice
                    </Button>
                  </CardFooter>
                </Card>
              )) : (
                <p className="text-center text-muted-foreground p-4">No unpaid invoices.</p>
              )}
            </div>
          </ScrollArea>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2 font-headline">In-Transit Shipments</h3>
           <ScrollArea className="h-40 pr-4">
            <div className="space-y-3">
              {isClient && paidInvoices.length > 0 ? paidInvoices.map(invoice => {
                const timeRemaining = (invoice.deliveryArrivalTime! - Date.now()) / 1000;
                const progress = (1 - (timeRemaining / invoice.totalDeliveryTime)) * 100;
                return (
                 <Card key={invoice.id} className="bg-secondary/30">
                   <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /> Delivery for Invoice #{invoice.id}</CardTitle>
                  </CardHeader>
                   <CardContent className="space-y-2">
                     <p className="text-sm">{invoice.quantity}x {invoice.itemName}</p>
                     <Progress value={progress} className="h-2" />
                     <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>ETA:</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(timeRemaining)}</span>
                     </div>
                   </CardContent>
                 </Card>
                )
              }) : (
                 <p className="text-center text-muted-foreground p-4">No incoming shipments.</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
