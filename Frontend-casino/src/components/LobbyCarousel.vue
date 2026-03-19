<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { ChevronRight, ChevronLeft } from 'lucide-vue-next';
import LobbyCards from './LobbyCards.vue';

const props = defineProps<{
    title: string;
    rooms: any[];
    processingId: number | null;
    viewAllType?: string;
}>();

const emit = defineEmits(['enter', 'share', 'favorite']);

const isFeatured = computed(() => props.viewAllType === 'featured');

// =======================================================================
// LÓGICA 1: CARROSSEL DE DESTAQUES (MARQUEE AUTOMÁTICO INFINITO)
// =======================================================================
const baseMarqueeList = computed(() => {
    let list = [...props.rooms];
    if (list.length === 0) return [];
    while (list.length < 8) {
        list = [...list, ...props.rooms];
    }
    return list;
});

const marqueeRooms = computed(() => {
    const base = baseMarqueeList.value;
    if (base.length === 0) return [];
    return [
        ...base.map((r, idx) => ({ ...r, tempKey: `set1_${r.id}_${idx}` })),
        ...base.map((r, idx) => ({ ...r, tempKey: `set2_${r.id}_${idx}` }))
    ];
});

const marqueeDuration = computed(() => `${baseMarqueeList.value.length * 4}s`);

// =======================================================================
// LÓGICA 2: CARROSSEL NORMAL COM SCROLL INFINITO MATEMÁTICO E BLINDADO
// =======================================================================
const scrollContainer = ref<HTMLElement | null>(null);
const hasOverflow = ref(false);
let resizeObserver: ResizeObserver | null = null;

// Matemática exata do tamanho de 1 set de salas (180px do card + 18px de margem)
const getExactThird = () => props.rooms.length * 198;

const checkOverflow = () => {
    if (scrollContainer.value) {
        const originalWidth = getExactThird();
        hasOverflow.value = originalWidth > (scrollContainer.value.clientWidth - 100);
    }
};

const displayRooms = computed(() => {
    if (!props.rooms || props.rooms.length === 0) return [];
    if (hasOverflow.value) {
        return [...props.rooms, ...props.rooms, ...props.rooms];
    }
    return props.rooms;
});

const navigateCarousel = (direction: 'prev' | 'next') => {
    const el = scrollContainer.value;
    if (!el) return;

    const scrollAmount = 198; 
    const exactThird = getExactThird();

    if (direction === 'prev' && el.scrollLeft <= scrollAmount) {
        el.style.scrollBehavior = 'auto'; 
        el.scrollLeft += exactThird; 
        void el.offsetWidth; 
        el.style.scrollBehavior = 'smooth'; 
    }
    else if (direction === 'next' && (el.scrollLeft + el.clientWidth) >= (el.scrollWidth - scrollAmount)) {
        el.style.scrollBehavior = 'auto';
        el.scrollLeft -= exactThird; 
        void el.offsetWidth;
        el.style.scrollBehavior = 'smooth';
    }

    if (direction === 'next') {
        el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    } else {
        el.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
};

const handleScroll = () => {
    if (!hasOverflow.value || !scrollContainer.value) return;
    const el = scrollContainer.value;
    const exactThird = getExactThird();

    if (el.scrollLeft <= 0) {
        el.style.scrollBehavior = 'auto';
        el.scrollLeft += exactThird;
    }
    else if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 5) {
        el.style.scrollBehavior = 'auto';
        el.scrollLeft -= exactThird;
    }
};

onMounted(() => {
    nextTick(() => {
        setTimeout(() => {
            checkOverflow();
            
            if (hasOverflow.value && scrollContainer.value) {
                const el = scrollContainer.value;
                el.scrollLeft = getExactThird();
            }
        }, 500);

        window.addEventListener('resize', checkOverflow);
        if (scrollContainer.value) {
            resizeObserver = new ResizeObserver(() => checkOverflow());
            resizeObserver.observe(scrollContainer.value);
        }
    });
});

onUnmounted(() => {
    window.removeEventListener('resize', checkOverflow);
    if (resizeObserver) {
        resizeObserver.disconnect();
    }
});
</script>

<template>
    <div class="w-full relative">
        
        <div class="flex items-center justify-between px-4 w-full">
            <div class="flex items-center gap-2">
                <h2 class="text-sm md:text-base font-bold text-white tracking-wide border-l-4 border-blue-600 pl-2 uppercase">{{ title }}</h2>
            </div>

            <router-link 
                v-if="viewAllType" 
                :to="{ name: 'RoomList', params: { type: viewAllType } }"
                class="flex items-center gap-1 text-[10px] md:text-xs font-bold text-blue-400 hover:text-white transition-colors uppercase tracking-widest opacity-90 hover:opacity-100 py-1 px-2 rounded hover:bg-white/5 z-10"
            >
                Ver Todas
                <ChevronRight class="w-3 h-3" />
            </router-link>
        </div>

        <div v-if="rooms.length === 0" style="height: 265px; width: calc(100% - 32px); display: flex; align-items: center; justify-content: center; font-size: 12px; color: #6b7280; border: 1px dashed #1f2937; border-radius: 8px; margin: 4px 16px; background: rgba(255,255,255,0.05);">
            <p>Nenhuma sala disponível nesta categoria.</p>
        </div>

        <template v-else>
            
            <div v-if="isFeatured" style="position: relative; width: 100vw; min-height: 265px; overflow: hidden; margin-left: -12px;">
                <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 64px; background: linear-gradient(to right, #0f172a, transparent); z-index: 10; pointer-events: none;"></div>
                <div style="position: absolute; right: 0; top: 0; bottom: 0; width: 64px; background: linear-gradient(to left, #0f172a, transparent); z-index: 10; pointer-events: none;"></div>

                <div class="animate-marquee" style="display: flex; gap: 18px; padding: 4px 16px; width: max-content;" :style="{ animationDuration: marqueeDuration }">
                    <div v-for="r in marqueeRooms" :key="r.tempKey" style="flex-shrink: 0; transition: transform 0.3s; transform: translateZ(0); backface-visibility: hidden;" class="hover:scale-105">
                        <LobbyCards :room="r" :processing-id="processingId" @enter="emit('enter', $event)" @share="emit('share', $event)" @favorite="emit('favorite', $event)" />
                    </div>
                </div>
            </div>

            <div v-else style="position: relative; width: 100%; min-height: 265px; display: flex; align-items: center; margin-top: -10px;">
                
                <button v-show="hasOverflow" @click="navigateCarousel('prev')" 
                        style="position: absolute; left: -24px; z-index: 50; background: transparent; border: none; outline: none; cursor: pointer; color: white; transition: all 0.2s; padding: 0; display: flex; align-items: center; justify-content: center;"
                        onmouseover="this.style.transform='scale(1.2)'; this.style.color='#38bdf8';"
                        onmouseout="this.style.transform='scale(1)'; this.style.color='white';">
                    <ChevronLeft :size="56" style="filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.9));" />
                </button>

                <div ref="scrollContainer" 
                     @scroll="handleScroll"
                     class="no-scrollbar"
                     style="display: flex; gap: 18px; overflow-x: auto; width: 100%; padding: 10px 50px 0px 50px; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;">
                    
                    <div v-for="(r, idx) in displayRooms" :key="`${r.id}_${idx}`" 
                         style="flex-shrink: 0; scroll-snap-align: start; transition: transform 0.3s; transform: translateZ(0); backface-visibility: hidden;" 
                         class="hover:scale-105">
                        <LobbyCards :room="r" :processing-id="processingId" @enter="emit('enter', $event)" @share="emit('share', $event)" @favorite="emit('favorite', $event)" />
                    </div>
                </div>

                <button v-show="hasOverflow" @click="navigateCarousel('next')" 
                        style="position: absolute; right: -24px; z-index: 50; background: transparent; border: none; outline: none; cursor: pointer; color: white; transition: all 0.2s; padding: 0; display: flex; align-items: center; justify-content: center;"
                        onmouseover="this.style.transform='scale(1.2)'; this.style.color='#38bdf8';"
                        onmouseout="this.style.transform='scale(1)'; this.style.color='white';">
                    <ChevronRight :size="56" style="filter: drop-shadow(-2px 4px 6px rgba(0,0,0,0.9));" />
                </button>
                
            </div>
        </template>
    </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.animate-marquee {
    animation-name: marquee;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
    will-change: transform;
}

.animate-marquee:hover {
    animation-play-state: paused;
}

@keyframes marquee {
    0% { transform: translateX(0%); }
    100% { transform: translateX(-50%); }
}
</style>