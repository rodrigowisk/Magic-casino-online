<script setup lang="ts">
import { computed } from 'vue';
import { Share2, Users, Play, Eye, LogIn } from 'lucide-vue-next';
import Swal from 'sweetalert2';

const props = defineProps<{
    room: any;
    processingId: number | null;
}>();

const emit = defineEmits(['enter', 'share']);

const localIsJoined = computed(() => !!props.room?.isJoined);
const isFull = computed(() => props.room?.maxParticipants > 0 && props.room?.participantsCount >= props.room?.maxParticipants);

// Imagens
const rawCoversModules = import.meta.glob<{ default: string }>('/src/assets/room_covers/**/*.{png,jpg,jpeg,svg,webp}', { eager: true });
const coversArray = Object.entries(rawCoversModules).map(([key, mod]) => ({ path: key, url: mod ? mod.default : '' }));
const getDefaultImage = () => coversArray[0]?.url || '';

const cardImage = computed(() => {
    const r = props.room;
    if (!r) return getDefaultImage();
    const rawName = r?.coverImage || r?.CoverImage;
    if (!rawName) return getDefaultImage();

    const query = String(rawName).trim().toLowerCase().replace(/\\/g, '/');
    const exactMatch = coversArray.find(item => item?.path?.toLowerCase().endsWith(query));
    if (exactMatch) return exactMatch.url;

    const justName = query.split('/').pop()?.toLowerCase();
    if (justName) {
        const fallbackMatch = coversArray.find(item => item?.path?.toLowerCase().endsWith('/' + justName));
        if (fallbackMatch) return fallbackMatch.url;
    }
    return getDefaultImage();
});

const formatCurrency = (val: number) => {
    if (isNaN(val) || val === null || val === undefined) return '0,00';
    return Number(val).toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
};

const handleShare = async (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    const url = `${window.location.origin}/lobby?showInfo=${props.room.id}`;
    if (navigator.share) {
        try { await navigator.share({ title: props.room.name || 'Mesa', url }); emit('share', props.room.id); } catch {}
    } else {
        try {
            await navigator.clipboard.writeText(url);
            Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Link copiado!', timer: 1500, showConfirmButton: false, background: '#121212', color: '#fff'});
            emit('share', props.room.id);
        } catch {}
    }
};

const handleAction = () => {
    emit('enter', props.room.id);
};
</script>

<template>
    <div style="width: 180px; height: 265px; border-radius: 12px; cursor: pointer; position: relative; background-color: #151515; border: 1px solid rgba(255,255,255,0.05);" class="shadow-lg hover:scale-[1.03] transition-transform duration-300 group" @click="handleAction">
        
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 70%; overflow: hidden; background-color: #000; pointer-events: none; border-top-left-radius: 12px; border-top-right-radius: 12px;">
            <img :src="cardImage" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s;" class="group-hover:scale-110" />
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 45%; background: linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 50%, transparent 100%); z-index: 10;"></div>
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 50%; background: linear-gradient(to top, #151515 0%, rgba(21,21,21,0.95) 30%, rgba(21,21,21,0.5) 60%, transparent 100%); z-index: 10;"></div>
        </div>

        <div style="position: absolute; top: 6px; left: 6px; right: 6px; z-index: 20; display: flex; justify-content: space-between; align-items: flex-start;">
            
            <div style="display: flex; gap: 6px; align-items: center;">
                <button type="button" @click.stop.prevent="handleShare" 
                        style="margin: 0; padding: 0; width: 26px; height: 26px; min-width: 26px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; box-sizing: border-box; color: white; outline: none; pointer-events: auto;" 
                        class="hover:text-blue-400">
                    <Share2 :size="12" />
                </button>
                
                <span style="color: #ef4444; font-weight: 900; font-size: 10px; text-transform: uppercase; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">
                    | {{ room.gameType || 'JOGO' }}
                </span>
            </div>
            
            <span style="margin: 0; padding: 0 6px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-family: monospace; font-weight: bold; color: white; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); box-sizing: border-box;">
                #{{ String(room.id).split('-')[0] }}
            </span>
        </div>

        <div style="position: absolute; top: 54%; left: 0; right: 0; transform: translateY(-50%); z-index: 30; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 0 10px; pointer-events: none;">
            
            <h3 style="color: #FFD700; font-weight: 900; font-style: italic; text-transform: uppercase; text-align: center; font-size: 13px; margin: 0; line-height: 1.1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 0 2px 6px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.6);">
                {{ room.name || 'Mesa sem nome' }}
            </h3>

            <div style="display: flex; align-items: center; gap: 3px;">
                <Users :size="10" color="#d1d5db" />
                <span style="font-size: 14px; font-weight: bold; color: white; line-height: 1; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">
                    {{ room.participantsCount }}<span style="color: rgba(255,255,255,0.7);" v-if="room.maxParticipants > 0">/{{ room.maxParticipants }}</span>
                </span>
            </div>
            
        </div>

        <div style="position: absolute; top: calc(57% + 20px); bottom: 44px; left: 0; right: 0; z-index: 30; display: flex; justify-content: center; align-items: center; padding: 0 10px; pointer-events: none;">
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                <span style="font-size: 8px; color: #9ca3af; text-transform: uppercase; font-weight: 900; letter-spacing: 0.1em; margin-bottom: 3px;">Ante</span>
                <span style="font-size: 12px; font-weight: 900; color: white; line-height: 1;">
                    <span style="font-size: 9px; color: #6b7280; margin-right: 2px;">R$</span>{{ formatCurrency(room.entryFee) }}
                </span>
            </div>

            <div style="width: 1px; height: 20px; background-color: rgba(255, 255, 255, 0.15); margin: 0 8px;"></div>

            <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                <span style="font-size: 8px; color: #9ca3af; text-transform: uppercase; font-weight: 900; letter-spacing: 0.1em; margin-bottom: 3px;">Buy-in</span>
                <span style="font-size: 14px; font-weight: 900; color: #34d399; line-height: 1; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                    <span style="font-size: 9px; color: #059669; margin-right: 2px;">R$</span>{{ formatCurrency(room.prizePool) }}
                </span>
            </div>
        </div>

        <div style="position: absolute; bottom: 10px; left: 0; right: 0; z-index: 30; display: flex; justify-content: center; pointer-events: none;">
            <button type="button" 
                    :disabled="processingId === room.id"
                    class="hover:brightness-110 active:scale-95"
                    style="width: 80%; height: 28px; pointer-events: auto; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 6px; font-weight: 900; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.2s; cursor: pointer; box-sizing: border-box; outline: none;"
                    :style="localIsJoined 
                        ? 'background: #FFD700; color: #000; border: none; box-shadow: 0 0 10px rgba(255,215,0,0.4);' 
                        : (isFull 
                            ? 'background: linear-gradient(to bottom, #d1d5db 0%, #9ca3af 100%); color: #1f2937; border: 1px solid #9ca3af; box-shadow: inset 0 1px 1px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.5);' 
                            : 'background: linear-gradient(to bottom, #ffffff 0%, #e5e7eb 40%, #9ca3af 100%); color: #111827; border: 1px solid #d1d5db; box-shadow: inset 0 2px 4px rgba(255,255,255,1), 0 3px 6px rgba(0,0,0,0.6);')
                    ">
                
                <span v-if="processingId === room.id" style="width: 14px; height: 14px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%;" class="animate-spin opacity-80"></span>
                
                <template v-else>
                    <component :is="localIsJoined ? Play : (isFull ? Eye : LogIn)" :size="12" />
                    <span style="text-shadow: 0 1px 1px rgba(255,255,255,0.5);">
                        {{ localIsJoined ? 'JOGAR' : (isFull ? 'ESPIAR' : 'ENTRAR') }}
                    </span>
                </template>
            </button>
        </div>
        
    </div>
</template>