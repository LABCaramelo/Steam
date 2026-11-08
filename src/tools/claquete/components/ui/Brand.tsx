import { Link } from 'react-router-dom';
import { Isotype, Badge } from '@caramelo/design-system';

/** Caramelo isotype + Matriz wordmark + badge oficial. */
export function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link to="/projects" className="brand" title="Projetos" aria-label="Matriz — projetos">
      <Isotype size={24} decorative interactive />
      {!compact && (
        <span className="brand-label">
          <span className="brand-name">Matriz</span>
          <Badge color="caramel" variant="outline" size="sm" className="brand-badge">
            GERAÇÃO COM IA
          </Badge>
        </span>
      )}
    </Link>
  );
}
