<template>
  <div class="typing">
    <div class="dot" />
    <div class="dot" />
    <div class="dot" />
  </div>
</template>

<style scoped>
.typing {
  align-items: center;
  display: flex;
  height: 17px;
}

.typing .dot {
  animation: typingAnimation 1.8s infinite ease-in-out;
  background-color: rgb(var(--v-theme-on-background));
  border-radius: 50%;
  height: 7px;
  margin-right: 4px;
  width: 7px;
  display: inline-block;
}

.typing .dot:nth-child(1) { animation-delay: 0.2s; }
.typing .dot:nth-child(2) { animation-delay: 0.3s; }
.typing .dot:nth-child(3) { animation-delay: 0.4s; }
.typing .dot:last-child { margin-right: 0; }

@keyframes typingAnimation {
  0% { transform: translateY(0); }
  28% { transform: translateY(-7px); }
  44% { transform: translateY(0); }
}
</style>
