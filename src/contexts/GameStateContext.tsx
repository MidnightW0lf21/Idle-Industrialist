"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { GameState, GameAction, Order, ProductionLine, Upgrade, StoredPallet } from '@/types';
import { generateNewOrder } from '@/ai/flows/order-generation-flow';

const initialOrders: Order[] = [
  { id: 1, productName: "Standard Widgets", quantity: 10, reward: 150, timeToProduce: 10 },
  { id: 2, productName: "Advanced Gears", quantity: 5, reward: 250, timeToProduce: 20 },
  { id: 3, productName: "Basic Frames", quantity: 20, reward: 100, timeToProduce: 5 },
  { id: 4, productName: "Complex Circuits", quantity: 8, reward: 500, timeToProduce: 30 },
];

const initialUpgrades: Record<string, Upgrade> = {
  'efficiency_1': { id: 'efficiency_1', name: "Improved Lubricants", description: "Increase all machine efficiency by 10%.", level: 1, cost: 500 },
  'add_line_1': { id: 'add_line_1', name: "New Production Line", description: "Build a second production line.", level: 1, cost: 1000 },
  'warehouse_1': { id: 'warehouse_1', name: "Warehouse Expansion", description: "Increase warehouse capacity by 100 pallets.", level: 1, cost: 750 },
};

const NEW_ORDER_INTERVAL = 30000; // 30 seconds

const initialState: GameState = {
  money: 500,
  pallets: {},
  warehouseCapacity: 100,
  productionLines: [{ id: 1, orderId: null, productName: null, progress: 0, timeToProduce: 0, efficiency: 1, quantity: 0, reward: 0 }],
  availableOrders: initialOrders,
  productionQueue: [],
  upgrades: initialUpgrades,
  lastOrderTimestamp: Date.now(),
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'TICK': {
      let newState = { ...state };
      
      // Production Logic
      newState.productionLines = newState.productionLines.map(line => {
        if (line.orderId !== null) {
          const progressIncrease = (100 / line.timeToProduce) * line.efficiency;
          const newProgress = line.progress + progressIncrease;

          if (newProgress >= 100) {
            const productName = line.productName!;
            const valuePerPallet = line.reward / line.quantity;
            
            const existingPallets = newState.pallets[productName] || { quantity: 0, value: valuePerPallet };
            
            const palletsInWarehouse = Object.values(newState.pallets).reduce((sum, p) => sum + p.quantity, 0);
            const spaceAvailable = newState.warehouseCapacity - palletsInWarehouse;
            const palletsToAdd = Math.min(line.quantity, spaceAvailable);

            if (palletsToAdd > 0) {
               newState.pallets[productName] = {
                 quantity: existingPallets.quantity + palletsToAdd,
                 value: valuePerPallet,
               };
            }
            // Reset the line
            return { ...line, orderId: null, productName: null, progress: 0, timeToProduce: 0, quantity: 0, reward: 0 };
          }
          return { ...line, progress: newProgress };
        }
        return line;
      });

      // Auto-assign from queue if a line is free and warehouse has space
      const freeLineIndex = newState.productionLines.findIndex(l => l.orderId === null);
      if (freeLineIndex !== -1 && newState.productionQueue.length > 0) {
        const nextOrder = newState.productionQueue[0];
        const currentPallets = Object.values(newState.pallets).reduce((sum, p) => sum + p.quantity, 0);

        if (currentPallets + nextOrder.quantity <= newState.warehouseCapacity) {
          newState.productionLines[freeLineIndex] = {
            ...newState.productionLines[freeLineIndex],
            orderId: nextOrder.id,
            productName: nextOrder.productName,
            timeToProduce: nextOrder.timeToProduce,
            quantity: nextOrder.quantity,
            reward: nextOrder.reward,
            progress: 0,
          };
          newState.productionQueue = newState.productionQueue.slice(1);
        }
      }
      
      // Update timestamp for AI Order Generation
      if (Date.now() - newState.lastOrderTimestamp > NEW_ORDER_INTERVAL) {
        newState.lastOrderTimestamp = Date.now();
      }

      return newState;
    }

    case 'ACCEPT_ORDER': {
      if (state.productionQueue.find(o => o.id === action.order.id)) return state;
      return {
        ...state,
        availableOrders: state.availableOrders.filter(o => o.id !== action.order.id),
        productionQueue: [...state.productionQueue, action.order],
      };
    }

    case 'SHIP_GOODS': {
      if (Object.keys(state.pallets).length === 0) return state;
      
      const earnings = Object.values(state.pallets).reduce((sum, p) => {
        return sum + (p.quantity * p.value);
      }, 0);

      return {
        ...state,
        money: state.money + earnings,
        pallets: {},
      };
    }
    
    case 'PURCHASE_UPGRADE': {
      const upgrade = state.upgrades[action.upgradeId];
      if (!upgrade || state.money < upgrade.cost) {
        return state;
      }
      
      let newState = { ...state, money: state.money - upgrade.cost };
      const newUpgrades = { ...newState.upgrades };
      delete newUpgrades[action.upgradeId];
      newState.upgrades = newUpgrades;
      
      switch(action.upgradeId) {
        case 'efficiency_1':
          newState.productionLines = newState.productionLines.map(l => ({...l, efficiency: l.efficiency * 1.1}));
          break;
        case 'add_line_1':
          const newLineId = newState.productionLines.length + 1;
          newState.productionLines.push({ id: newLineId, orderId: null, productName: null, progress: 0, timeToProduce: 0, efficiency: 1, quantity: 0, reward: 0 });
          break;
        case 'warehouse_1':
          newState.warehouseCapacity += 100;
          break;
      }

      return newState;
    }

    case 'ADD_ORDER': {
      return {
        ...state,
        availableOrders: [...state.availableOrders, action.order]
      }
    }

    default:
      return state;
  }
};

const GameStateContext = createContext<{ state: GameState; dispatch: React.Dispatch<GameAction> } | undefined>(undefined);

export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Game Loop
  useEffect(() => {
    const gameLoop = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 1000);

    return () => clearInterval(gameLoop);
  }, []);

  // Effect for AI order generation
  const { money, productionLines, warehouseCapacity, availableOrders, pallets, lastOrderTimestamp } = state;
  useEffect(() => {
    // This function is defined inside useEffect to capture the latest state
    const generate = async () => {
      // Don't overwhelm the player, and don't generate if there are still initial orders
      if (availableOrders.length >= 10 || availableOrders.some(o => o.id <= 4)) return;

      const totalPallets = Object.values(pallets).reduce((sum, p) => sum + p.quantity, 0);
      const warehouseUsage = (totalPallets / warehouseCapacity) * 100;
      
      const input = {
          playerMoney: money,
          productionCapacity: productionLines.length,
          warehouseUsage: warehouseUsage,
      };
      
      try {
        const newOrderData = await generateNewOrder(input);
        const newId = (Math.max(...availableOrders.map(o => o.id), 0) || 0) + 1;
        
        dispatch({
            type: 'ADD_ORDER',
            order: { ...newOrderData, id: newId }
        });
      } catch (e) {
        console.error("Failed to generate new order:", e);
      }
    };
    generate();
    // Re-run this effect ONLY when lastOrderTimestamp changes
  }, [lastOrderTimestamp]);

  return (
    <GameStateContext.Provider value={{ state, dispatch }}>
      {children}
    </GameStateContext.Provider>
  );
};

export const useGameState = () => {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
};
