
"use client";

import { useGameState } from '@/contexts/GameStateContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Package, DollarSign, Clock, ChevronsRight, Loader2, Wrench } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"

export default function OrdersTab() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const handleAcceptOrder = (order) => {
    dispatch({ type: 'ACCEPT_ORDER', order });
    toast({
      title: "Order Accepted!",
      description: `"${order.productName}" added to production queue.`,
    })
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 font-headline">Available Orders</h3>
        <ScrollArea className="h-64 pr-4">
          <div className="space-y-4">
            {state.availableOrders.length > 0 ? state.availableOrders.map(order => (
              <Card key={order.id} className="bg-secondary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{order.productName}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="flex items-center gap-1.5"><Package className="w-4 h-4"/>Quantity: {order.quantity}</div>
                  <div className="flex items-center gap-1.5"><DollarSign className="w-4 h-4"/>Reward: ${order.reward}</div>
                  <div className="flex items-center gap-1.5"><Clock className="w-4 h-4"/>Time: {order.timeToProduce}s</div>
                  <div className="flex items-center gap-1.5 col-span-2"><Wrench className="w-4 h-4"/>Materials / Pallet:</div>
                  <ul className="list-disc list-inside text-xs pl-6 col-span-2 -mt-1">
                    {Object.entries(order.materialRequirements).map(([mat, qty]) => (
                        <li key={mat}>{qty}x {mat}</li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button onClick={() => handleAcceptOrder(order)} size="sm" className="w-full">Accept Order</Button>
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
        <h3 className="text-lg font-semibold mb-2 font-headline">Production Queue</h3>
        <div className="space-y-2">
          {state.productionQueue.length > 0 ? state.productionQueue.map((order, index) => (
            <div key={order.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/30">
              <span className="font-medium text-sm flex items-center gap-2"><ChevronsRight className="w-4 h-4 text-primary"/>{order.productName}</span>
              <span className="text-xs text-muted-foreground">Qty: {order.quantity}</span>
            </div>
          )) : <p className="text-center text-muted-foreground p-4">Queue is empty.</p>}
        </div>
      </div>
    </div>
  );
}
