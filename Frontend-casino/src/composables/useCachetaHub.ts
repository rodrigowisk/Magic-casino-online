import * as signalR from '@microsoft/signalr';

export interface CachetaHubCallbacks {
    onReceiveTableState: (serverState: any) => void;
    onWalletBalanceUpdated?: (newBalance: number) => void; 
    onPlayerWon?: (data: { seat: number, name: string, groups: string[][] }) => void; 
    // 👇 NOVO EVENTO 👇
    onPromptNextRound?: () => void;
}

export function useCachetaHub(tableId: string, currentUserId: string, currentUserName: string, currentUserAvatar: string, callbacks: CachetaHubCallbacks) {
    let hubConnection: signalR.HubConnection | null = null;

    const connect = async () => {
        try {
            const CACHETA_API_URL = import.meta.env.VITE_CACHETA_API_URL || 'http://localhost:5003';
            
            hubConnection = new signalR.HubConnectionBuilder()
                .withUrl(`${CACHETA_API_URL}/hubs/cacheta`, {
                    accessTokenFactory: () => localStorage.getItem('magic_token') || ''
                })
                .withAutomaticReconnect()
                .build();

            hubConnection.on("ReceiveTableState", callbacks.onReceiveTableState);
            hubConnection.on("TableStateUpdated", callbacks.onReceiveTableState);

            hubConnection.on("WalletBalanceUpdated", (newBalance: number) => {
                if (callbacks.onWalletBalanceUpdated) callbacks.onWalletBalanceUpdated(newBalance);
            });

            hubConnection.on("PlayerWon", (data: any) => {
                if (callbacks.onPlayerWon) callbacks.onPlayerWon(data);
            });

            // 👇 NOVO LISTENER 👇
            hubConnection.on("PromptNextRound", () => {
                if (callbacks.onPromptNextRound) callbacks.onPromptNextRound();
            });

            await hubConnection.start();
            await hubConnection.invoke("JoinTable", tableId, currentUserId, currentUserName, currentUserAvatar);
        } catch (err) {
            console.error("Falha ao conectar no SignalR da Cacheta: ", err);
        }
    };

    const disconnect = () => {
        if (hubConnection) hubConnection.stop();
    };

    const getConnectionId = () => {
        return hubConnection?.connectionId;
    };

    const updateAvatar = async (newAvatar: string) => {
        if (hubConnection) await hubConnection.invoke("UpdateAvatar", tableId, newAvatar);
    };

    const sitDown = async (logicalSeat: number, buyIn: number) => {
        if (hubConnection) await hubConnection.invoke("SitDown", tableId, logicalSeat, buyIn, currentUserId);
    };

    const rebuy = async (amount: number) => {
        if (hubConnection) await hubConnection.invoke("Rebuy", tableId, amount);
    };

    const standUp = async () => {
        if (hubConnection) await hubConnection.invoke("StandUp", tableId);
    };

    const setLeaveNextHand = async (willLeave: boolean) => {
        if (hubConnection) await hubConnection.invoke("SetLeaveNextHand", tableId, willLeave);
    };

    const drawCard = async (fromDiscard: boolean) => {
        if (hubConnection) await hubConnection.invoke("DrawCard", tableId, fromDiscard);
    };

    const discardCard = async (cardString: string) => {
        if (hubConnection) await hubConnection.invoke("DiscardCard", tableId, cardString);
    };

    const declareWin = async (cardString: string | null) => {
        if (hubConnection) await hubConnection.invoke("DeclareWin", tableId, cardString || "");
    };

    // 👇 NOVA AÇÃO DE CONTINUAR 👇
    const readyForNextRound = async () => {
        if (hubConnection) await hubConnection.invoke("ReadyForNextRound", tableId);
    };

    return {
        connect, disconnect, getConnectionId, updateAvatar, sitDown, rebuy, standUp, 
        setLeaveNextHand, drawCard, discardCard, declareWin, readyForNextRound
    };
}