import { SocketService } from './SocketService';
export declare class PaymentProcessorService {
    private socketService;
    constructor(socketService: SocketService);
    processPayment(paymentData: any): Promise<any>;
}
