import type { LucideIcon } from "lucide-react";

export interface Order {
  id: number;
  productName: string;
  quantity: number;
  reward: number;
  timeToProduce: number; // in ticks
}

export interface Worker {
  id: number;
  name: string;
  wage: number; // dollars per second
  assignedLineId: number | null;
  energy: number; // 0-100
  maxEnergy: number;
  efficiency: number; // Starts at 1
  stamina: number; // Starts at 1
  efficiencyLevel: number;
  staminaLevel: number;
}

export interface ProductionLine {
  id: number;
  orderId: number | null;
  productName: string | null;
  progress: number; // 0-100
  timeToProduce: number;
  efficiency: number; // 1 = 100%
  quantity: number;
  reward: number;
  completedQuantity: number;
  assignedWorkerId: number | null;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  level: number;
  cost: number;
}

export interface StoredPallet {
    quantity: number;
    value: number; // price per pallet
}

export interface Vehicle {
  id: string;
  name: string;
  capacity: number;
  timePerPallet: number; // time in seconds per pallet
  icon: LucideIcon;
}

export interface Shipment {
  id: number;
  vehicle: Vehicle;
  pallets: Record<string, StoredPallet>;
  totalValue: number;
  totalQuantity: number;
  totalDeliveryTime: number; // total delivery time in seconds
  arrivalTime: number; // timestamp
}

export interface GameState {
  money: number;
  pallets: Record<string, StoredPallet>;
  warehouseCapacity: number;
  productionLines: ProductionLine[];
  availableOrders: Order[];
  productionQueue: Order[];
  upgrades: Record<string, Upgrade>;
  lastOrderTimestamp: number;
  workers: Worker[];
  vehicles: Record<string, Vehicle>;
  activeShipments: Shipment[];
}

export type GameAction =
  | { type: 'TICK' }
  | { type: 'ACCEPT_ORDER'; order: Order }
  | { type: 'PURCHASE_UPGRADE'; upgradeId: string }
  | { type: 'START_SHIPMENT'; vehicleId: string; palletsToShip: Record<string, number> }
  | { type: 'ADD_ORDER', order: Order }
  | { type: 'HIRE_WORKER' }
  | { type: 'ASSIGN_WORKER'; workerId: number; lineId: number | null }
  | { type: 'UPGRADE_WORKER'; workerId: number; upgradeType: 'efficiency' | 'stamina' };
