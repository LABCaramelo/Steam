<script setup>
import { computed } from 'vue'
import TramaLogo from '@trama/components/TramaLogo.vue'

// Informações operacionais desta instalação; não reproduz as políticas do serviço original.
const props = defineProps({
  kind: { type: String, required: true }, // 'terms' | 'privacy'
})

const CONTENT = {
  terms: {
    title: 'Termos de uso',
    intro:
      'Estas informações descrevem o funcionamento desta instalação da plataforma de integrações. As condições comerciais e de uso do serviço são definidas pelo seu administrador.',
    sections: [
      {
        title: '1. Sobre o serviço',
        items: [
          'A plataforma permite criar integrações (fluxos) que conectam aplicativos por meio de gatilhos e ações.',
          'Integrações, versões e execuções são persistidas no servidor. Nós configurados podem realizar chamadas reais às APIs conectadas.',
        ],
      },
      {
        title: '2. Conta e acesso',
        items: [
          'Você é responsável por manter a confidencialidade das suas credenciais.',
          'O acesso utiliza uma sessão no servidor. Limpar os dados do navegador encerra dados locais de interface, mas não apaga a conta nem as integrações do servidor.',
        ],
      },
      {
        title: '3. Planos e operações',
        items: [
          'Operações representam o uso da plataforma e são contabilizadas a cada execução de aplicativo ou ação.',
          'Sem um processador de pagamentos configurado, a instalação utiliza o plano Local e não contrata nem cobra assinaturas.',
        ],
      },
      {
        title: '4. Uso aceitável',
        items: [
          'Não utilize a plataforma para enviar spam, violar direitos de terceiros ou qualquer finalidade ilegal.',
          'Verifique as permissões e os limites de cada API antes de ativar integrações que enviem ou alterem dados em serviços externos.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Políticas de privacidade',
    intro:
      'Esta página descreve como os dados são utilizados nesta instalação. O administrador é responsável por informar as políticas aplicáveis ao serviço que disponibilizar.',
    sections: [
      {
        title: 'Dados coletados',
        items: [
          'Nome, email e telefone informados no cadastro e no perfil.',
          'Integrações, conexões, templates e dados de faturamento criados durante o uso.',
        ],
      },
      {
        title: 'Onde os dados ficam',
        items: [
          'Contas, organizações, grafos e registros de execução ficam no banco persistente do servidor. Credenciais de conexões são cifradas antes de serem armazenadas.',
          'O navegador conserva preferências e dados temporários de interface. Fluxos configurados enviam dados às APIs escolhidas e podem conservar entradas e saídas nos registros de execução.',
        ],
      },
      {
        title: 'Cartões de pagamento',
        items: [
          'Sem um processador configurado, não são coletados números de cartão nem CVV. Quando houver integração de pagamentos, o cadastro de cartão deverá ocorrer no ambiente do provedor.',
        ],
      },
      {
        title: 'Seus direitos',
        items: [
          'Conexões, integrações e organizações podem ser gerenciadas pelas telas correspondentes, conforme suas permissões. Limpar o armazenamento do navegador não exclui os registros mantidos no servidor.',
        ],
      },
    ],
  },
}

const content = computed(() => CONTENT[props.kind] ?? CONTENT.terms)
</script>

<template>
  <div class="d-flex justify-center pa-6">
    <div class="page-container w-100 line-gap-3">
      <router-link :to="{ name: 'home' }">
        <TramaLogo logo-width="200" />
      </router-link>
      <h1 class="text-primary mt-6">{{ content.title }}</h1>
      <p>{{ content.intro }}</p>
      <section v-for="section in content.sections" :key="section.title" class="line-gap-2">
        <h2 class="text-primary">{{ section.title }}</h2>
        <ul class="marker-primary pl-6">
          <li v-for="item in section.items" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  max-width: 1080px;
}

.marker-primary li::marker {
  color: rgb(var(--v-theme-primary));
}
</style>
