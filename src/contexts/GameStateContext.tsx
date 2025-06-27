"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { GameState, GameAction, Order, ProductionLine, Upgrade, StoredPallet, Worker } from '@/types';
import { generateNewOrder } from '@/ai/flows/order-generation-flow';

const initialOrders: Order[] = [
  { id: 1, productName: "1k Ohm Resistors", quantity: 100, reward: 1500, timeToProduce: 6000 },
  { id: 2, productName: "10uF Ceramic Capacitors", quantity: 50, reward: 2500, timeToProduce: 4500 },
  { id: 3, productName: "5mm Red LEDs", quantity: 75, reward: 1000, timeToProduce: 3000 },
  { id: 4, productName: "ATmega328P Microcontrollers", quantity: 10, reward: 5000, timeToProduce: 2400 },
];

const initialUpgrades: Record<string, Upgrade> = {
  'efficiency_1': { id: 'efficiency_1', name: "Improved Lubricants", description: "Increase all machine efficiency by 10%.", level: 1, cost: 500 },
  'add_line_1': { id: 'add_line_1', name: "New Production Line", description: "Build a second production line.", level: 1, cost: 1000 },
  'warehouse_1': { id: 'warehouse_1', name: "Warehouse Expansion", description: "Increase warehouse capacity by 100 pallets.", level: 1, cost: 750 },
};

const initialWorkers: Worker[] = [
    { id: 1, name: "Alice", wage: 1, assignedLineId: null, energy: 100, maxEnergy: 100, efficiency: 1, stamina: 1, efficiencyLevel: 1, staminaLevel: 1 },
    { id: 2, name: "Bob", wage: 1, assignedLineId: null, energy: 100, maxEnergy: 100, efficiency: 1, stamina: 1, efficiencyLevel: 1, staminaLevel: 1 },
];

const NEW_ORDER_INTERVAL = 30000; // 30 seconds
const WORKER_HIRE_COST = 500;
const POSSIBLE_WORKER_NAMES = ["Charlie", "Dana", "Eli", "Frankie", "Gabi", "Harper", "Izzy", "Jordan", "Kai", "Leo"];


const initialState: GameState = {
  money: 500,
  pallets: {},
  warehouseCapacity: 100,
  productionLines: [{ id: 1, orderId: null, productName: null, progress: 0, timeToProduce: 0, efficiency: 1, quantity: 0, reward: 0, completedQuantity: 0, assignedWorkerId: null }],
  availableOrders: initialOrders,
  productionQueue: [],
  upgrades: initialUpgrades,
  lastOrderTimestamp: Date.now(),
  workers: initialWorkers,
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'TICK': {
      let newState = { ...state };
      let palletsInWarehouse = Object.values(newState.pallets).reduce((sum, p) => sum + p.quantity, 0);

      // Deduct wages only for assigned workers
      const totalWage = newState.workers
        .filter(worker => worker.assignedLineId !== null)
        .reduce((sum, worker) => sum + worker.wage, 0);
      newState.money -= totalWage;

      // Worker energy logic
      const exhaustedWorkerIds = new Set<number>();
      newState.workers = newState.workers.map(worker => {
          if (worker.assignedLineId !== null) {
              // Deplete energy if working, considering stamina
              const energyDepletion = 0.5 / worker.stamina;
              const newEnergy = worker.energy - energyDepletion;
              if (newEnergy <= 0) {
                  exhaustedWorkerIds.add(worker.id);
                  return { ...worker, energy: 0, assignedLineId: null };
              }
              return { ...worker, energy: newEnergy };
          } else {
              // Regenerate energy if idle
              const newEnergy = Math.min(worker.maxEnergy, worker.energy + 0.25);
              return { ...worker, energy: newEnergy };
          }
      });
      
      // Production Logic
      newState.productionLines = newState.productionLines.map(line => {
        // Unassign exhausted worker
        if (line.assignedWorkerId && exhaustedWorkerIds.has(line.assignedWorkerId)) {
            line.assignedWorkerId = null;
        }
        
        // Line must have an order AND a worker to run
        if (line.orderId === null || line.assignedWorkerId === null) {
          return line;
        }
        
        const worker = newState.workers.find(w => w.id === line.assignedWorkerId);
        if (!worker) return line; // Should not happen if assigned

        const spaceAvailable = newState.warehouseCapacity - palletsInWarehouse;
        if (spaceAvailable <= 0) {
          return line; // Production is blocked
        }

        const effectiveEfficiency = line.efficiency * worker.efficiency;
        const progressIncrease = (100 / line.timeToProduce) * effectiveEfficiency;
        const newProgress = Math.min(100, line.progress + progressIncrease);

        const totalPalletsGoal = Math.floor((newProgress / 100) * line.quantity);
        const newlyProduced = totalPalletsGoal - line.completedQuantity;
        
        let updatedLine = { ...line, progress: newProgress };

        if (newlyProduced > 0) {
          const palletsToAdd = Math.min(newlyProduced, spaceAvailable);
          
          if (palletsToAdd > 0) {
            const productName = line.productName!;
            const valuePerPallet = line.reward / line.quantity;
            const existingPallets = newState.pallets[productName] || { quantity: 0, value: valuePerPallet };
            
            newState.pallets[productName] = {
              quantity: existingPallets.quantity + palletsToAdd,
              value: valuePerPallet,
            };
            
            palletsInWarehouse += palletsToAdd;
            updatedLine.completedQuantity += palletsToAdd;
          }
        }
        
        if (updatedLine.progress >= 100 && updatedLine.completedQuantity >= line.quantity) {
          // Reset the line, keeping its ID and efficiency
          return { ...line, orderId: null, productName: null, progress: 0, timeToProduce: 0, quantity: 0, reward: 0, completedQuantity: 0 };
        }

        return updatedLine;
      });

      // Auto-assign from queue if a line is free and warehouse has space
      const freeLineIndex = newState.productionLines.findIndex(l => l.orderId === null);
      if (freeLineIndex !== -1 && newState.productionQueue.length > 0) {
        const currentTotalPallets = Object.values(newState.pallets).reduce((sum, p) => sum + p.quantity, 0);
        if (currentTotalPallets < newState.warehouseCapacity) {
            const nextOrder = newState.productionQueue[0];
            newState.productionLines[freeLineIndex] = {
                ...newState.productionLines[freeLineIndex],
                orderId: nextOrder.id,
                productName: nextOrder.productName,
                timeToProduce: nextOrder.timeToProduce,
                quantity: nextOrder.quantity,
                reward: nextOrder.reward,
                progress: 0,
                completedQuantity: 0,
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
          newState.productionLines.push({ id: newLineId, orderId: null, productName: null, progress: 0, timeToProduce: 0, efficiency: 1, quantity: 0, reward: 0, completedQuantity: 0, assignedWorkerId: null });
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

    case 'HIRE_WORKER': {
      if (state.money < WORKER_HIRE_COST) return state;
      
      const existingNames = new Set(state.workers.map(w => w.name));
      const availableNames = POSSIBLE_WORKER_NAMES.filter(n => !existingNames.has(n));
      if (availableNames.length === 0) return state; // No more unique names

      const newWorker: Worker = {
        id: (Math.max(...state.workers.map(w => w.id), 0) || 0) + 1,
        name: availableNames[Math.floor(Math.random() * availableNames.length)],
        wage: 1.5,
        assignedLineId: null,
        energy: 100,
        maxEnergy: 100,
        efficiency: 1,
        stamina: 1,
        efficiencyLevel: 1,
        staminaLevel: 1,
      };

      return {
        ...state,
        money: state.money - WORKER_HIRE_COST,
        workers: [...state.workers, newWorker],
      };
    }

    case 'ASSIGN_WORKER': {
      const { workerId, lineId } = action;
      
      const workerToAssign = state.workers.find(w => w.id === workerId);
      // Prevent assigning exhausted worker
      if (!workerToAssign || workerToAssign.energy <= 0) return state;

      const newWorkers = state.workers.map(w => ({ ...w }));
      const newLines = state.productionLines.map(l => ({ ...l }));
      
      const targetWorker = newWorkers.find(w => w.id === workerId)!;
      const oldLineId = targetWorker.assignedLineId;

      // 1. Unassign from old line
      if (oldLineId !== null) {
        const oldLine = newLines.find(l => l.id === oldLineId);
        if (oldLine) oldLine.assignedWorkerId = null;
      }

      // 2. Assign to new line (if one was selected)
      if (lineId !== null) {
        const newLine = newLines.find(l => l.id === lineId);
        if (newLine && newLine.assignedWorkerId === null) {
          newLine.assignedWorkerId = workerId;
          targetWorker.assignedLineId = lineId;
        } else {
          // New line is already taken, revert worker to idle
           targetWorker.assignedLineId = null;
        }
      } else {
        // This was an unassign action, set worker to idle
        targetWorker.assignedLineId = null;
      }
      
      return { ...state, workers: newWorkers, productionLines: newLines };
    }
    
    case 'UPGRADE_WORKER': {
      const { workerId, upgradeType } = action;
      const workerIndex = state.workers.findIndex(w => w.id === workerId);
      if (workerIndex === -1) return state;

      const worker = state.workers[workerIndex];
      const baseCost = 250;
      let cost = 0;
      const newWorkers = [...state.workers];

      if (upgradeType === 'efficiency') {
        cost = Math.floor(baseCost * Math.pow(worker.efficiencyLevel, 1.5));
        if (state.money >= cost) {
          newWorkers[workerIndex] = {
            ...worker,
            efficiency: worker.efficiency + 0.1,
            efficiencyLevel: worker.efficiencyLevel + 1,
          };
          return { ...state, money: state.money - cost, workers: newWorkers };
        }
      } else if (upgradeType === 'stamina') {
        cost = Math.floor(baseCost * Math.pow(worker.staminaLevel, 1.5));
        if (state.money >= cost) {
          newWorkers[workerIndex] = {
            ...worker,
            stamina: worker.stamina + 0.1,
            staminaLevel: worker.staminaLevel + 1,
          };
          return { ...state, money: state.money - cost, workers: newWorkers };
        }
      }
      return state; // Not enough money or invalid upgrade type
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
