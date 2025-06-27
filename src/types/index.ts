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
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  level: number;
  cost: number;
}

export interface GameState {
  money: number;
  pallets: number;
  warehouseCapacity: number;
  productionLines: ProductionLine[];
  availableOrders: Order[];
  productionQueue: Order[];
  isShipping: boolean;
  upgrades: Record<string, Upgrade>;
}

export type GameAction =
  | { type: 'TICK' }
  | { type: 'ACCEPT_ORDER'; order: Order }
  | { type: 'PURCHASE_UPGRADE'; upgradeId: string }
  | { type: 'SHIP_GOODS' };
