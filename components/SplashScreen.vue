<!--
  Loading / Splash screen — App 冷啟動、資料尚未就緒時的過場畫面。
  設計依據 README.md「Loading 界面（App 啟動 / Splash）」handoff 稿，
  版本 B（淺底極簡進度條）。純 CSS 動畫，無額外 JS 狀態；顯示/隱藏由
  app.vue 透過 useAppReady() 控制。
-->
<template>
  <div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-paper">
    <p class="font-display font-bold text-[22px] text-ink tracking-[0.01em]">TripTally</p>
    <div class="h-[3px] w-[120px] overflow-hidden rounded-[2px] bg-line">
      <div class="h-full w-2/5 animate-tt-bar bg-pine"></div>
    </div>
  </div>
</template>
