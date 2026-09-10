import { registerPlugin } from '@capacitor/core';

export interface PendingShare {
  url: string;
  text: string;
  timestamp: number;
}

export interface SharedContentPlugin {
  getPendingShare(): Promise<PendingShare>;
}

const SharedContent = registerPlugin<SharedContentPlugin>('SharedContent');

export default SharedContent;
