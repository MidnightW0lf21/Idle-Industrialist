"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OrdersTab from './OrdersTab';
import UpgradesTab from './UpgradesTab';
import WorkersTab from './WorkersTab';
import InvoicesTab from './InvoicesTab';
import { ClipboardList, ArrowUpCircle, Users, FileText } from 'lucide-react';

export default function ControlPanel() {
  return (
    <Card className="shadow-lg sticky top-24">
      <CardContent className="p-0">
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-t-lg rounded-b-none">
            <TabsTrigger value="orders">
              <ClipboardList className="mr-2 h-4 w-4" /> Orders
            </TabsTrigger>
             <TabsTrigger value="invoices">
              <FileText className="mr-2 h-4 w-4" /> Invoices
            </TabsTrigger>
            <TabsTrigger value="upgrades">
              <ArrowUpCircle className="mr-2 h-4 w-4" /> Upgrades
            </TabsTrigger>
            <TabsTrigger value="workers">
              <Users className="mr-2 h-4 w-4" /> Workers
            </TabsTrigger>
          </TabsList>
          <div className="p-4 md:p-6">
            <TabsContent value="orders">
              <OrdersTab />
            </TabsContent>
            <TabsContent value="invoices">
              <InvoicesTab />
            </TabsContent>
            <TabsContent value="upgrades">
              <UpgradesTab />
            </TabsContent>
            <TabsContent value="workers">
              <WorkersTab />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
