<template>
  <div class="table-info">
    <div class="pot-display">Pote: R$ {{ pot }}</div>
    <div class="phase-display">Fase: {{ phase }}</div>
  </div>
</template>

<script setup lang="ts">
// Recebe os dados do jogo pai como propriedades (props)
defineProps<{
  pot: number;
  phase: string;
}>();
</script>

<style scoped>
.table-info {
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 20px;
  border-radius: 20px;
  color: #fff;
  text-align: center;
  border: 1px solid #444;
}

.pot-display {
  font-size: 20px;
  font-weight: bold;
  color: #f1c40f;
}

.phase-display {
  font-size: 12px;
  color: #aaa;
  text-transform: uppercase;
  margin-top: 4px;
}
</style>