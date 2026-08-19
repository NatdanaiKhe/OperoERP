export interface MenuVisibilityItem {
  id: string;
  menuKey: string;
  visible: boolean;
}

export interface RoleWithMenu {
  id: string;
  name: string;
  description: string | null;
  menuVisibility: MenuVisibilityItem[];
}

export interface UpdateMenuConfigPayload {
  items: { menuKey: string; visible: boolean }[];
}
