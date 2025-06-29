
"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react';
import type { GameState, GameAction, Order, ProductionLine, Upgrade, StoredPallet, Worker, Vehicle, Shipment, Invoice, Achievement, SpecialEvent, ResearchState } from '@/types';
import { generateNewOrder } from '@/ai/flows/order-generation-flow';
import { generateSpecialEvent } from '@/ai/flows/special-event-flow';
import { useToast } from "@/hooks/use-toast"

export const AVAILABLE_RAW_MATERIALS: Record<string, { costPerUnit: number, timePerUnit: number }> = {
  'Resistors': { costPerUnit: 1, timePerUnit: 22.4 },
  'Capacitors': { costPerUnit: 2, timePerUnit: 22.4 },
  'Transistors': { costPerUnit: 5, timePerUnit: 28.8 },
  'LEDs': { costPerUnit: 3, timePerUnit: 22.4 },
  'PCBs': { costPerUnit: 20, timePerUnit: 128 },
  'Integrated Circuits': { costPerUnit: 50, timePerUnit: 256 },
  'Diodes': { costPerUnit: 2.5, timePerUnit: 19.2 },
  'Inductors': { costPerUnit: 7, timePerUnit: 38.4 },
  'Quartz Crystals': { costPerUnit: 15, timePerUnit: 80 },
  'Switches': { costPerUnit: 8, timePerUnit: 32.0 },
};

export const RAW_MATERIAL_UNITS_PER_PALLET_SPACE = 1000;

const ALL_VEHICLES: Record<string, Vehicle> = {
  wheelbarrow: { id: 'wheelbarrow', name: 'Wheelbarrow', capacity: 2, timePerPallet: 60, iconName: 'MoveHorizontal' },
  pickup: { id: 'pickup', name: 'Pickup Truck', capacity: 10, timePerPallet: 10, iconName: 'Car' },
  van: { id: 'van', name: 'Cargo Van', capacity: 25, timePerPallet: 9, iconName: 'Truck' },
  boxtruck: { id: 'boxtruck', name: 'Box Truck', capacity: 50, timePerPallet: 8, iconName: 'Truck' },
  semitruck: { id: 'semitruck', name: 'Semi-Truck', capacity: 200, timePerPallet: 6, iconName: 'Truck' },
};

const WAREHOUSE_EXPANSION_BASE_COST = 7500;
const WAREHOUSE_CAPACITY_UPGRADE_BASE_AMOUNT = 20;
const WAREHOUSE_CAPACITY_UPGRADE_POWER = 1.6;
const CERTIFICATION_BASE_COST = 25000;
const MAX_PRODUCTION_LINES = 12;
const POWER_GRID_BASE_COST = 30000;
const POWER_CAPACITY_UPGRADE_BASE_AMOUNT = 15;
const LINE_POWER_CONSUMPTION = 5; // in MW

const initialUpgrades: Record<string, Upgrade> = {
  'add_line': { id: 'add_line', name: "New Production Line", description: "Build an additional production line.", level: 1, cost: 10000 },
  'warehouse_expansion': { id: 'warehouse_expansion', name: "Warehouse Expansion", description: `Increase warehouse capacity by ${WAREHOUSE_CAPACITY_UPGRADE_BASE_AMOUNT} pallets.`, level: 1, cost: WAREHOUSE_EXPANSION_BASE_COST },
  'power_expansion': { id: 'power_expansion', name: "Power Grid Expansion", description: `Increase power capacity by ${POWER_CAPACITY_UPGRADE_BASE_AMOUNT} MW.`, level: 1, cost: POWER_GRID_BASE_COST },
  'cert_level_2': { id: 'cert_level_2', name: "Logistics Certification I", description: "Unlocks access to more complex and profitable orders.", level: 2, cost: CERTIFICATION_BASE_COST },
  'delivery_speed_1': { id: 'delivery_speed_1', name: "Local Supplier Contract", description: "Reduce material delivery times by 15%.", level: 1, cost: 50000 },
  'unlock_pickup': { id: 'unlock_pickup', name: "Buy Pickup Truck", description: "Capacity: 10 pallets, faster delivery.", level: 1, cost: 15000 },
};

const initialAchievements: Record<string, Achievement> = {
  'first_pallet': { id: 'first_pallet', name: "Getting Started", description: "Ship your very first pallet.", isCompleted: false },
  'first_contract': { id: 'first_contract', name: "First Big Deal", description: "Complete your first special contract.", isCompleted: false },
  'team_builder': { id: 'team_builder', name: "Team Builder", description: "Hire a team of at least 5 workers.", isCompleted: false },
  'power_surplus': { id: 'power_surplus', name: "Power Surplus", description: "Expand your power capacity to over 50 MW.", isCompleted: false },
  'logistics_expert': { id: 'logistics_expert', name: "Logistics Expert", description: "Own at least 3 different types of vehicles.", isCompleted: false },
  'crisis_averted': { id: 'crisis_averted', name: "Crisis Averted", description: "Successfully resolve a worker strike by paying their demands.", isCompleted: false },
  'master_researcher': { id: 'master_researcher', name: "Master Researcher", description: "Complete 5 different research projects.", isCompleted: false },
  'reputation_mogul': { id: 'reputation_mogul', name: "Reputation Mogul", description: "Achieve a reputation score of 100.", isCompleted: false },
  'billionaire': { id: 'billionaire', name: "Billionaire", description: "Accumulate a total of $1,000,000,000.", isCompleted: false },
  'first_million': { id: 'first_million', name: "Millionaire", description: "Earn your first $1,000,000.", isCompleted: false },
  'ship_1000_pallets': { id: 'ship_1000_pallets', name: "Bulk Shipper", description: "Ship 1,000 total pallets.", isCompleted: false },
  'max_lines': { id: 'max_lines', name: "Full Capacity", description: "Build all 12 production lines.", isCompleted: false },
  'master_logistician': { id: 'master_logistician', name: "Master Logistician", description: "Unlock the Semi-Truck.", isCompleted: false },
  'expert_certified': { id: 'expert_certified', name: "Expert Certified", description: "Reach the highest certification level (Level 5).", isCompleted: false },
  'innovator': { id: 'innovator', name: "Innovator", description: "Complete your first research project.", isCompleted: false },
};


const initialWorkers: Worker[] = [
    { id: 1, name: "Alice", wage: 0.1, assignedLineId: null, energy: 100, maxEnergy: 100, efficiency: 1, stamina: 1, efficiencyLevel: 1, staminaLevel: 1 },
];

const initialResearch: ResearchState = {
  projects: {
    'basic_automation': { id: 'basic_automation', name: "Basic Automation", description: "Implement basic automation for a 5% factory-wide efficiency boost.", cost: 100000, timeToComplete: 120, progress: 0, status: 'available', unlock: { type: 'GLOBAL_EFFICIENCY_MODIFIER', value: 0.05 } },
    'improved_logistics': { id: 'improved_logistics', name: "Improved Logistics", description: "Unlock the Cargo Van for purchase.", cost: 25000, timeToComplete: 60, progress: 0, status: 'available', unlock: { type: 'UNLOCK_UPGRADE', upgradeId: 'unlock_van' } },
    'advanced_logistics': { id: 'advanced_logistics', name: "Advanced Logistics", description: "Develop advanced routing algorithms to unlock the Box Truck for purchase.", cost: 75000, timeToComplete: 180, progress: 0, status: 'available', unlock: { type: 'UNLOCK_UPGRADE', upgradeId: 'unlock_boxtruck' } },
    'global_supply_chain': { id: 'global_supply_chain', name: "Global Supply Chain", description: "Master global logistics to unlock the powerful Semi-Truck for purchase.", cost: 200000, timeToComplete: 300, progress: 0, status: 'available', unlock: { type: 'UNLOCK_UPGRADE', upgradeId: 'unlock_semitruck' } },
    'advanced_automation': { id: 'advanced_automation', name: "Advanced Automation", description: "Further enhance automation for another 10% factory-wide efficiency boost.", cost: 500000, timeToComplete: 600, progress: 0, status: 'available', unlock: { type: 'GLOBAL_EFFICIENCY_MODIFIER', value: 0.10 } },
    'advanced_circuit_design': { id: 'advanced_circuit_design', name: "Advanced Circuit Design", description: "Research multi-layer circuit boards and more efficient transistors, enabling production of high-performance electronics.", cost: 250000, timeToComplete: 400, progress: 0, status: 'available', unlock: { type: 'UNLOCK_TECHNOLOGY', value: 'Advanced_Circuits' } },
    'power_electronics': { id: 'power_electronics', name: "Power Electronics", description: "Master high-voltage components for power supplies and inverters, opening up a new market for industrial-grade electronics.", cost: 400000, timeToComplete: 600, progress: 0, status: 'available', unlock: { type: 'UNLOCK_TECHNOLOGY', value: 'Power_Electronics' } },
    'photonics_integration': { id: 'photonics_integration', name: "Photonics Integration", description: "Integrate light-based components into your products, unlocking orders for fiber optic transceivers and laser diodes.", cost: 750000, timeToComplete: 800, progress: 0, status: 'available', unlock: { type: 'UNLOCK_TECHNOLOGY', value: 'Photonics' } },
  },
  currentProjectId: null,
};

const NEW_ORDER_INTERVAL = 30000; // 30 seconds
const WORKER_HIRE_COST = 50000;
const POSSIBLE_WORKER_NAMES = ["Charlie", "Dana", "Eli", "Frankie", "Gabi", "Harper", "Izzy", "Jordan", "Kai", "Leo", "Bob"];

const LINE_EFFICIENCY_UPGRADE_BASE_COST = 400;
const MAX_WAREHOUSE_CAPACITY = 1500;
const PRODUCTION_QUEUE_CAP = 10;


const initialState: GameState = {
  money: 50000,
  pallets: {},
  rawMaterials: {},
  warehouseCapacity: 20,
  powerCapacity: 10,
  powerUsage: 0,
  productionLines: [{ id: 1, orderId: null, productName: null, progress: 0, timeToProduce: 0, efficiency: 1, efficiencyLevel: 1, quantity: 0, reward: 0, completedQuantity: 0, assignedWorkerId: null, materialRequirements: null, isBlockedByMaterials: false }],
  availableOrders: [],
  productionQueue: [],
  activeOrders: [],
  upgrades: initialUpgrades,
  workers: initialWorkers,
  vehicles: {
    wheelbarrow: ALL_VEHICLES.wheelbarrow
  },
  activeShipments: [],
  invoices: [],
  certificationLevel: 1,
  reputation: 0,
  achievements: initialAchievements,
  totalPalletsShipped: 0,
  totalContractsCompleted: 0,
  strikesResolved: 0,
  activeEvent: null,
  research: initialResearch,
  globalEfficiencyModifier: 1.0,
  deliveryTimeModifier: 1.0,
  unlockedTechnologies: [],
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'TICK': {
      const now = Date.now();
      const newState = JSON.parse(JSON.stringify(state)); // Deep copy for mutation safety
      
      // --- Handle Expired Event ---
      if (newState.activeEvent && now >= newState.activeEvent.expiresAt) {
          newState.activeEvent = null;
      }
      
      const calculateUsedSpace = (s: GameState) => {
        const totalPallets = Object.values(s.pallets).reduce((sum, p) => sum + p.quantity, 0);
        const totalRawUnits = Object.values(s.rawMaterials).reduce((sum, m) => sum + (m?.quantity || 0), 0);
        return totalPallets + (totalRawUnits / RAW_MATERIAL_UNITS_PER_PALLET_SPACE);
      };

      let totalUsedSpace = calculateUsedSpace(newState);

      // --- Handle Completed Shipments ---
      const completedShipments = newState.activeShipments.filter(s => now >= s.arrivalTime);
      if (completedShipments.length > 0) {
        const totalEarnings = completedShipments.reduce((sum, s) => sum + s.totalValue, 0);
        const totalPallets = completedShipments.reduce((sum, s) => sum + s.totalQuantity, 0);
        newState.money += totalEarnings;
        newState.totalPalletsShipped += totalPallets;
        newState.activeShipments = newState.activeShipments.filter(s => now < s.arrivalTime);
      }

      // --- Handle Delivered Invoices ---
      const deliveredInvoices = newState.invoices.filter(i => i.status === 'paid' && now >= i.deliveryArrivalTime!);
      if (deliveredInvoices.length > 0) {
        for (const invoice of deliveredInvoices) {
            const availableUnitSpace = Math.max(0, (newState.warehouseCapacity - totalUsedSpace) * RAW_MATERIAL_UNITS_PER_PALLET_SPACE);
            const quantityToAdd = Math.min(invoice.quantity, Math.floor(availableUnitSpace));

            const existing = newState.rawMaterials[invoice.itemName] || { quantity: 0 };
            newState.rawMaterials[invoice.itemName] = { quantity: existing.quantity + quantityToAdd };
            
            totalUsedSpace += quantityToAdd / RAW_MATERIAL_UNITS_PER_PALLET_SPACE;
        }
        newState.invoices = newState.invoices.filter(i => !(i.status === 'paid' && now >= i.deliveryArrivalTime!));
      }

      const isStrike = newState.activeEvent?.type === 'WORKER_STRIKE' && !newState.activeEvent.isResolved;
      let powerUsage = 0;


      // --- Wages & Worker Energy (only if no strike) ---
      if (!isStrike) {
        const totalWage = newState.workers
          .filter(worker => worker.assignedLineId !== null)
          .reduce((sum, worker) => sum + worker.wage, 0);
        newState.money -= totalWage;

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
        
        // --- Calculate Power Usage for active lines ---
        powerUsage = newState.productionLines.reduce((sum, line) => {
            const worker = newState.workers.find(w => w.id === line.assignedWorkerId);
            const hasMaterials = Object.entries(line.materialRequirements ?? {}).every(
                ([material, needed]) => (newState.rawMaterials[material]?.quantity ?? 0) >= needed
            );
            if (line.orderId !== null && worker && hasMaterials) {
                return sum + LINE_POWER_CONSUMPTION;
            }
            return sum;
        }, 0);
        newState.powerUsage = powerUsage;
        
        const powerGridEfficiency = powerUsage > newState.powerCapacity ? newState.powerCapacity / powerUsage : 1;

        // --- Production Logic (only if no strike) ---
        newState.productionLines = newState.productionLines.map(line => {
          let currentLine = {...line, isBlockedByMaterials: false};
          if (currentLine.assignedWorkerId && exhaustedWorkerIds.has(currentLine.assignedWorkerId)) {
              currentLine.assignedWorkerId = null;
          }
          
          if (currentLine.orderId === null || currentLine.assignedWorkerId === null) {
            return currentLine;
          }
          
          const worker = newState.workers.find(w => w.id === currentLine.assignedWorkerId);
          if (!worker) return currentLine;

          const spaceForNewPallets = newState.warehouseCapacity - totalUsedSpace;
          if (spaceForNewPallets < 1) {
            return currentLine; // Blocked by warehouse space
          }
          
          const hasMaterialsForOne = Object.entries(currentLine.materialRequirements ?? {}).every(
            ([material, needed]) => (newState.rawMaterials[material]?.quantity ?? 0) >= needed
          );

          if (!hasMaterialsForOne) {
            currentLine.isBlockedByMaterials = true;
            return currentLine;
          }
          
          const efficiencyBoost = newState.activeEvent?.type === 'GLOBAL_EFFICIENCY_BOOST' ? (newState.activeEvent.efficiencyBoost || 1) : 1;
          const effectiveEfficiency = currentLine.efficiency * worker.efficiency * efficiencyBoost * powerGridEfficiency * newState.globalEfficiencyModifier;
          const progressIncrease = (100 / currentLine.timeToProduce) * effectiveEfficiency;
          const newProgress = Math.min(100, currentLine.progress + progressIncrease);

          const totalPalletsGoal = Math.floor((newProgress / 100) * currentLine.quantity);
          const newlyProduced = totalPalletsGoal - currentLine.completedQuantity;
          
          currentLine.progress = newProgress;

          if (newlyProduced > 0) {
            let maxPalletsFromMaterials = Infinity;
            for (const [material, neededPerPallet] of Object.entries(currentLine.materialRequirements ?? {})) {
              const available = newState.rawMaterials[material]?.quantity || 0;
              maxPalletsFromMaterials = Math.min(maxPalletsFromMaterials, Math.floor(available / neededPerPallet));
            }

            const palletsToAdd = Math.min(newlyProduced, maxPalletsFromMaterials, Math.floor(spaceForNewPallets));
            
            if (palletsToAdd > 0) {
              for (const [material, neededPerPallet] of Object.entries(currentLine.materialRequirements ?? {})) {
                  newState.rawMaterials[material].quantity -= palletsToAdd * neededPerPallet;
              }

              const productName = currentLine.productName!;
              const valuePerPallet = currentLine.reward / currentLine.quantity;
              const existingPallets = newState.pallets[productName] || { quantity: 0, value: valuePerPallet };
              
              newState.pallets[productName] = {
                quantity: existingPallets.quantity + palletsToAdd,
                value: valuePerPallet,
              };
              
              totalUsedSpace += palletsToAdd;
              currentLine.completedQuantity += palletsToAdd;
            } else if (!hasMaterialsForOne) {
              currentLine.isBlockedByMaterials = true;
            }
          }
          
          if (currentLine.progress >= 100 && currentLine.completedQuantity >= currentLine.quantity) {
            const completedOrder = newState.activeOrders.find(o => o.id === currentLine.orderId);
              if (completedOrder) {
                  if (completedOrder.isContract) {
                      newState.totalContractsCompleted = (newState.totalContractsCompleted || 0) + 1;
                      if (completedOrder.reputationReward) {
                          newState.reputation = (newState.reputation || 0) + completedOrder.reputationReward;
                      }
                  }
                  newState.activeOrders = newState.activeOrders.filter(o => o.id !== currentLine.orderId);
              }
            return { ...currentLine, orderId: null, productName: null, progress: 0, timeToProduce: 0, quantity: 0, reward: 0, completedQuantity: 0, isBlockedByMaterials: false, materialRequirements: null };
          }

          return currentLine;
        });

        // Auto-assign from queue if a line is free and warehouse has space
        const freeLineIndex = newState.productionLines.findIndex(l => l.orderId === null);
        if (freeLineIndex !== -1 && newState.productionQueue.length > 0) {
          if (totalUsedSpace < newState.warehouseCapacity) {
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
                  materialRequirements: nextOrder.materialRequirements,
              };
              newState.productionQueue = newState.productionQueue.slice(1);
              newState.activeOrders.push(nextOrder);
          }
        }
      } else {
        newState.powerUsage = 0;
      }

      // --- Research Progress ---
      if (newState.research.currentProjectId) {
        const projectId = newState.research.currentProjectId;
        const project = newState.research.projects[projectId];
        if (project) {
          const progressIncrease = (100 / project.timeToComplete);
          project.progress = Math.min(100, project.progress + progressIncrease);

          if (project.progress >= 100) {
            // The COMPLETE_RESEARCH action will be dispatched from a useEffect to handle toasts correctly
          }
        }
      }

      // --- Achievement Checks ---
      const checkAndComplete = (id: string, condition: boolean) => {
        if (newState.achievements[id] && condition && !newState.achievements[id].isCompleted) {
          newState.achievements[id] = { ...newState.achievements[id], isCompleted: true };
        }
      };

      checkAndComplete('first_million', newState.money >= 1000000);
      checkAndComplete('billionaire', newState.money >= 1000000000);
      checkAndComplete('ship_1000_pallets', newState.totalPalletsShipped >= 1000);
      checkAndComplete('first_pallet', newState.totalPalletsShipped >= 1);
      checkAndComplete('max_lines', newState.productionLines.length >= MAX_PRODUCTION_LINES);
      checkAndComplete('master_logistician', !!newState.vehicles.semitruck);
      checkAndComplete('logistics_expert', Object.keys(newState.vehicles).length >= 3);
      checkAndComplete('expert_certified', newState.certificationLevel >= 5);
      checkAndComplete('innovator', Object.values(newState.research.projects).some(p => p.status === 'completed'));
      checkAndComplete('master_researcher', Object.values(newState.research.projects).filter(p => p.status === 'completed').length >= 5);
      checkAndComplete('first_contract', newState.totalContractsCompleted >= 1);
      checkAndComplete('team_builder', newState.workers.length >= 5);
      checkAndComplete('power_surplus', newState.powerCapacity >= 50);
      checkAndComplete('crisis_averted', newState.strikesResolved >= 1);
      checkAndComplete('reputation_mogul', newState.reputation >= 100);

      return newState;
    }

    case 'ACCEPT_ORDER': {
      if (state.productionQueue.find(o => o.id === action.order.id) || state.productionQueue.length >= PRODUCTION_QUEUE_CAP) {
        return state;
      }
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

          let palletValue = newPalletsState[productName].value;
          if (state.activeEvent?.type === 'PRODUCT_DEMAND_SURGE' && state.activeEvent.targetItem === productName) {
              palletValue *= (state.activeEvent.priceMultiplier || 1);
          }
          totalValue += toShip * palletValue;

          const newQuantity = available - toShip;
          if (newQuantity <= 0) {
            delete newPalletsState[productName];
          } else {
             newPalletsState[productName] = {...newPalletsState[productName], quantity: newQuantity};
          }
        }
      }

      if (totalQuantity === 0 || totalQuantity > vehicle.capacity) {
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
          newState.productionLines.push({ id: newLineId, orderId: null, productName: null, progress: 0, timeToProduce: 0, efficiency: 1, efficiencyLevel: 1, quantity: 0, reward: 0, completedQuantity: 0, assignedWorkerId: null, materialRequirements: null, isBlockedByMaterials: false });
          
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
        case 'power_expansion': {
          const nextLevel = upgrade.level + 1;
          const amountToAdd = Math.floor(POWER_CAPACITY_UPGRADE_BASE_AMOUNT * Math.pow(upgrade.level, 1.5));
          newState.powerCapacity += amountToAdd;
          
          newUpgrades['power_expansion'] = {
              ...upgrade,
              cost: Math.floor(POWER_GRID_BASE_COST * Math.pow(nextLevel, 1.8)),
              level: nextLevel,
              description: `Increase power capacity by ${Math.floor(POWER_CAPACITY_UPGRADE_BASE_AMOUNT * Math.pow(nextLevel, 1.5))} MW.`,
          };
          newState.upgrades = newUpgrades;
          break;
        }
        case 'cert_level_2':
        case 'cert_level_3':
        case 'cert_level_4':
        case 'cert_level_5': {
          const newLevel = upgrade.level;
          const nextLevel = newLevel + 1;
          
          newState.certificationLevel = newLevel;
          delete newUpgrades[action.upgradeId];
          
          if (nextLevel <= 5) {
            const newCertId = `cert_level_${nextLevel}`;
            const certNames: Record<number, string> = {
              3: "Advanced Manufacturing Cert.",
              4: "Supply Chain Mastery",
              5: "Global Logistics Expert"
            };
             const certDescriptions: Record<number, string> = {
              3: "Unlocks advanced orders and materials.",
              4: "Unlocks expert-level supply chain challenges.",
              5: "Unlocks the most complex and lucrative global contracts."
            };
            newUpgrades[newCertId] = {
              id: newCertId,
              name: certNames[nextLevel],
              description: certDescriptions[nextLevel] || "Unlocks the next tier of orders.",
              level: nextLevel,
              cost: Math.floor(CERTIFICATION_BASE_COST * Math.pow(newLevel, 2.5)),
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
        case 'delivery_speed_1':
            newState.deliveryTimeModifier = 0.85; // 15% reduction
            delete newUpgrades['delivery_speed_1'];
            newUpgrades['delivery_speed_2'] = { id: 'delivery_speed_2', name: "Regional Distribution Center", description: "Reduce material delivery times by a further 20%.", level: 2, cost: 200000 };
            newState.upgrades = newUpgrades;
            break;
        case 'delivery_speed_2':
            newState.deliveryTimeModifier = 0.65; // ~35% total reduction
            delete newUpgrades['delivery_speed_2'];
            newUpgrades['delivery_speed_3'] = { id: 'delivery_speed_3', name: "Drone Delivery Network", description: "Reduce material delivery times by a further 25%.", level: 3, cost: 1000000 };
            newState.upgrades = newUpgrades;
            break;
        case 'delivery_speed_3':
            newState.deliveryTimeModifier = 0.40; // 60% total reduction
            delete newUpgrades['delivery_speed_3'];
            newState.upgrades = newUpgrades;
            break;
      }

      return newState;
    }

    case 'ADD_ORDER': {
      // Prevent adding duplicate orders
      if (state.availableOrders.some(o => o.id === action.order.id)) {
        return state;
      }
      return {
        ...state,
        availableOrders: [...state.availableOrders, action.order]
      }
    }
    
    case 'COMPLETE_ACHIEVEMENT': {
      const { achievementId } = action;
      if (state.achievements[achievementId] && !state.achievements[achievementId].isCompleted) {
        const newAchievements = { ...state.achievements };
        newAchievements[achievementId] = { ...newAchievements[achievementId], isCompleted: true };
        return { ...state, achievements: newAchievements };
      }
      return state;
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
        wage: 0.1,
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
      const baseCost = 25000;
      let cost = 0;
      const newWorkers = [...state.workers];

      const EFFICIENCY_CAP = 3;
      const STAMINA_CAP = 8;
      const WAGE_INCREASE_PER_UPGRADE = 0.05;

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
        const LINE_EFFICIENCY_CAP = 5;
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
      const { materialName, quantity } = action;
      let costMultiplier = 1;
      if (state.activeEvent?.type === 'RAW_MATERIAL_PRICE_CHANGE' && state.activeEvent.targetItem === materialName) {
        costMultiplier = state.activeEvent.priceMultiplier || 1;
      }
      const materialDetails = AVAILABLE_RAW_MATERIALS[materialName];
      if (!materialDetails) return state;

      const totalCost = materialDetails.costPerUnit * quantity * costMultiplier;
      const totalDeliveryTime = materialDetails.timePerUnit * quantity * state.deliveryTimeModifier;

      const newInvoice: Invoice = {
        id: (Math.max(...state.invoices.map(i => i.id), 0) || 0) + 1,
        itemName: materialName,
        quantity,
        totalCost,
        status: 'unpaid',
        totalDeliveryTime,
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
      
      const delay = state.activeEvent?.type === 'SUPPLY_CHAIN_DELAY' ? (state.activeEvent.delayTime || 0) : 0;
      const newInvoices = [...state.invoices];
      newInvoices[invoiceIndex] = {
        ...invoice,
        status: 'paid',
        deliveryArrivalTime: Date.now() + (invoice.totalDeliveryTime + delay) * 1000,
      };

      return {
        ...state,
        money: state.money - invoice.totalCost,
        invoices: newInvoices,
      };
    }
    
    case 'TRIGGER_EVENT':
      return { ...state, activeEvent: action.event };
      
    case 'CLEAR_EVENT':
      return { ...state, activeEvent: null };

    case 'RESOLVE_STRIKE':
      if (state.activeEvent?.type === 'WORKER_STRIKE' && state.money >= state.activeEvent.strikeDemand!) {
          return {
              ...state,
              money: state.money - state.activeEvent.strikeDemand!,
              activeEvent: { ...state.activeEvent, isResolved: true },
              strikesResolved: (state.strikesResolved || 0) + 1,
          }
      }
      return state;

    case 'START_RESEARCH': {
      const { projectId } = action;
      const project = state.research.projects[projectId];
      if (!project || project.status !== 'available' || state.money < project.cost || state.research.currentProjectId) {
        return state;
      }
      
      const newResearchState = { ...state.research };
      newResearchState.projects[projectId] = { ...project, status: 'in_progress' };
      newResearchState.currentProjectId = projectId;

      return {
        ...state,
        money: state.money - project.cost,
        research: newResearchState,
      };
    }

    case 'COMPLETE_RESEARCH': {
      const { projectId } = action;
      const project = state.research.projects[projectId];
      if (!project || project.status !== 'in_progress') {
        return state;
      }
      
      let newState = { ...state };
      const newResearchState = { ...newState.research };
      newResearchState.projects[projectId] = { ...project, status: 'completed' };
      newResearchState.currentProjectId = null;
      newState.research = newResearchState;

      // Apply unlock effects
      switch (project.unlock.type) {
        case 'GLOBAL_EFFICIENCY_MODIFIER':
          newState.globalEfficiencyModifier += project.unlock.value;
          break;
        case 'UNLOCK_UPGRADE': {
          const newUpgrades = { ...newState.upgrades };
          if (project.unlock.upgradeId === 'unlock_van') {
            newUpgrades['unlock_van'] = { id: 'unlock_van', name: "Buy Cargo Van", description: "Capacity: 25 pallets.", level: 1, cost: 40000 };
          } else if (project.unlock.upgradeId === 'unlock_boxtruck') {
            newUpgrades['unlock_boxtruck'] = { id: 'unlock_boxtruck', name: "Buy Box Truck", description: "Capacity: 50 pallets.", level: 1, cost: 100000 };
          } else if (project.unlock.upgradeId === 'unlock_semitruck') {
            newUpgrades['unlock_semitruck'] = { id: 'unlock_semitruck', name: "Buy Semi-Truck", description: "Capacity: 200 pallets.", level: 1, cost: 350000 };
          }
          newState.upgrades = newUpgrades;
          break;
        }
        case 'UNLOCK_TECHNOLOGY': {
          if (!newState.unlockedTechnologies.includes(project.unlock.value)) {
              newState.unlockedTechnologies = [...newState.unlockedTechnologies, project.unlock.value];
          }
          break;
        }
      }
      
      return newState;
    }


    default:
      return state;
  }
};

const GameStateContext = createContext<{ state: GameState; dispatch: React.Dispatch<GameAction> } | undefined>(undefined);

export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState, (initial) => {
    if (typeof window === 'undefined') {
      return initial;
    }
    try {
      const savedStateJSON = localStorage.getItem('idleIndustrialistSave');
      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        // Merge with initial state to handle migrations where new properties are added
        return { ...initial, ...savedState };
      }
    } catch (e) {
      console.error("Failed to load or parse saved state, starting fresh.", e);
      localStorage.removeItem('idleIndustrialistSave');
    }
    return initial;
  });

  const { toast } = useToast();
  const stateRef = useRef(state);
  stateRef.current = state;
  const prevAchievementsRef = useRef(state.achievements);
  const prevReputationRef = useRef(state.reputation);
  const lastEventIdRef = useRef<number | null>(null);

  // Save game state to localStorage on change
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('idleIndustrialistSave', JSON.stringify(state));
      }
    } catch (error) {
      console.error("Failed to save game state:", error);
      toast({
        title: "Save Error",
        description: "Could not save game progress to local storage. It might be full.",
        variant: "destructive"
      });
    }
  }, [state, toast]);

  // Game Loop
  useEffect(() => {
    const gameLoop = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 1000);

    return () => clearInterval(gameLoop);
  }, []);
  
  // Effect to watch for completed shipments and show toast
  useEffect(() => {
    const previousShipments = stateRef.current.activeShipments;
    const currentShipments = state.activeShipments;
    
    const completedShipments = previousShipments.filter(ps => 
      !currentShipments.some(cs => cs.id === ps.id) && Date.now() >= ps.arrivalTime
    );

    if (completedShipments.length > 0) {
      const totalEarnings = completedShipments.reduce((sum, s) => sum + s.totalValue, 0);
      const totalPallets = completedShipments.reduce((sum, s) => sum + s.totalQuantity, 0);
      toast({
        title: "Shipment Arrived!",
        description: `You earned $${Math.floor(totalEarnings).toLocaleString()} for ${totalPallets} pallets.`,
      })
    }
  }, [state.activeShipments, toast]);


  // Effect to watch for completed achievements and show toast
  useEffect(() => {
    const currentAchievements = state.achievements;
    const prevAchievements = prevAchievementsRef.current;

    for (const id in currentAchievements) {
      if (currentAchievements[id].isCompleted && !prevAchievements[id].isCompleted) {
        toast({
          title: "Achievement Unlocked!",
          description: currentAchievements[id].name,
        });
      }
    }

    prevAchievementsRef.current = currentAchievements;
  }, [state.achievements, toast]);

  // Effect to watch for reputation changes and show toast
  useEffect(() => {
    if (state.reputation > prevReputationRef.current) {
      const gained = state.reputation - prevReputationRef.current;
      toast({
        title: "Reputation Increased!",
        description: `You gained +${gained} reputation.`,
      });
    }
    prevReputationRef.current = state.reputation;
  }, [state.reputation, toast]);
  
  // Effect to watch for new events and show toast
  useEffect(() => {
    if (state.activeEvent && state.activeEvent.id !== lastEventIdRef.current) {
        const isNegative = state.activeEvent.type === 'WORKER_STRIKE' || state.activeEvent.type === 'SUPPLY_CHAIN_DELAY' || (state.activeEvent.type === 'RAW_MATERIAL_PRICE_CHANGE' && (state.activeEvent.priceMultiplier || 1) > 1);
        toast({
            title: `New Event: ${state.activeEvent.name}`,
            description: state.activeEvent.description,
            variant: isNegative ? 'destructive' : 'default',
            duration: 10000,
        });
        lastEventIdRef.current = state.activeEvent.id;
    } else if (!state.activeEvent && lastEventIdRef.current !== null) {
        lastEventIdRef.current = null;
    }
  }, [state.activeEvent, toast]);

  // Effect to handle completed research and show toast
  useEffect(() => {
      const prevResearch = stateRef.current.research;
      const currentResearch = state.research;

      if (prevResearch.currentProjectId && currentResearch.projects[prevResearch.currentProjectId]?.progress >= 100) {
          const completedProject = currentResearch.projects[prevResearch.currentProjectId];
          if (completedProject.status !== 'completed') {
              dispatch({ type: 'COMPLETE_RESEARCH', projectId: completedProject.id });
              toast({
                  title: "Research Complete!",
                  description: `Your team finished researching "${completedProject.name}".`,
              });
          }
      }
  }, [state.research, toast]);


  // Effect for AI order generation
  useEffect(() => {
    let isMounted = true;
    const generate = async () => {
      // Use the ref to get the latest state without adding them as dependencies
      const { money, productionLines, warehouseCapacity, availableOrders, pallets, rawMaterials, certificationLevel, reputation, unlockedTechnologies } = stateRef.current;
      
      if (availableOrders.length >= 6 || !isMounted) return;

      const totalStoredPallets = Object.values(pallets).reduce((sum, p) => sum + p.quantity, 0);
      const totalRawMaterialUnits = Object.values(rawMaterials).reduce((sum, m) => sum + (m?.quantity || 0), 0);
      const rawMaterialSpaceUsed = totalRawMaterialUnits / RAW_MATERIAL_UNITS_PER_PALLET_SPACE;
      const totalSpaceUsed = totalStoredPallets + rawMaterialSpaceUsed;
      const warehouseUsage = (totalSpaceUsed / warehouseCapacity) * 100;
      
      const input = {
          playerMoney: money,
          productionCapacity: productionLines.length,
          warehouseUsage: isNaN(warehouseUsage) ? 0 : warehouseUsage,
          certificationLevel: certificationLevel,
          reputation: reputation,
          unlockedTechnologies: unlockedTechnologies,
      };
      
      try {
        const newOrderData = await generateNewOrder(input);
        if (!isMounted) return;

        const allOrderIds = [
            ...stateRef.current.availableOrders.map(o => o.id),
            ...stateRef.current.productionQueue.map(o => o.id),
            ...stateRef.current.activeOrders.map(o => o.id),
            ...stateRef.current.productionLines.map(l => l.orderId).filter((id): id is number => id !== null)
        ];
        const newId = (Math.max(0, ...allOrderIds)) + 1;
        
        dispatch({
            type: 'ADD_ORDER',
            order: { ...newOrderData, id: newId }
        });
      } catch (e) {
        console.error("Failed to generate new order:", e);
      }
    };
    
    if (state.availableOrders.length < 6) {
        generate(); 
    }
    
    const orderInterval = setInterval(generate, NEW_ORDER_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(orderInterval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect for AI event generation
  useEffect(() => {
    const EVENT_INTERVAL = 60000; // Every 60 seconds
    const EVENT_CHANCE = 0.3; // 30% chance to trigger an event

    let isMounted = true;
    const generate = async () => {
      const { money, reputation, productionLines, activeEvent } = stateRef.current;
      
      if (activeEvent || !isMounted || Math.random() > EVENT_CHANCE) return;

      const input = {
          playerMoney: money,
          reputation: reputation,
          productionLines: productionLines.length,
      };
      
      try {
        const eventData = await generateSpecialEvent(input);
        if (!isMounted) return;

        const allEventIds = [stateRef.current.activeEvent?.id].filter(Boolean) as number[];
        const newId = (Math.max(0, ...allEventIds)) + 1;
        const durationInSeconds = eventData.duration;
        
        const newEvent: SpecialEvent = {
            ...eventData,
            id: newId,
            duration: durationInSeconds,
            expiresAt: Date.now() + durationInSeconds * 1000,
        };
        
        dispatch({ type: 'TRIGGER_EVENT', event: newEvent });
      } catch (e) {
        console.error("Failed to generate special event:", e);
      }
    };
    
    const eventInterval = setInterval(generate, EVENT_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(eventInterval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    
