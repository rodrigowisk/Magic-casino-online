import * as signalR from '@microsoft/signalr';

export interface GameHubCallbacks {
    onReceiveTableState: (serverState: any) => void;
    onPlayerSkipped: (logicalSeat: number) => void;
    onPlayerBetted: (logicalSeat: number, betAmount: number, isWin: boolean, potBroken: boolean, playedCards: string[], centerCardRevealed: string) => void;
    onWalletBalanceUpdated?: (newBalance: number) => void; 
    onPlayerSatDown?: (logicalSeat: number) => void; 
    onPlayerStoodUp?: (logicalSeat: number) => void; 
    onReceiveError?: (msg: string) => void; 
    
    // 👇 NOVOS EVENTOS DA FILA DE ESPERA 👇
    onWaitlistYourTurn?: () => void;
    onWaitlistExpired?: () => void;
}

export function useGameHub(
    tableId: string, 
    currentUserId: string, 
    currentUserName: string, 
    currentUserAvatar: string, 
    callbacks: GameHubCallbacks
) {
    let hubConnection: signalR.HubConnection | null = null;

    const connect = async () => {
        try {
            // BLINDAGEM: Se já existe uma conexão pendurada (micro-queda), destrói antes de criar outra
            if (hubConnection) {
                try { await hubConnection.stop(); } catch(e) {}
            }

            const GAME_API_URL = import.meta.env.VITE_GAME_API_URL || 'http://localhost:5002';
            
            hubConnection = new signalR.HubConnectionBuilder()
                .withUrl(`${GAME_API_URL}/hubs/game`, {
                    accessTokenFactory: () => localStorage.getItem('magic_token') || '',
                    skipNegotiation: true,
                    transport: signalR.HttpTransportType.WebSockets
                })
                .withAutomaticReconnect()
                .build();

            // Mapeando os eventos de estado do jogo
            hubConnection.on("ReceiveTableState", (serverState: any) => {
                callbacks.onReceiveTableState(serverState);
            });

            hubConnection.on("TableStateUpdated", (serverState: any) => {
                callbacks.onReceiveTableState(serverState);
            });

            hubConnection.on("PlayerSkipped", (logicalSeat: number) => {
                callbacks.onPlayerSkipped(logicalSeat);
            });

            hubConnection.on("PlayerBetted", (logicalSeat: number, betAmount: number, isWin: boolean, potBroken: boolean, playedCards: string[], centerCardRevealed: string) => {
                callbacks.onPlayerBetted(logicalSeat, betAmount, isWin, potBroken, playedCards, centerCardRevealed);
            });

            hubConnection.on("WalletBalanceUpdated", (newBalance: number) => {
                if (callbacks.onWalletBalanceUpdated) {
                    callbacks.onWalletBalanceUpdated(newBalance);
                }
            });

            hubConnection.on("PlayerSatDown", (logicalSeat: number) => {
                if (callbacks.onPlayerSatDown) {
                    callbacks.onPlayerSatDown(logicalSeat);
                }
            });

            hubConnection.on("PlayerStoodUp", (logicalSeat: number) => {
                if (callbacks.onPlayerStoodUp) {
                    callbacks.onPlayerStoodUp(logicalSeat);
                }
            });

            hubConnection.on("ReceiveError", (msg: string) => {
                if (callbacks.onReceiveError) {
                    callbacks.onReceiveError(msg);
                } else {
                    console.error("Erro do Servidor:", msg);
                }
                alert("Aviso do Servidor: " + msg); 
            });

            hubConnection.on("WaitlistYourTurn", () => {
                if (callbacks.onWaitlistYourTurn) callbacks.onWaitlistYourTurn();
            });

            hubConnection.on("WaitlistExpired", () => {
                if (callbacks.onWaitlistExpired) callbacks.onWaitlistExpired();
            });

            hubConnection.onreconnected(async (connectionId) => {
                console.log("SignalR reconectado com sucesso! Atualizando ID no servidor...");
                await hubConnection?.invoke("JoinTable", tableId, currentUserId, currentUserName, currentUserAvatar);
            });

            // Força a reconexão em caso de perda de internet abrupta (ex: bloquear o telemóvel)
            hubConnection.onclose(async () => {
                console.log("Conexão SignalR perdida. Tentando reconectar...");
                setTimeout(() => connect(), 3000);
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

    const requestGameState = async () => {
        if (hubConnection?.state === signalR.HubConnectionState.Connected) {
            try {
                await hubConnection.invoke("JoinTable", tableId, currentUserId, currentUserName, currentUserAvatar);
            } catch (e) {}
        } else if (hubConnection?.state === signalR.HubConnectionState.Disconnected) {
            connect(); // Apenas chama o connect limpo, sem criar duplicações
        }
    };

    const updateAvatar = async (newAvatar: string) => {
        if (hubConnection) await hubConnection.invoke("UpdateAvatar", tableId, newAvatar);
    };

    const sitDown = async (logicalSeat: number, buyIn: number) => {
        if (hubConnection) await hubConnection.invoke("SitDown", tableId, logicalSeat, buyIn, currentUserId);
    };

    const rebuy = async (amount: number) => {
        if (hubConnection) await hubConnection.invoke("Rebuy", tableId, amount, currentUserId);
    };

    const standUp = async () => {
        if (hubConnection) await hubConnection.invoke("StandUp", tableId);
    };

    const setLeaveNextHand = async (willLeave: boolean) => {
        if (hubConnection) await hubConnection.invoke("SetLeaveNextHand", tableId, willLeave);
    };

    const skipBet = async () => {
        if (hubConnection) await hubConnection.invoke("SkipBet", tableId, currentUserId);
    };

    const confirmBet = async (betValue: number) => {
        if (hubConnection) await hubConnection.invoke("ConfirmBet", tableId, betValue, currentUserId);
    };

    const joinWaitlist = async () => {
        if (hubConnection) await hubConnection.invoke("JoinWaitlist", tableId, currentUserId, currentUserName);
    };

    const leaveWaitlist = async () => {
        if (hubConnection) await hubConnection.invoke("LeaveWaitlist", tableId, currentUserId);
    };

    return {
        connect, disconnect, getConnectionId, requestGameState, updateAvatar, sitDown, rebuy, standUp, setLeaveNextHand, skipBet, confirmBet, joinWaitlist, leaveWaitlist
    };
}