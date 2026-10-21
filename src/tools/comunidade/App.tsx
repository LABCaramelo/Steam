import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToolUser } from '../shared/kit';
import { ME, directMessages, users } from './data';
import { findServer, useAppStore, type Action } from './store';
import { OpenNavContext, OpenQuickSwitcherContext, SettingsContext } from './ui';
import { colorFor, playVoiceSound, useUnread, useVoiceOccupancy, useVoiceSession } from './voice';
import { Avatar } from './components/Avatar';
import { Chat } from './components/Chat';
import { FriendsView } from './components/Friends';
import { AddServerModal, ConfirmModal, CreateChannelModal, InviteModal } from './components/Modals';
import { NamePrompt } from './components/NamePrompt';
import { QuickSwitcher, type QuickDestination } from './components/QuickSwitcher';
import { ServerRail } from './components/ServerRail';
import { SettingsView } from './components/Settings';
import { ChannelIcon, HomeSidebar, ServerSidebar, type VoiceUi } from './components/Sidebar';

import { VoiceView } from './components/VoiceView';

export function App({ user }: { user?: ToolUser } = {}) {
  const [state, dispatch] = useAppStore();
  const { view, profile, settings, modal } = state;

  useEffect(() => {
    if (user?.name && !profile.name) {
      dispatch({ type: 'setName', name: user.name });
    }
  }, [user?.name, profile.name, dispatch]);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const quickSwitcherTrigger = useRef<HTMLElement | null>(null);
  const openQuickSwitcher = useCallback(() => {
    if (!profile.name || quickSwitcherOpen) return;
    quickSwitcherTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dispatch({ type: 'closeModal' });
    setQuickSwitcherOpen(true);
  }, [dispatch, profile.name, quickSwitcherOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k' && !event.isComposing && profile.name) {
        event.preventDefault();
        openQuickSwitcher();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openQuickSwitcher, profile.name]);

  // O usuário "você" do diretório local passa a ter o nome e a cor deste visitante,
  // para o chat, a lista de membros e as salas de voz mostrarem a mesma pessoa.
  users[ME] = { ...users[ME], name: profile.name || 'você', color: profile.color ?? colorFor(profile.id) };

  const session = useVoiceSession(state.voice, profile, state.muted, state.deafened, settings, {
    history: state.voice ? (state.messages[state.voice.channelId] ?? []) : [],
    receive: (conversationId, messages) => dispatch({ type: 'receive', conversationId, messages }),
    remove: (conversationId, messageId) => dispatch({ type: 'delete', conversationId, messageId }),
  });
  const voiceKey = state.voice ? `${state.voice.serverId}:${state.voice.channelId}` : null;
  const occupancy = useVoiceOccupancy(voiceKey);

  // O chat da sala em que você está conta como lido só enquanto está aberto na tela.
  const server = view.kind === 'server' ? findServer(state.servers, view.serverId) : undefined;
  const voiceChannelId = state.voice?.channelId ?? null;
  const voiceChatVisible =
    !!server &&
    server.id === state.voice?.serverId &&
    state.channelByServer[server.id] === voiceChannelId &&
    state.showVoiceChat;
  const voiceChatUnread = useUnread(
    voiceChannelId,
    voiceChannelId ? (state.messages[voiceChannelId]?.length ?? 0) : 0,
    voiceChatVisible,
  );
  const voiceUi: VoiceUi = { session, occupancy, chatUnread: voiceChatUnread };

  const prevVoiceKey = useRef(voiceKey);
  useEffect(() => {
    if (prevVoiceKey.current === voiceKey) return;
    // Com o áudio desativado você também não ouve os sons de entrar/sair.
    if (!state.deafened && settings.voiceSounds) playVoiceSound(voiceKey ? 'join' : 'leave');
    prevVoiceKey.current = voiceKey;
  }, [voiceKey, state.deafened, settings.voiceSounds]);

  // Sincronização com o tema Caramelo do LAB (light / dark)
  useEffect(() => {
    const root = document.documentElement;
    const syncWithCaramelo = () => {
      const ct = root.getAttribute('data-caramelo-theme');
      if (ct === 'light' && settings.theme !== 'claro') {
        dispatch({ type: 'updateSettings', patch: { theme: 'claro' } });
      } else if (ct === 'dark' && settings.theme === 'claro') {
        dispatch({ type: 'updateSettings', patch: { theme: 'escuro' } });
      }
    };
    syncWithCaramelo();
    const observer = new MutationObserver(syncWithCaramelo);
    observer.observe(root, { attributes: true, attributeFilter: ['data-caramelo-theme'] });
    return () => observer.disconnect();
  }, [settings.theme, dispatch]);

  // Tema e acessibilidade valem para a página inteira (inclusive janelas sobrepostas).
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.reducedMotion = String(settings.reducedMotion);
    // O filtro só entra quando a saturação foi reduzida, para não custar nada no padrão.
    root.dataset.desaturated = String(settings.saturation < 100);
    root.style.setProperty('--saturation', String(settings.saturation / 100));
    if (settings.theme === 'claro') {
      root.setAttribute('data-caramelo-theme', 'light');
      try { localStorage.setItem('caramelo-theme', 'light'); } catch {}
    } else {
      root.setAttribute('data-caramelo-theme', 'dark');
      try { localStorage.setItem('caramelo-theme', 'dark'); } catch {}
    }
  }, [settings.theme, settings.reducedMotion, settings.saturation]);

  // Abrir um link de convite (?convite=...) leva direto para "Entrar em um servidor".
  useEffect(() => {
    const url = new URL(location.href);
    const invite = url.searchParams.get('convite');
    if (!invite) return;
    dispatch({ type: 'openModal', modal: { kind: 'addServer', invite } });
    url.searchParams.delete('convite');
    history.replaceState(null, '', url);
  }, [dispatch]);

  // No celular, a lista de servidores/canais e a conversa ocupam a tela uma de cada vez.
  const [navOpen, setNavOpen] = useState(true);
  const sidebarDispatch = (a: Action) => {
    dispatch(a);
    if (a.type === 'openChannel' || a.type === 'openHome') setNavOpen(false);
  };
  const selectQuickDestination = (destination: QuickDestination) => {
    if (destination.kind === 'channel') {
      dispatch({ type: 'navigateChannel', serverId: destination.serverId, channelId: destination.channelId });
    } else if (destination.kind === 'server') {
      dispatch({ type: 'openServer', serverId: destination.serverId });
    } else {
      dispatch({ type: 'openHome', dmId: destination.dmId });
    }
    setNavOpen(false);
    setQuickSwitcherOpen(false);
  };


  let sidebar: React.ReactNode;
  let content: React.ReactNode;

  if (server) {
    const channel = server.categories.flatMap((c) => c.channels).find((c) => c.id === state.channelByServer[server.id]);

    sidebar = <ServerSidebar server={server} state={state} voiceUi={voiceUi} dispatch={sidebarDispatch} />;
    if (!channel) {
      content = (
        <main className="chat empty-state">
          <h2>{server.name}</h2>
          <p>Este servidor ainda não tem canais.</p>
          <button
            className="button brand"
            onClick={() => dispatch({ type: 'openModal', modal: { kind: 'createChannel', serverId: server.id, categoryId: null } })}
          >
            Criar canal
          </button>
        </main>
      );
    } else if (channel.kind === 'voice') {
      content = (
        <VoiceView
          key={channel.id}
          serverId={server.id}
          channel={channel}
          state={state}
          session={session}
          occupancy={occupancy}
          unread={channel.id === voiceChannelId ? voiceChatUnread : 0}
          dispatch={dispatch}
        />
      );
    } else {
      content = (
        <Chat
          conversationId={channel.id}
          title={channel.name}
          icon={<ChannelIcon channel={channel} size={24} />}
          topic={channel.topic}
          placeholder={`Conversar em #${channel.name}`}
          welcome={
            <>
              <div className="welcome-icon">
                <ChannelIcon channel={channel} size={42} />
              </div>
              <h2>Bem-vindo(a) a #${channel.name}!</h2>
              <p>Este é o começo do canal #${channel.name}.</p>
            </>
          }
          messages={state.messages[channel.id] ?? []}
          dispatch={dispatch}
        />
      );
    }
  } else {
    const dmId = view.kind === 'home' ? view.dmId : null;
    sidebar = <HomeSidebar dmId={dmId} state={state} voiceUi={voiceUi} dispatch={sidebarDispatch} />;
    const dm = directMessages.find((d) => d.id === dmId);
    if (dm) {
      const user = users[dm.userId];

      content = (
        <Chat
          conversationId={dm.id}
          title={user.name}
          icon={<Avatar user={user} size={24} status={user.status} ring="var(--bg-primary)" />}
          placeholder={`Conversar com @${user.name}`}
          welcome={
            <>
              <Avatar user={user} size={80} />
              <h2>{user.name}</h2>
              <p>
                Este é o começo do seu histórico de mensagens diretas com <strong>{user.name}</strong>.
              </p>
            </>
          }
          messages={state.messages[dm.id] ?? []}
          dispatch={dispatch}
        />
      );
    } else {
      content = <FriendsView dispatch={dispatch} />;
    }
  }

  const close = () => dispatch({ type: 'closeModal' });
  const modalServer = modal && 'serverId' in modal ? findServer(state.servers, modal.serverId) : undefined;

  return (
    <SettingsContext.Provider value={settings}>
      <OpenNavContext.Provider value={() => setNavOpen(true)}>
        <OpenQuickSwitcherContext.Provider value={openQuickSwitcher}>
          <div className="app" data-nav={navOpen ? 'open' : 'closed'}>

            <div className="app-body">
              <ServerRail servers={state.servers} view={view} dispatch={dispatch} />
              <div className="app-panel">
                {sidebar}
                <div className="app-content">{content}</div>
              </div>
            </div>

            {modal?.kind === 'settings' && (
              <SettingsView
                section={modal.section}
                profile={profile}
                settings={settings}
                myStatus={state.myStatus}
                dispatch={dispatch}
              />
            )}
            {modal?.kind === 'addServer' && (
              <AddServerModal invite={modal.invite} profileName={profile.name} dispatch={dispatch} />
            )}
            {modal?.kind === 'invite' && modalServer && <InviteModal server={modalServer} dispatch={dispatch} />}
            {modal?.kind === 'createChannel' && modalServer && (
              <CreateChannelModal server={modalServer} categoryId={modal.categoryId} dispatch={dispatch} />
            )}
            {modal?.kind === 'leaveServer' && modalServer && (
              <ConfirmModal
                title={`Sair de "${modalServer.name}"`}
                confirmLabel="Sair do servidor"
                onClose={close}
                onConfirm={() => dispatch({ type: 'leaveServer', serverId: modalServer.id })}
              >
                Tem certeza de que deseja sair de <strong>{modalServer.name}</strong>? Para voltar, você vai precisar de
                um novo convite.
              </ConfirmModal>
            )}
            {modal?.kind === 'logout' && (
              <ConfirmModal title="Sair" confirmLabel="Sair" onClose={close} onConfirm={() => dispatch({ type: 'logout' })}>
                Tem certeza de que deseja sair? Na próxima vez, o app vai perguntar seu nome de novo e você entra nas
                salas de voz como outra pessoa.
              </ConfirmModal>
            )}
            {!profile.name && <NamePrompt dispatch={dispatch} />}
            {quickSwitcherOpen && profile.name && (
              <QuickSwitcher
                servers={state.servers}
                returnFocus={quickSwitcherTrigger.current}
                onClose={() => setQuickSwitcherOpen(false)}
                onSelect={selectQuickDestination}
              />
            )}
          </div>
        </OpenQuickSwitcherContext.Provider>
      </OpenNavContext.Provider>
    </SettingsContext.Provider>
  );
}
