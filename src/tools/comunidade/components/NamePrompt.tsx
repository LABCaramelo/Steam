import { useState } from 'react';
import type { Action } from '../store';

/** Pede o nome que os outros vão ver nas salas de voz. Aparece na primeira visita. */
export function NamePrompt({ dispatch }: { dispatch: (a: Action) => void }) {
  const [name, setName] = useState('');

  return (
    <div className="modal-backdrop">
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: 'setName', name });
        }}
      >
        <h2>Como você quer ser chamado?</h2>
        <p>É o nome que as outras pessoas vão ver quando você entrar num canal de voz.</p>
        <label className="modal-label" htmlFor="display-name">
          Nome de exibição
        </label>
        <input
          id="display-name"
          className="modal-input"
          value={name}
          maxLength={32}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
        <div className="modal-actions">
          <button type="submit" className="modal-submit" disabled={!name.trim()}>
            Continuar
          </button>
        </div>
      </form>
    </div>
  );
}
