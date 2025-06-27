
"use client";

import { useGameState } from '@/contexts/GameStateContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, FileText, Clock, Truck } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Progress } from './ui/progress';

const MATERIALS_ORDER_CONFIG = {
  itemName: "Electronic Components",
  quantity: 100,
  cost: 500,
  deliveryTime: 60, // 1 minute
}

export default function InvoicesTab() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const handleOrderMaterials = () => {
    dispatch({ 
      type: 'ORDER_RAW_MATERIALS', 
      ...MATERIALS_ORDER_CONFIG
    });
    toast({
      title: "Order Placed!",
      description: `Invoice for ${MATERIALS_ORDER_CONFIG.quantity} ${MATERIALS_ORDER_CONFIG.itemName} created.`,
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
    if (seconds < 0 || !isFinite(seconds)) return '00:00';
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
          <CardDescription>Order a shipment of raw materials to keep your production lines running.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex justify-between items-center p-2 bg-secondary/30 rounded-md">
                <span>{MATERIALS_ORDER_CONFIG.quantity}x {MATERIALS_ORDER_CONFIG.itemName}</span>
                <span className="font-semibold">${MATERIALS_ORDER_CONFIG.cost}</span>
            </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleOrderMaterials} className="w-full">
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
              {unpaidInvoices.length > 0 ? unpaidInvoices.map(invoice => (
                <Card key={invoice.id} className="bg-secondary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Invoice #{invoice.id}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p>{invoice.quantity}x {invoice.itemName}</p>
                    <p className="font-semibold">Total: ${invoice.totalCost.toLocaleString()}</p>
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
              {paidInvoices.length > 0 ? paidInvoices.map(invoice => {
                const timeRemaining = (invoice.deliveryArrivalTime! - Date.now()) / 1000;
                const progress = (1 - (timeRemaining / invoice.deliveryTime)) * 100;
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
