<template>
  <div v-if="pendingList.length > 0" class="pending-section mb-4">
    <h4 class="pending-title">Novos Afiliados (Pendentes)</h4>
    <div class="pending-list">
      <div v-for="req in pendingList" :key="req.userId" class="pending-card">
        <div class="pending-info">
          <span class="pending-name">{{ req.username }}</span>
          <span class="pending-id">ID: {{ formatShortId(req.userId) }}</span>
        </div>
        <div class="pending-actions">
          <button class="btn-accept" @click="$emit('accept', req.userId)" :disabled="isProcessing">Aceitar</button>
          <button class="btn-reject" @click="$emit('reject', req.userId)" :disabled="isProcessing">Rejeitar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

defineProps({
  pendingList: {
    type: Array as () => any[],
    required: true
  },
  isProcessing: {
    type: Boolean,
    default: false
  }
});

defineEmits(['accept', 'reject']);

const formatShortId = (fullId: string | number) => {
  if (!fullId) return '';
  return String(fullId).split('-')[0].toUpperCase();
};
</script>

<style scoped>
.pending-section { background: rgba(245, 158, 11, 0.05); border: 1px dashed rgba(245, 158, 11, 0.4); border-radius: 8px; padding: 12px; margin-bottom: 20px;}
.pending-title { color: #f59e0b; font-size: 11px; font-weight: 900; text-transform: uppercase; margin: 0 0 10px 0; letter-spacing: 0.5px;}
.pending-list { display: flex; flex-direction: column; gap: 8px; }
.pending-card { display: flex; justify-content: space-between; align-items: center; background: #111827; padding: 8px 12px; border-radius: 6px; border: 1px solid #1f2937; }
.pending-info { display: flex; flex-direction: column; }
.pending-name { color: white; font-weight: bold; font-size: 13px; }
.pending-id { color: #6b7280; font-size: 9px; font-family: monospace; letter-spacing: 0.5px; }
.pending-actions { display: flex; gap: 8px; }
.btn-accept { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid #047857; border-radius: 4px; padding: 4px 10px; font-size: 10px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.btn-accept:hover:not(:disabled) { background: #10b981; color: white; }
.btn-accept:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-reject { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid #b91c1c; border-radius: 4px; padding: 4px 10px; font-size: 10px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.btn-reject:hover:not(:disabled) { background: #ef4444; color: white; }
.btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }
</style>