
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import OrdersTab from './OrdersTab';
import UpgradesTab from './UpgradesTab';
import WorkersTab from './WorkersTab';
import InvoicesTab from './InvoicesTab';
import AchievementsTab from './AchievementsTab';
import EventsTab from './EventsTab';
import ResearchTab from './ResearchTab';
import { ClipboardList, ArrowUpCircle, Users, FileText, Award, Megaphone, FlaskConical } from 'lucide-react';
import { useGameState } from '@/contexts/GameStateContext';

export default function ControlPanel() {
  const { state } = useGameState();
  const hasActiveEvent = !!state.activeEvent;
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <Card className="shadow-lg sticky top-24">
      <CardContent className="p-0">
        <Tabs defaultValue="orders" className="w-full">
          <TooltipProvider delayDuration={100}>
            <TabsList className="grid w-full grid-cols-7 rounded-t-lg rounded-b-none">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="orders">
                    <ClipboardList className="h-5 w-5" />
                    <span className="sr-only">Orders</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Orders</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="invoices">
                    <FileText className="h-5 w-5" />
                    <span className="sr-only">Invoices</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Invoices</p>
                </TooltipContent>
              </Tooltip>
               <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="events" className="relative">
                    <Megaphone className="h-5 w-5" />
                     {isClient && hasActiveEvent && (
                      <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                      </span>
                    )}
                    <span className="sr-only">Events</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Events</p>
                </TooltipContent>
              </Tooltip>
               <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="research">
                    <FlaskConical className="h-5 w-5" />
                    <span className="sr-only">Research</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>R&amp;D</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="upgrades">
                    <ArrowUpCircle className="h-5 w-5" />
                    <span className="sr-only">Upgrades</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upgrades</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="workers">
                    <Users className="h-5 w-5" />
                    <span className="sr-only">Workers</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Workers</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="achievements">
                    <Award className="h-5 w-5" />
                    <span className="sr-only">Achievements</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Achievements</p>
                </TooltipContent>
              </Tooltip>
            </TabsList>
          </TooltipProvider>
          <div className="p-4 md:p-6">
            <TabsContent value="orders">
              <OrdersTab />
            </TabsContent>
            <TabsContent value="invoices">
              <InvoicesTab />
            </TabsContent>
            <TabsContent value="events">
              <EventsTab />
            </TabsContent>
             <TabsContent value="research">
              <ResearchTab />
            </TabsContent>
            <TabsContent value="upgrades">
              <UpgradesTab />
            </TabsContent>
            <TabsContent value="workers">
              <WorkersTab />
            </TabsContent>
            <TabsContent value="achievements">
              <AchievementsTab />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
