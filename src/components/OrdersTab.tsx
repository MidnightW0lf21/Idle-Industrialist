
"use client";

import { useGameState } from '@/contexts/GameStateContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Package, DollarSign, Clock, ChevronsRight, Loader2, Wrench, Star } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

const QUEUE_CAP = 10;

export default function OrdersTab() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAcceptOrder = (order) => {
    if (state.productionQueue.length >= QUEUE_CAP) {
      toast({
        title: "Queue Full",
        description: `The production queue can only hold a maximum of ${QUEUE_CAP} orders.`,
        variant: "destructive",
      });
      return;
    }
    dispatch({ type: 'ACCEPT_ORDER', order });
    toast({
      title: "Order Accepted!",
      description: `"${order.productName}" added to production queue.`,
    })
  };

  const isQueueFull = state.productionQueue.length >= QUEUE_CAP;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 font-headline">Available Orders</h3>
        <ScrollArea className="h-64 pr-4">
          <div className="space-y-4">
            {isClient && state.availableOrders.length > 0 ? state.availableOrders.map(order => (
              <Card key={order.id} className={cn("bg-secondary/30", order.isContract && "border-accent/50 ring-2 ring-accent/20")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex justify-between items-center">
                    <span>{order.productName}</span>
                     {order.isContract && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-accent">
                              <Star className="w-4 h-4"/>
                              <span>CONTRACT</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>High value contract. Grants reputation.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="flex items-center gap-1.5"><Package className="w-4 h-4"/>Quantity: {order.quantity}</div>
                  <div className="flex items-center gap-1.5"><DollarSign className="w-4 h-4"/>Reward: ${order.reward.toLocaleString()}</div>
                  <div className="flex items-center gap-1.5"><Clock className="w-4 h-4"/>Time: {order.timeToProduce}s</div>
                  {order.reputationReward && (
                    <div className="flex items-center gap-1.5"><Star className="w-4 h-4 text-yellow-400"/>Reputation: +{order.reputationReward}</div>
                  )}
                  <div className="flex items-center gap-1.5 col-span-2"><Wrench className="w-4 h-4"/>Materials / Pallet:</div>
                  <ul className="list-disc list-inside text-xs pl-6 col-span-2 -mt-1">
                    {Object.entries(order.materialRequirements).map(([mat, qty]) => (
                        <li key={mat}>{qty}x {mat}</li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button 
                    onClick={() => handleAcceptOrder(order)} 
                    size="sm" 
                    className="w-full"
                    disabled={isQueueFull}
                  >
                    Accept Order
                  </Button>
                </CardFooter>
              </Card>
            )) : (
              <div className="text-center text-muted-foreground p-4 flex flex-col items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                <p>Waiting for new orders...</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      <Separator />
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <h3 className="text-lg font-semibold font-headline">Production Queue</h3>
          <span className="text-sm text-muted-foreground">{isClient ? state.productionQueue.length : 0} / {QUEUE_CAP}</span>
        </div>
        <TooltipProvider delayDuration={100}>
          <div className="space-y-2">
            {isClient && state.productionQueue.length > 0 ? state.productionQueue.map((order) => (
              <Tooltip key={order.id}>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between p-2 rounded-md bg-secondary/30 w-full cursor-default">
                    <span className="font-medium text-sm flex items-center gap-2 truncate"><ChevronsRight className="w-4 h-4 text-primary"/>{order.productName}</span>
                    <span className="text-xs text-muted-foreground">Qty: {order.quantity}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold mb-1">Required Materials:</p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    {Object.entries(order.materialRequirements).map(([mat, qty]) => (
                        <li key={mat}>{qty}x {mat} / pallet</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            )) : <p className="text-center text-muted-foreground p-4">Queue is empty.</p>}
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
