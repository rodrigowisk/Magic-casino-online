export class CachetaSorter {
    public static suitOrder: Record<string, number> = { '♥': 1, '♠': 2, '♦': 3, '♣': 4 };
    public static rankOrder: Record<string, number> = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };

    private static getWildcardInfo(viraCard: string) {
        let wildcardRank = -1;
        let wildcardSuit = '';
        if (viraCard) {
            const vRank = viraCard.slice(0, -1);
            wildcardSuit = viraCard.slice(-1);
            const vVal = CachetaSorter.rankOrder[vRank] || 0;
            wildcardRank = vVal === 13 ? 1 : vVal + 1; 
        }
        return { wildcardRank, wildcardSuit };
    }

    public static getSortedCards(rawCards: string[], viraCard: string): string[] {
        const { wildcardRank, wildcardSuit } = CachetaSorter.getWildcardInfo(viraCard);
        const wildcards: string[] = [];
        const regularCards: string[] = [];

        rawCards.forEach((c: string) => {
            const rank = c.slice(0, -1);
            const suit = c.slice(-1);
            if ((CachetaSorter.rankOrder[rank] || 0) === wildcardRank && suit === wildcardSuit) {
                wildcards.push(c);
            } else {
                regularCards.push(c);
            }
        });

        const rankGroups: Record<string, string[]> = {};
        regularCards.forEach(c => {
            const rank = c.slice(0, -1);
            if (!rankGroups[rank]) rankGroups[rank] = [];
            rankGroups[rank]!.push(c); 
        });

        const trincas: string[] = [];
        const pares: string[] = [];
        const leftovers: string[] = [];

        Object.keys(rankGroups).forEach(rank => {
            const cards = rankGroups[rank]!;
            if (cards.length >= 3) {
                cards.sort((a, b) => (CachetaSorter.suitOrder[a.slice(-1)] || 0) - (CachetaSorter.suitOrder[b.slice(-1)] || 0));
                trincas.push(...cards);
            } else if (cards.length === 2) {
                cards.sort((a, b) => (CachetaSorter.suitOrder[a.slice(-1)] || 0) - (CachetaSorter.suitOrder[b.slice(-1)] || 0));
                pares.push(...cards);
            } else {
                leftovers.push(...cards);
            }
        });

        leftovers.sort((a, b) => {
            const rA = a.slice(0, -1);
            const sA = a.slice(-1);
            const rB = b.slice(0, -1);
            const sB = b.slice(-1);

            if ((CachetaSorter.suitOrder[sA] || 0) !== (CachetaSorter.suitOrder[sB] || 0)) {
                return (CachetaSorter.suitOrder[sA] || 0) - (CachetaSorter.suitOrder[sB] || 0);
            }
            return (CachetaSorter.rankOrder[rA] || 0) - (CachetaSorter.rankOrder[rB] || 0);
        });

        return [...wildcards, ...trincas, ...pares, ...leftovers];
    }

    public static getSortedCardsSequences(rawCards: string[], viraCard: string): string[] {
        const { wildcardRank, wildcardSuit } = CachetaSorter.getWildcardInfo(viraCard);
        const wildcards: string[] = [];
        const regularCards: string[] = [];

        rawCards.forEach((c: string) => {
            const rank = c.slice(0, -1);
            const suit = c.slice(-1);
            if ((CachetaSorter.rankOrder[rank] || 0) === wildcardRank && suit === wildcardSuit) {
                wildcards.push(c);
            } else {
                regularCards.push(c);
            }
        });

        const sequences: string[] = [];
        const remainingAfterSeq: string[] = [];

        const suitGroups: Record<string, string[]> = { '♥': [], '♠': [], '♦': [], '♣': [] };
        regularCards.forEach(c => {
            const suit = c.slice(-1);
            if (!suitGroups[suit]) suitGroups[suit] = [];
            suitGroups[suit]!.push(c);
        });

        Object.keys(suitGroups).forEach(suit => {
            let cards = suitGroups[suit]!; 
            cards.sort((a, b) => (CachetaSorter.rankOrder[a.slice(0, -1)] || 0) - (CachetaSorter.rankOrder[b.slice(0, -1)] || 0));

            let currentRun: string[] = [];
            for (let i = 0; i < cards.length; i++) {
                // 👇 AQUI: Extraímos a carta e garantimos a existência com ! 👇
                const card = cards[i]!; 
                
                if (currentRun.length === 0) {
                    currentRun.push(card);
                } else {
                    let lastRank = CachetaSorter.rankOrder[currentRun[currentRun.length - 1]!.slice(0, -1)] || 0;
                    let currRank = CachetaSorter.rankOrder[card.slice(0, -1)] || 0;

                    if (currRank === lastRank + 1) {
                        currentRun.push(card);
                    } else if (currRank === lastRank) {
                        remainingAfterSeq.push(card);
                    } else {
                        if (currentRun.length >= 3) {
                            sequences.push(...currentRun);
                        } else {
                            remainingAfterSeq.push(...currentRun);
                        }
                        currentRun = [card];
                    }
                }
            }
            if (currentRun.length >= 3) {
                sequences.push(...currentRun);
            } else {
                remainingAfterSeq.push(...currentRun);
            }
        });

        const rankGroups: Record<string, string[]> = {};
        remainingAfterSeq.forEach(c => {
            const rank = c.slice(0, -1);
            if (!rankGroups[rank]) rankGroups[rank] = [];
            rankGroups[rank]!.push(c);
        });

        const trincas: string[] = [];
        const pares: string[] = [];
        const leftovers: string[] = [];

        Object.keys(rankGroups).forEach(rank => {
            const cards = rankGroups[rank]!;
            if (cards.length >= 3) {
                cards.sort((a, b) => (CachetaSorter.suitOrder[a.slice(-1)] || 0) - (CachetaSorter.suitOrder[b.slice(-1)] || 0));
                trincas.push(...cards);
            } else if (cards.length === 2) {
                cards.sort((a, b) => (CachetaSorter.suitOrder[a.slice(-1)] || 0) - (CachetaSorter.suitOrder[b.slice(-1)] || 0));
                pares.push(...cards);
            } else {
                leftovers.push(...cards);
            }
        });

        leftovers.sort((a, b) => {
            const sA = a.slice(-1);
            const sB = b.slice(-1);
            if ((CachetaSorter.suitOrder[sA] || 0) !== (CachetaSorter.suitOrder[sB] || 0)) {
                return (CachetaSorter.suitOrder[sA] || 0) - (CachetaSorter.suitOrder[sB] || 0);
            }
            const rA = CachetaSorter.rankOrder[a.slice(0, -1)] || 0;
            const rB = CachetaSorter.rankOrder[b.slice(0, -1)] || 0;
            return rA - rB;
        });

        return [...wildcards, ...sequences, ...trincas, ...pares, ...leftovers];
    }

    public static getWinningGroups(rawCards: string[], viraCard: string): string[][] {
        const { wildcardRank, wildcardSuit } = CachetaSorter.getWildcardInfo(viraCard);
        const wildcards: string[] = [];
        const regularCards: string[] = [];

        rawCards.forEach((c: string) => {
            const rank = c.slice(0, -1);
            const suit = c.slice(-1);
            if ((CachetaSorter.rankOrder[rank] || 0) === wildcardRank && suit === wildcardSuit) {
                wildcards.push(c);
            } else {
                regularCards.push(c);
            }
        });

        const sequences: string[][] = [];
        ['♥', '♠', '♦', '♣'].forEach(suit => {
            let suitCards = regularCards.filter(c => c.slice(-1) === suit);
            suitCards.sort((a, b) => (CachetaSorter.rankOrder[a.slice(0, -1)] || 0) - (CachetaSorter.rankOrder[b.slice(0, -1)] || 0));
            let run: string[] = [];
            for (let i = 0; i < suitCards.length; i++) {
                // 👇 AQUI: Extraímos a carta e garantimos a existência com ! 👇
                const card = suitCards[i]!; 
                
                if (run.length === 0) { run.push(card); } 
                else {
                    let lastRank = CachetaSorter.rankOrder[run[run.length - 1]!.slice(0, -1)] || 0;
                    let currRank = CachetaSorter.rankOrder[card.slice(0, -1)] || 0;
                    if (currRank === lastRank + 1) { run.push(card); } 
                    else if (currRank === lastRank) { continue; } 
                    else {
                        if (run.length >= 3) {
                            sequences.push([...run]);
                            run.forEach(c => { let idx = regularCards.indexOf(c); if(idx > -1) regularCards.splice(idx, 1); });
                        }
                        run = [card];
                    }
                }
            }
            if (run.length >= 3) {
                sequences.push([...run]);
                run.forEach(c => { let idx = regularCards.indexOf(c); if(idx > -1) regularCards.splice(idx, 1); });
            }
        });

        const trincas: string[][] = [];
        const rankGroups: Record<string, string[]> = {};
        regularCards.forEach(c => {
            const rank = c.slice(0, -1);
            if (!rankGroups[rank]) rankGroups[rank] = [];
            rankGroups[rank]!.push(c);
        });
        
        Object.keys(rankGroups).forEach(rank => {
            const cards = rankGroups[rank]!;
            if (cards.length >= 3) {
                trincas.push([...cards]);
                cards.forEach(c => { let idx = regularCards.indexOf(c); if(idx > -1) regularCards.splice(idx, 1); });
            }
        });

        regularCards.sort((a, b) => {
            let rA = CachetaSorter.rankOrder[a.slice(0, -1)] || 0;
            let rB = CachetaSorter.rankOrder[b.slice(0, -1)] || 0;
            if (rA !== rB) return rA - rB;
            return (CachetaSorter.suitOrder[a.slice(-1)] || 0) - (CachetaSorter.suitOrder[b.slice(-1)] || 0);
        });

        const groups: string[][] = [];
        if (wildcards.length > 0) groups.push(wildcards);
        sequences.forEach(s => groups.push(s));
        trincas.forEach(t => groups.push(t));
        if (regularCards.length > 0) groups.push(regularCards); 

        return groups;
    }
}