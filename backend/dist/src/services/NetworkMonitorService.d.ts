export declare class NetworkMonitorService {
    private intervalId?;
    start(): Promise<void>;
    stop(): Promise<void>;
    private checkNetworkStatus;
}
