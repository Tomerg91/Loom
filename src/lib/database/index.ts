// Database service classes
import { UserService } from './users';
import { SessionService } from './sessions';
import { NotificationService } from './notifications';
import { PaymentService } from './payments';

export { UserService, SessionService, NotificationService };

// Convenience factory functions
export const createUserService = (isServer = true) => new UserService(isServer);
export const createSessionService = (isServer = true) => new SessionService(isServer);
export const createNotificationService = (isServer = true) => new NotificationService(isServer);
export const createPaymentService = () => new PaymentService();
