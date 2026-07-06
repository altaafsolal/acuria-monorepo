import { Link } from 'react-router-dom';
import { FiActivity, FiLayout } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { useHealth } from '../../hooks';
import { currentYear } from '../../utils';

export default function HomePage() {
  const { appName, tagline } = useApp();
  const { data, isLoading, isError, error } = useHealth();

  const baserowLabel = data?.baserow
    ? data.baserow.connected
      ? 'connecté'
      : data.baserow.configured
        ? 'mal configuré'
        : 'non configuré'
    : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <header>
        <FiLayout className="text-[2.5rem] text-[#334155]" />
        <h1 className="mt-2 mb-0 text-[2.5rem] font-bold">{appName}</h1>
        <p className="mt-1 mb-0 text-[var(--color-muted)]">{tagline}</p>
      </header>

      <main className="max-w-[480px] mt-8 text-[#475569]">
        <p>
          Bienvenue chez Acuria Partners. Page d&apos;accueil provisoire pendant la construction de la plateforme.
        </p>

        <Link
          to="/login"
          className="inline-block mt-5 py-[0.65rem] px-5 bg-[var(--color-navy)] text-white no-underline rounded-lg font-medium transition-colors duration-150 hover:bg-[var(--color-navy2)]"
        >
          Se connecter à l&apos;accueil
        </Link>

        <div className="flex gap-3 items-start mt-6 p-4 bg-[#f1f5f9] rounded-lg text-left">
          <FiActivity className="shrink-0 mt-0.5" />
          <div>
            <strong>État de l&apos;API</strong>
            {isLoading && <p className="m-0 mt-1">Vérification du serveur…</p>}
            {isError && <p className="m-0 mt-1 error">{error.message}</p>}
            {data && (
              <>
                <p className="m-0 mt-1">{data.service} — {data.status}</p>
                {baserowLabel && <p className="m-0 mt-1">Baserow : {baserowLabel}</p>}
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-12 text-[#94a3b8]">
        <small>{`© ${currentYear()} Acuria Partners`}</small>
      </footer>
    </div>
  );
}
