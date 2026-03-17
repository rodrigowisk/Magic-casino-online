import * as signalR from '@microsoft/signalr';

export interface GameHubCallbacks {
    onReceiveTableState: (serverState: any) => void;
    onPlayerSkipped: (logicalSeat: number) => void;
    onPlayerBetted: (logicalSeat: number, betAmount: number, isWin: boolean, potBroken: boolean, playedCards: string[], centerCardRevealed: string) => void;
    // 👇 NOVO: Evento para receber o saldo atualizado
    onWalletBalanceUpdated?: (newBalance: number) => void; 
}

export function useGameHub(tableId: string, currentUserId: string, currentUserName: string, currentUserAvatar: string, callbacks: GameHubCallbacks) {
    let hubConnection: signalR.HubConnection | null = null;

    const connect = async () => {
        try {
            const GAME_API_URL = import.meta.env.VITE_GAME_API_URL || 'http://localhost:5002';
            
            hubConnection = new signalR.HubConnectionBuilder()
                .withUrl(`${GAME_API_URL}/hubs/game`, {
                    accessTokenFactory: () => localStorage.getItem('magic_token') || ''
                })
                .withAutomaticReconnect()
                .build();

            // Mapeando os eventos do servidor para as funções que o Vue nos passou
            hubConnection.on("ReceiveTableState", callbacks.onReceiveTableState);
            hubConnection.on("TableStateUpdated", callbacks.onReceiveTableState);
            hubConnection.on("PlayerSkipped", callbacks.onPlayerSkipped);
            hubConnection.on("PlayerBetted", callbacks.onPlayerBetted);

            // 👇 NOVO: Escuta a atualização do saldo vinda do SignalR da carteira
            hubConnection.on("WalletBalanceUpdated", (newBalance: number) => {
                if (callbacks.onWalletBalanceUpdated) {
                    callbacks.onWalletBalanceUpdated(newBalance);
                }
            });

            await hubConnection.start();
            await hubConnection.invoke("JoinTable", tableId, currentUserId, currentUserName, currentUserAvatar);
        } catch (err) {
            console.error("Falha ao conectar no SignalR: ", err);
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

    // --- AÇÕES DO JOGADOR ---

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

    const skipBet = async () => {
        if (hubConnection) {
            await hubConnection.invoke("SkipBet", tableId, currentUserId);
        }
    };

    const confirmBet = async (betValue: number) => {
        if (hubConnection) {
            await hubConnection.invoke("ConfirmBet", tableId, betValue, currentUserId);
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
        skipBet,
        confirmBet
    };
}