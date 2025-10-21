// Database service classes
import { NotificationService } from './notifications';
import { PaymentService } from './payments';
import { SessionService } from './sessions';
import { UserService, type UserServiceOptions } from './users';

export { UserService, SessionService, NotificationService };

// Convenience factory functions
export const createUserService = (
  optionsOrIsServer: boolean | UserServiceOptions = { isServer: true }
) => new UserService(optionsOrIsServer);
export const createSessionService = (isServer = true) => new SessionService(isServer);
export const createNotificationService = (isServer = true) => new NotificationService(isServer);
export const createPaymentService = () => new PaymentService();
