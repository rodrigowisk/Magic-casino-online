export class MeinhoAudioService {
    public isSoundEnabled: boolean = true;
    public somCarta: HTMLAudioElement | null = null;
    public somSentar: HTMLAudioElement | null = null;
    public somLevantar: HTMLAudioElement | null = null;
    public somChip: HTMLAudioElement | null = null;
    public somChips: HTMLAudioElement | null = null;
    public somVitoria: HTMLAudioElement | null = null;
    public somDerrota: HTMLAudioElement | null = null;
    public somPular: HTMLAudioElement | null = null;
    public somTimer: HTMLAudioElement | null = null;
    public somAlarm: HTMLAudioElement | null = null;

    public init() {
        try {
            this.somCarta = new Audio('/sons/1card.wav');
            this.somSentar = new Audio('/sons/rayseat.wav');
            this.somLevantar = new Audio('/sons/down.wav');
            this.somChip = new Audio('/sons/chip.wav');
            this.somChips = new Audio('/sons/chips.wav');
            this.somVitoria = new Audio('/sons/victory.wav');
            this.somDerrota = new Audio('/sons/lose.mp3');
            this.somPular = new Audio('/sons/pular.mp3');
            this.somTimer = new Audio('/sons/timer.mp3');
            this.somAlarm = new Audio('/sons/alarm.mp3');
        } catch (e) {
            console.warn("Aviso: Falha ao carregar áudio", e);
        }
    }

    public setSoundEnabled(enabled: boolean) {
        this.isSoundEnabled = enabled;
        if (!enabled) {
            this.pararSom(this.somTimer);
            this.pararSom(this.somAlarm);
        }
    }

    public tocarSom(audio: HTMLAudioElement | null, allowOverlap: boolean = true) {
        if (!this.isSoundEnabled || !audio) return;

        if (allowOverlap) {
            const clonedAudio = audio.cloneNode(true) as HTMLAudioElement;
            clonedAudio.play().catch(e => console.warn('Áudio bloqueado:', e));
        } else {
            audio.currentTime = 0;
            audio.play().catch(e => console.warn('Áudio bloqueado:', e));
        }
    }

    public pararSom(audio: HTMLAudioElement | null) {
        if (audio && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }
    }

    public destroy() {
        this.pararSom(this.somTimer);
        this.pararSom(this.somAlarm);
    }
}