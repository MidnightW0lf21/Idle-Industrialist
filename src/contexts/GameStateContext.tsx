"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { GameState, GameAction, Order, ProductionLine, Upgrade, StoredPallet, Worker, Vehicle, Shipment, Invoice } from '@/types';
import { generateNewOrder } from '@/ai/flows/order-generation-flow';
import { Truck, MoveHorizontal, Car } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"

const initialOrders: Order[] = [
  { id: 1, productName: "1k Ohm Resistors", quantity: 100, reward: 1500, timeToProduce: 6000 },
  { id: 2, productName: "10uF Ceramic Capacitors", quantity: 50, reward: 2500, timeToProduce: 4500 },
];

const ALL_VEHICLES: Record<string, Vehicle> = {
  wheelbarrow: { id: 'wheelbarrow', name: 'Wheelbarrow', capacity: 2, timePerPallet: 60, icon: MoveHorizontal },
  pickup: { id: 'pickup', name: 'Pickup Truck', capacity: 10, timePerPallet: 10, icon: Car },
  van: { id: 'van', name: 'Cargo Van', capacity: 25, timePerPallet: 9, icon: Truck },
  boxtruck: { id: 'boxtruck', name: 'Box Truck', capacity: 50, timePerPallet: 8, icon: Truck },
  semitruck: { id: 'semitruck', name: 'Semi-Truck', capacity: 200, timePerPallet: 6, icon: Truck },
};

const WAREHOUSE_EXPANSION_BASE_COST = 750;
const WAREHOUSE_CAPACITY_UPGRADE_BASE_AMOUNT = 20;
const WAREHOUSE_CAPACITY_UPGRADE_POWER = 1.6;

const initialUpgrades: Record<string, Upgrade> = {
  'add_line': { id: 'add_line', name: "New Production Line", description: "Build an additional production line.", level: 1, cost: 1000 },
  'warehouse_expansion': { id: 'warehouse_expansion', name: "Warehouse Expansion", description: `Increase warehouse capacity by ${WAREHOUSE_CAPACITY_UPGRADE_BASE_AMOUNT} pallets.`, level: 1, cost: WAREHOUSE_EXPANSION_BASE_COST },
  'unlock_pickup': { id: 'unlock_pickup', name: "Buy Pickup Truck", description: "Capacity: 10 pallets, faster delivery.", level: 1, cost: 1500 },
  'unlock_van': { id: 'unlock_van', name: "Buy Cargo Van", description: "Capacity: 25 pallets.", level: 1, cost: 4000 },
  'unlock_boxtruck': { id: 'unlock_boxtruck', name: "Buy Box Truck", description: "Capacity: 50 pallets.", level: 1, cost: 10000 },
  'unlock_semitruck': { id: 'unlock_semitruck', name: "Buy Semi-Truck", description: "Capacity: 200 pallets, very efficient.", level: 1, cost: 25000 },
};

const initialWorkers: Worker[] = [
    { id: 1, name: "Alice", wage: 0.2, assignedLineId: null, energy: 100, maxEnergy: 100, efficiency: 1, stamina: 1, efficiencyLevel: 1, staminaLevel: 1 },
];

const NEW_ORDER_INTERVAL = 30000; // 30 seconds
const WORKER_HIRE_COST = 500;
const POSSIBLE_WORKER_NAMES = ["Charlie", "Dana", "Eli", "Frankie", "Gabi", "Harper", "Izzy", "Jordan", "Kai", "Leo", "Bob"];

const LINE_EFFICIENCY_UPGRADE_BASE_COST = 400;
const LINE_EFFICIENCY_CAP = 5;
const MAX_PRODUCTION_LINES = 12;
const MAX_WAREHOUSE_CAPACITY = 1500;
const MATERIALS_PER_PALLET = 2;


const initialState: GameState = {
  money: 500,
  pallets: {},
  rawMaterials: { "Electronic Components": { quantity: 50 } },
  warehouseCapacity: 20,
  productionLines: [{ id: 1, orderId: null, productName: null, progress: 0, timeToProduce: 0, efficiency: 1, efficiencyLevel: 1, quantity: 0, reward: 0, completedQuantity: 0, assignedWorkerId: null }],
  availableOrders: initialOrders,
  productionQueue: [],
  upgrades: initialUpgrades,
  lastOrderTimestamp: Date.now(),
  workers: initialWorkers,
  vehicles: {
    wheelbarrow: ALL_VEHICLES.wheelbarrow
  },
  activeShipments: [],
  invoices: [],
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'TICK': {
      // Create a deep-enough copy of state to avoid mutation bugs.
      const newPallets = { ...state.pallets };
      for (const key in newPallets) {
        newPallets[key] = { ...newPallets[key] };
      }

      let newState = {
        ...state,
        pallets: newPallets,
        rawMaterials: { ...state.rawMaterials, "Electronic Components": { ...state.rawMaterials["Electronic Components"] } },
        workers: state.workers.map(w => ({...w})),
        productionLines: state.productionLines.map(l => ({...l})),
        activeShipments: state.activeShipments.map(s => ({...s})),
        invoices: state.invoices.map(i => ({...i}))
      };

      let palletsInWarehouse = Object.values(newState.pallets).reduce((sum, p) => sum + p.quantity, 0);

      // --- Handle Completed Shipments ---
      const now = Date.now();
      const completedShipments = newState.activeShipments.filter(s => now >= s.arrivalTime);
      
      if (completedShipments.length > 0) {
        const totalEarnings = completedShipments.reduce((sum, s) => sum + s.totalValue, 0);
        newState.money += totalEarnings;
        newState.activeShipments = newState.activeShipments.filter(s => now < s.arrivalTime);
        // Toast notification is handled in the component via useEffect
      }

      // --- Handle Delivered Invoices ---
      const deliveredInvoices = newState.invoices.filter(i => i.status === 'paid' && now >= i.deliveryArrivalTime!);
      if (deliveredInvoices.length > 0) {
        for (const invoice of deliveredInvoices) {
          const existing = newState.rawMaterials[invoice.itemName] || { quantity: 0 };
          newState.rawMaterials[invoice.itemName] = { quantity: existing.quantity + invoice.quantity };
        }
        newState.invoices = newState.invoices.filter(i => !(i.status === 'paid' && now >= i.deliveryArrivalTime!));
      }


      // Deduct wages only for assigned workers
      const totalWage = newState.workers
        .filter(worker => worker.assignedLineId !== null)
        .reduce((sum, worker) => sum + worker.wage, 0);
      newState.money -= totalWage;

      // Worker energy logic
      const exhaustedWorkerIds = new Set<number>();
      newState.workers = newState.workers.map(worker => {
          if (worker.assignedLineId !== null) {
              const energyDepletion = 0.5 / worker.stamina;
              const newEnergy = worker.energy - energyDepletion;
              if (newEnergy <= 0) {
                  exhaustedWorkerIds.add(worker.id);
                  return { ...worker, energy: 0, assignedLineId: null };
              }
              return { ...worker, energy: newEnergy };
          } else {
              const newEnergy = Math.min(worker.maxEnergy, worker.energy + 0.25);
              return { ...worker, energy: newEnergy };
          }
      });
      
      // Production Logic
      newState.productionLines = newState.productionLines.map(line => {
        let currentLine = {...line, isBlockedByMaterials: false}; // Reset block status
        if (currentLine.assignedWorkerId && exhaustedWorkerIds.has(currentLine.assignedWorkerId)) {
            currentLine.assignedWorkerId = null;
        }
        
        if (currentLine.orderId === null || currentLine.assignedWorkerId === null) {
          return currentLine;
        }
        
        const worker = newState.workers.find(w => w.id === currentLine.assignedWorkerId);
        if (!worker) return currentLine;

        // Check for materials
        if ((newState.rawMaterials['Electronic Components']?.quantity || 0) < MATERIALS_PER_PALLET) {
          currentLine.isBlockedByMaterials = true;
          return currentLine;
        }

        const spaceAvailable = newState.warehouseCapacity - palletsInWarehouse;
        if (spaceAvailable <= 0) {
          return currentLine;
        }

        const effectiveEfficiency = currentLine.efficiency * worker.efficiency;
        const progressIncrease = (100 / currentLine.timeToProduce) * effectiveEfficiency;
        const newProgress = Math.min(100, currentLine.progress + progressIncrease);

        const totalPalletsGoal = Math.floor((newProgress / 100) * currentLine.quantity);
        const newlyProduced = totalPalletsGoal - currentLine.completedQuantity;
        
        currentLine.progress = newProgress;

        if (newlyProduced > 0) {
          const materialsNeeded = newlyProduced * MATERIALS_PER_PALLET;
          const materialsAvailable = newState.rawMaterials['Electronic Components']?.quantity || 0;
          
          const canProduceNum = Math.floor(materialsAvailable / MATERIALS_PER_PALLET);
          const actualProductionAmount = Math.min(newlyProduced, canProduceNum);
          
          const palletsToAdd = Math.min(actualProductionAmount, spaceAvailable);
          
          if (palletsToAdd > 0) {
            const materialsToConsume = palletsToAdd * MATERIALS_PER_PALLET;
            newState.rawMaterials['Electronic Components'].quantity -= materialsToConsume;

            const productName = currentLine.productName!;
            const valuePerPallet = currentLine.reward / currentLine.quantity;
            const existingPallets = newState.pallets[productName] || { quantity: 0, value: valuePerPallet };
            
            newState.pallets[productName] = {
              quantity: existingPallets.quantity + palletsToAdd,
              value: valuePerPallet,
            };
            
            palletsInWarehouse += palletsToAdd;
            currentLine.completedQuantity += palletsToAdd;
          }
        }
        
        if (currentLine.progress >= 100 && currentLine.completedQuantity >= currentLine.quantity) {
          return { ...currentLine, orderId: null, productName: null, progress: 0, timeToProduce: 0, quantity: 0, reward: 0, completedQuantity: 0, isBlockedByMaterials: false };
        }

        return currentLine;
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

    case 'START_SHIPMENT': {
      const { vehicleId, palletsToShip } = action;
      const vehicle = state.vehicles[vehicleId];
      if (!vehicle) return state;

      const newPalletsState = { ...state.pallets };
      const shipmentPallets: Record<string, StoredPallet> = {};
      let totalQuantity = 0;
      let totalValue = 0;

      for (const [productName, quantity] of Object.entries(palletsToShip)) {
        if (quantity > 0 && newPalletsState[productName]) {
          const available = newPalletsState[productName].quantity;
          const toShip = Math.min(quantity, available);
          
          shipmentPallets[productName] = { quantity: toShip, value: newPalletsState[productName].value };
          totalQuantity += toShip;
          totalValue += toShip * newPalletsState[productName].value;

          const newQuantity = available - toShip;
          if (newQuantity <= 0) {
            delete newPalletsState[productName];
          } else {
             newPalletsState[productName] = {...newPalletsState[productName], quantity: newQuantity};
          }
        }
      }

      if (totalQuantity === 0 || totalQuantity > vehicle.capacity) {
        // Nothing to ship or exceeding capacity, do nothing
        return state;
      }
      
      const totalDeliveryTime = totalQuantity * vehicle.timePerPallet;
      const newShipment: Shipment = {
        id: (Math.max(...state.activeShipments.map(s => s.id), 0) || 0) + 1,
        vehicle,
        pallets: shipmentPallets,
        totalValue,
        totalQuantity,
        totalDeliveryTime,
        arrivalTime: Date.now() + totalDeliveryTime * 1000,
      };

      return {
        ...state,
        pallets: newPalletsState,
        activeShipments: [...state.activeShipments, newShipment],
      };
    }
    
    case 'PURCHASE_UPGRADE': {
      const upgrade = state.upgrades[action.upgradeId];
      if (!upgrade || state.money < upgrade.cost) {
        return state;
      }
      
      let newState = { ...state, money: state.money - upgrade.cost };
      const newUpgrades = { ...newState.upgrades };
      
      switch(action.upgradeId) {
        case 'add_line': {
          if (newState.productionLines.length >= MAX_PRODUCTION_LINES) return state;
          const newLineId = newState.productionLines.length + 1;
          newState.productionLines.push({ id: newLineId, orderId: null, productName: null, progress: 0, timeToProduce: 0, efficiency: 1, efficiencyLevel: 1, quantity: 0, reward: 0, completedQuantity: 0, assignedWorkerId: null });
          
          if (newState.productionLines.length >= MAX_PRODUCTION_LINES) {
            delete newUpgrades['add_line'];
          } else {
            newUpgrades['add_line'] = {
              ...upgrade,
              cost: Math.floor(upgrade.cost * 2.5),
              level: upgrade.level + 1,
            };
          }
          newState.upgrades = newUpgrades;
          break;
        }
        case 'warehouse_expansion': {
          if (newState.warehouseCapacity >= MAX_WAREHOUSE_CAPACITY) return state;
          
          const amountToAdd = Math.floor(WAREHOUSE_CAPACITY_UPGRADE_BASE_AMOUNT * Math.pow(upgrade.level, WAREHOUSE_CAPACITY_UPGRADE_POWER));
          const newCapacity = newState.warehouseCapacity + amountToAdd;
          newState.warehouseCapacity = Math.min(newCapacity, MAX_WAREHOUSE_CAPACITY);

          if (newCapacity >= MAX_WAREHOUSE_CAPACITY) {
            delete newUpgrades['warehouse_expansion'];
          } else {
            const nextLevel = upgrade.level + 1;
            const nextAmountToAdd = Math.floor(WAREHOUSE_CAPACITY_UPGRADE_BASE_AMOUNT * Math.pow(nextLevel, WAREHOUSE_CAPACITY_UPGRADE_POWER));
            newUpgrades['warehouse_expansion'] = {
              ...upgrade,
              cost: Math.floor(WAREHOUSE_EXPANSION_BASE_COST * Math.pow(nextLevel, 1.7)),
              level: nextLevel,
              description: `Increase warehouse capacity by ${nextAmountToAdd} pallets.`,
            };
          }
          newState.upgrades = newUpgrades;
          break;
        }
        case 'unlock_pickup':
          newState.vehicles = { ...newState.vehicles, pickup: ALL_VEHICLES.pickup };
          delete newUpgrades['unlock_pickup'];
          newState.upgrades = newUpgrades;
          break;
        case 'unlock_van':
          newState.vehicles = { ...newState.vehicles, van: ALL_VEHICLES.van };
          delete newUpgrades['unlock_van'];
          newState.upgrades = newUpgrades;
          break;
        case 'unlock_boxtruck':
          newState.vehicles = { ...newState.vehicles, boxtruck: ALL_VEHICLES.boxtruck };
          delete newUpgrades['unlock_boxtruck'];
          newState.upgrades = newUpgrades;
          break;
        case 'unlock_semitruck':
          newState.vehicles = { ...newState.vehicles, semitruck: ALL_VEHICLES.semitruck };
          delete newUpgrades['unlock_semitruck'];
          newState.upgrades = newUpgrades;
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
      let availableNames = POSSIBLE_WORKER_NAMES.filter(n => !existingNames.has(n));
       if (availableNames.length === 0) {
        availableNames = [`Worker #${state.workers.length + 1}`]
      }

      const newWorker: Worker = {
        id: (Math.max(...state.workers.map(w => w.id), 0) || 0) + 1,
        name: availableNames[Math.floor(Math.random() * availableNames.length)],
        wage: 0.2,
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
      if (!workerToAssign || workerToAssign.energy <= 0) return state;

      const newWorkers = state.workers.map(w => ({ ...w }));
      const newLines = state.productionLines.map(l => ({ ...l }));
      
      const targetWorker = newWorkers.find(w => w.id === workerId)!;
      const oldLineId = targetWorker.assignedLineId;

      if (oldLineId !== null) {
        const oldLine = newLines.find(l => l.id === oldLineId);
        if (oldLine) oldLine.assignedWorkerId = null;
      }

      if (lineId !== null) {
        const newLine = newLines.find(l => l.id === lineId);
        if (newLine && newLine.assignedWorkerId === null) {
          newLine.assignedWorkerId = workerId;
          targetWorker.assignedLineId = lineId;
        } else {
           targetWorker.assignedLineId = null;
        }
      } else {
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

      const EFFICIENCY_CAP = 3;
      const STAMINA_CAP = 8;
      const WAGE_INCREASE_PER_UPGRADE = 0.1;

      if (upgradeType === 'efficiency') {
        if (worker.efficiency >= EFFICIENCY_CAP) return state;
        cost = Math.floor(baseCost * Math.pow(worker.efficiencyLevel, 1.5));
        if (state.money >= cost) {
          newWorkers[workerIndex] = {
            ...worker,
            efficiency: worker.efficiency + 0.1,
            efficiencyLevel: worker.efficiencyLevel + 1,
            wage: worker.wage + WAGE_INCREASE_PER_UPGRADE,
          };
          return { ...state, money: state.money - cost, workers: newWorkers };
        }
      } else if (upgradeType === 'stamina') {
        if (worker.stamina >= STAMINA_CAP) return state;
        cost = Math.floor(baseCost * Math.pow(worker.staminaLevel, 1.5));
        if (state.money >= cost) {
          newWorkers[workerIndex] = {
            ...worker,
            stamina: worker.stamina + 0.1,
            staminaLevel: worker.staminaLevel + 1,
            wage: worker.wage + WAGE_INCREASE_PER_UPGRADE,
          };
          return { ...state, money: state.money - cost, workers: newWorkers };
        }
      }
      return state;
    }

    case 'UPGRADE_PRODUCTION_LINE': {
        const { lineId } = action;
        const lineIndex = state.productionLines.findIndex(l => l.id === lineId);
        if (lineIndex === -1) return state;

        const line = state.productionLines[lineIndex];
        if (line.efficiency >= LINE_EFFICIENCY_CAP) return state;

        const cost = Math.floor(LINE_EFFICIENCY_UPGRADE_BASE_COST * Math.pow(line.efficiencyLevel, 1.8));
        if (state.money < cost) return state;
        
        const newLines = [...state.productionLines];
        newLines[lineIndex] = {
            ...line,
            efficiency: line.efficiency + 0.1,
            efficiencyLevel: line.efficiencyLevel + 1,
        };

        return { ...state, money: state.money - cost, productionLines: newLines };
    }

    case 'ORDER_RAW_MATERIALS': {
      const { itemName, quantity, cost, deliveryTime } = action;
      const newInvoice: Invoice = {
        id: (Math.max(...state.invoices.map(i => i.id), 0) || 0) + 1,
        itemName,
        quantity,
        totalCost: cost,
        status: 'unpaid',
        deliveryTime,
      };
      return {
        ...state,
        invoices: [...state.invoices, newInvoice],
      };
    }

    case 'PAY_INVOICE': {
      const { invoiceId } = action;
      const invoiceIndex = state.invoices.findIndex(i => i.id === invoiceId);
      if (invoiceIndex === -1) return state;
      
      const invoice = state.invoices[invoiceIndex];
      if (state.money < invoice.totalCost || invoice.status !== 'unpaid') return state;

      const newInvoices = [...state.invoices];
      newInvoices[invoiceIndex] = {
        ...invoice,
        status: 'paid',
        deliveryArrivalTime: Date.now() + invoice.deliveryTime * 1000,
      };

      return {
        ...state,
        money: state.money - invoice.totalCost,
        invoices: newInvoices,
      };
    }


    default:
      return state;
  }
};

const GameStateContext = createContext<{ state: GameState; dispatch: React.Dispatch<GameAction> } | undefined>(undefined);

export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { toast } = useToast();

  // Game Loop
  useEffect(() => {
    const gameLoop = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 1000);

    return () => clearInterval(gameLoop);
  }, []);
  
  // Effect to watch for completed shipments and show toast
  useEffect(() => {
    const { activeShipments } = state;
    const completedShipments = activeShipments.filter(s => Date.now() >= s.arrivalTime);

    if (completedShipments.length > 0) {
      const totalEarnings = completedShipments.reduce((sum, s) => sum + s.totalValue, 0);
      const totalPallets = completedShipments.reduce((sum, s) => sum + s.totalQuantity, 0);
      toast({
        title: "Shipment Arrived!",
        description: `You earned $${Math.floor(totalEarnings).toLocaleString()} for ${totalPallets} pallets.`,
      })
    }
  // This effect should only run when activeShipments changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activeShipments.length]);


  // Effect for AI order generation
  const { money, productionLines, warehouseCapacity, availableOrders, pallets, lastOrderTimestamp } = state;
  useEffect(() => {
    const generate = async () => {
      if (availableOrders.length >= 10) return;

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
