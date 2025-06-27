"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import type { GameState, GameAction, Order, ProductionLine, Upgrade } from '@/types';

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

const initialState: GameState = {
  money: 500,
  pallets: 0,
  warehouseCapacity: 100,
  productionLines: [{ id: 1, orderId: null, productName: null, progress: 0, timeToProduce: 0, efficiency: 1 }],
  availableOrders: initialOrders,
  productionQueue: [],
  isShipping: false,
  upgrades: initialUpgrades,
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'TICK': {
      let newState = { ...state };
      let newPallets = newState.pallets;

      newState.productionLines = newState.productionLines.map(line => {
        if (line.orderId !== null) {
          const progressIncrease = (100 / line.timeToProduce) * line.efficiency;
          const newProgress = line.progress + progressIncrease;

          if (newProgress >= 100) {
            const finishedOrder = newState.productionQueue.find(o => o.id === line.orderId) || state.productionLines.find(pl => pl.orderId === line.orderId) && { productName: line.productName, quantity: 1 }; // Fallback
            if(finishedOrder) {
              newPallets = Math.min(newState.warehouseCapacity, newPallets + finishedOrder.quantity);
            }
            return { ...line, orderId: null, productName: null, progress: 0 };
          }
          return { ...line, progress: newProgress };
        }
        return line;
      });

      newState.pallets = newPallets;
      
      // Auto-assign from queue if a line is free
      const freeLine = newState.productionLines.find(l => l.orderId === null);
      if (freeLine && newState.productionQueue.length > 0) {
        const nextOrder = newState.productionQueue[0];
        if (newState.pallets + nextOrder.quantity <= newState.warehouseCapacity) {
          const lineIndex = newState.productionLines.findIndex(l => l.id === freeLine.id);
          newState.productionLines[lineIndex] = {
            ...freeLine,
            orderId: nextOrder.id,
            productName: nextOrder.productName,
            timeToProduce: nextOrder.timeToProduce,
            progress: 0,
          };
          newState.productionQueue = newState.productionQueue.slice(1);
        }
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
      if (state.isShipping || state.pallets === 0) return state;
      const orderToShip = state.productionLines.find(line => line.progress >= 100);
      const reward = state.availableOrders.find(o => o.id === orderToShip?.orderId)?.reward || 100;

      return {
        ...state,
        money: state.money + (reward * state.pallets), // Simplified reward logic
        pallets: 0,
        isShipping: false, // simplified for now
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
          newState.productionLines.push({ id: newLineId, orderId: null, productName: null, progress: 0, timeToProduce: 0, efficiency: 1 });
          break;
        case 'warehouse_1':
          newState.warehouseCapacity += 100;
          break;
      }

      return newState;
    }

    default:
      return state;
  }
};

const GameStateContext = createContext<{ state: GameState; dispatch: React.Dispatch<GameAction> } | undefined>(undefined);

export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    const gameLoop = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 1000);

    return () => clearInterval(gameLoop);
  }, []);

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
