import { registerDiario } from './diario.js';
import { registerMatinal } from './matinal.js';
import { registerDeadline } from './deadline.js';

export function registerCrons(client) {
  registerDiario(client);
  registerMatinal(client);
  registerDeadline(client);
}
