import * as signalR from '@microsoft/signalr';

export interface CachetaHubCallbacks {
    onReceiveTableState: (serverState: any) => void;
    // Evento para receber o saldo atualizado da carteira
    onWalletBalanceUpdated?: (newBalance: number) => void; 
}

export function useCachetaHub(tableId: string, currentUserId: string, currentUserName: string, currentUserAvatar: string, callbacks: CachetaHubCallbacks) {
    let hubConnection: signalR.HubConnection | null = null;

    const connect = async () => {
        try {
            // 👇 Aponta para o novo servidor da Cacheta (Porta 5003)
            const CACHETA_API_URL = import.meta.env.VITE_CACHETA_API_URL || 'http://localhost:5003';
            
            hubConnection = new signalR.HubConnectionBuilder()
                .withUrl(`${CACHETA_API_URL}/hubs/cacheta`, {
                    accessTokenFactory: () => localStorage.getItem('magic_token') || ''
                })
                .withAutomaticReconnect()
                .build();

            // Mapeando os eventos de atualização de estado geral do servidor
            hubConnection.on("ReceiveTableState", callbacks.onReceiveTableState);
            hubConnection.on("TableStateUpdated", callbacks.onReceiveTableState);

            // Escuta a atualização do saldo vinda do SignalR
            hubConnection.on("WalletBalanceUpdated", (newBalance: number) => {
                if (callbacks.onWalletBalanceUpdated) {
                    callbacks.onWalletBalanceUpdated(newBalance);
                }
            });

            await hubConnection.start();
            await hubConnection.invoke("JoinTable", tableId, currentUserId, currentUserName, currentUserAvatar);
        } catch (err) {
            console.error("Falha ao conectar no SignalR da Cacheta: ", err);
        }
    };

    const disconnect = () => {
        if (hubConnection) {
            hubConnection.stop();
        }
    };

    const getConnectionId = () => {
        return hubConnection?.connectionId;
    };

    // --- AÇÕES GERAIS DA MESA ---

    const updateAvatar = async (newAvatar: string) => {
        if (hubConnection) {
            await hubConnection.invoke("UpdateAvatar", tableId, newAvatar);
        }
    };

    const sitDown = async (logicalSeat: number, buyIn: number) => {
        if (hubConnection) {
            await hubConnection.invoke("SitDown", tableId, logicalSeat, buyIn, currentUserId);
        }
    };

    const rebuy = async (amount: number) => {
        if (hubConnection) {
            await hubConnection.invoke("Rebuy", tableId, amount);
        }
    };

    const standUp = async () => {
        if (hubConnection) {
            await hubConnection.invoke("StandUp", tableId);
        }
    };

    const setLeaveNextHand = async (willLeave: boolean) => {
        if (hubConnection) {
            await hubConnection.invoke("SetLeaveNextHand", tableId, willLeave);
        }
    };

    // --- 👇 AÇÕES EXCLUSIVAS DA CACHETA 👇 ---

    // fromDiscard = true (compra do lixo aberto), fromDiscard = false (compra do monte fechado)
    const drawCard = async (fromDiscard: boolean) => {
        if (hubConnection) {
            await hubConnection.invoke("DrawCard", tableId, fromDiscard);
        }
    };

    // cardString = ex: "A♥", "10♣"
    const discardCard = async (cardString: string) => {
        if (hubConnection) {
            await hubConnection.invoke("DiscardCard", tableId, cardString);
        }
    };

    return {
        connect,
        disconnect,
        getConnectionId,
        updateAvatar,
        sitDown,
        rebuy,
        standUp,
        setLeaveNextHand,
        drawCard,
        discardCard
    };
}