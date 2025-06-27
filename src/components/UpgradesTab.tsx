"use client";

import { useGameState } from '@/contexts/GameStateContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wrench } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"

export default function UpgradesTab() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const handlePurchase = (upgradeId) => {
    const upgrade = state.upgrades[upgradeId];
    if (state.money >= upgrade.cost) {
      dispatch({ type: 'PURCHASE_UPGRADE', upgradeId });
      toast({
        title: "Upgrade Purchased!",
        description: `You bought: ${upgrade.name}.`,
      })
    } else {
      toast({
        title: "Purchase Failed",
        description: "Not enough money for this upgrade.",
        variant: "destructive",
      })
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold font-headline">Factory Upgrades</h3>
      <ScrollArea className="h-[28rem] pr-4">
        <div className="space-y-4">
        {Object.values(state.upgrades).length > 0 ? Object.values(state.upgrades).map(upgrade => {
            let displayName = upgrade.name;
            if (upgrade.id === 'add_line') {
              displayName = `${upgrade.name} (${state.productionLines.length + 1} / 12)`;
            } else if (upgrade.id === 'warehouse_expansion') {
              displayName = `${upgrade.name} (Level ${upgrade.level})`
            }

            return (
              <Card key={upgrade.id} className="bg-secondary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{displayName}</CardTitle>
                  <CardDescription>{upgrade.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button 
                    onClick={() => handlePurchase(upgrade.id)} 
                    disabled={state.money < upgrade.cost}
                    size="sm" 
                    className="w-full"
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    Buy for ${upgrade.cost.toLocaleString()}
                  </Button>
                </CardFooter>
              </Card>
            )
        }) : <p className="text-center text-muted-foreground p-4">All upgrades purchased.</p>}
        </div>
      </ScrollArea>
    </div>
  );
}
