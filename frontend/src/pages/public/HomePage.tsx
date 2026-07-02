import { Link } from 'react-router-dom';
import { FiActivity, FiLayout } from 'react-icons/fi';
import './HomePage.css';
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
    <div className="page">
      <header className="hero">
        <FiLayout className="logo" />
        <h1>{appName}</h1>
        <p className="tagline">{tagline}</p>
      </header>

      <main className="content">
        <p>
          Bienvenue chez Acuria Partners. Page d&apos;accueil provisoire pendant la construction de la plateforme.
        </p>

        <Link to="/login" className="home-cta">Se connecter à l&apos;accueil</Link>

        <div className="status-box">
          <FiActivity />
          <div>
            <strong>État de l&apos;API</strong>
            {isLoading && <p>Vérification du serveur…</p>}
            {isError && <p className="error">{error.message}</p>}
            {data && (
              <>
                <p>{data.service} — {data.status}</p>
                {baserowLabel && <p>Baserow : {baserowLabel}</p>}
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="footer">
        <small>{`© ${currentYear()} Acuria Partners`}</small>
      </footer>
    </div>
  );
}
