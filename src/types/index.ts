export interface Order {
  id: number;
  productName: string;
  quantity: number;
  reward: number;
  timeToProduce: number; // in ticks
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

export interface GameState {
  money: number;
  pallets: Record<string, StoredPallet>;
  warehouseCapacity: number;
  productionLines: ProductionLine[];
  availableOrders: Order[];
  productionQueue: Order[];
  upgrades: Record<string, Upgrade>;
  lastOrderTimestamp: number;
}

export type GameAction =
  | { type: 'TICK' }
  | { type: 'ACCEPT_ORDER'; order: Order }
  | { type: 'PURCHASE_UPGRADE'; upgradeId: string }
  | { type: 'SHIP_GOODS' }
  | { type: 'ADD_ORDER', order: Order };
