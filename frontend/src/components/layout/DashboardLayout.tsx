import { useEffect } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  FiActivity,
  FiBriefcase,
  FiFileText,
  FiHome,
  FiLink,
  FiLogOut,
  FiSearch,
  FiShield,
  FiSliders,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import api from "../../api";
import { queryKeys } from "../../api/queryKeys";
import { useApp } from "../../context/AppContext";
import { useConfirm } from "../../context/ConfirmContext";
import AuthenticatedImage from "../ui/AuthenticatedImage";
import {
  useAccueil,
  useLogout,
  usePlatformSocket,
  useTenantBranding,
} from "../../hooks";
import { ROLE_LABELS, type Role } from "../../constants/roles";
import { lightenHex } from "../../utils/color";
import PageTopbar from "./PageTopbar";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Accueil",
  "/dashboard/clients": "Clients",
  "/dashboard/kyc/der": "KYC — DER & Lettre de Mission",
  "/dashboard/kyc/fcc": "KYC — Fiches Connaissance Client",
  "/dashboard/users": "Utilisateurs",
  "/dashboard/audit": "Audit",
  "/dashboard/platform/audit": "Audit",
  "/dashboard/tenants": "Tenants",
  "/dashboard/marches": "Marchés financiers",
  "/dashboard/simulateurs": "Simulateurs",
};

function navClass({ isActive }: { isActive: boolean }): string {
  return `nav-item${isActive ? " active" : ""}`;
}

export default function DashboardLayout() {
  const { user, isSuperAdmin, isTenantAdmin } = useApp();
  const logoutMutation = useLogout();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: branding } = useTenantBranding(!isSuperAdmin);
  const { data: accueil } = useAccueil(!isSuperAdmin);

  usePlatformSocket(isSuperAdmin);

  useEffect(() => {
    const accent = branding?.branding?.accent;
    if (!accent) {
      return undefined;
    }

    document.documentElement.style.setProperty("--color-bronze", accent);
    document.documentElement.style.setProperty(
      "--color-bronze-light",
      lightenHex(accent, 0.25),
    );

    return () => {
      document.documentElement.style.removeProperty("--color-bronze");
      document.documentElement.style.removeProperty("--color-bronze-light");
    };
  }, [branding?.branding?.accent]);

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: "Se déconnecter",
      message: "Voulez-vous vraiment vous déconnecter ?",
      confirmLabel: "Se déconnecter",
    });
    if (!confirmed) return;
    logoutMutation.mutate(undefined, {
      onSettled: () => navigate("/login"),
    });
  };

  const roleLabel = user?.role
    ? ROLE_LABELS[user.role as Role] || user.role
    : user?.role;

  const brandName = branding?.branding?.name || "Acuria";
  const orias = branding?.branding?.orias;
  const showBrandingLogo = Boolean(branding?.branding?.hasLogo);
  const pageTitle = PAGE_TITLES[location.pathname] || "Tableau de bord";
  const pendingFcc = accueil?.stats.fcc.aEnvoyer ?? 0;
  const clientCount = accueil?.stats.crm.total;

  const showTenantTopbar = !isSuperAdmin && PAGE_TITLES[location.pathname];

  return (
    <div className="dashboard">
      <aside className="dashboard-sidebar">
        <Link to="/dashboard" className="sidebar-logo">
          {showBrandingLogo ? (
            <AuthenticatedImage
              dataUrl={branding?.branding?.logoDataUrl}
              src={api.tenantBrandingLogo}
              queryKey={queryKeys.tenant.logo}
              alt={brandName}
              className="sidebar-logo-image"
            />
          ) : (
            <div className="sidebar-logo-text">
              {(() => {
                const parts = brandName.split(" ");
                if (parts.length <= 1) return brandName;
                const last = parts.pop();
                return (
                  <>
                    {parts.join(" ")} <span>{last}</span>
                  </>
                );
              })()}
            </div>
          )}
          <div className="sidebar-sub">Dashboard Activité</div>
        </Link>

        <nav className="dashboard-nav sidebar-nav">
          {!isSuperAdmin && (
            <>
              <span className="nav-label nav-section">Accueil</span>
              <NavLink to="/dashboard" end className={navClass}>
                <FiHome className="nav-icon" />
                Accueil
              </NavLink>

              <span className="nav-label nav-section">CRM</span>
              <NavLink to="/dashboard/clients" className={navClass}>
                <FiBriefcase className="nav-icon" />
                Clients
                {clientCount !== undefined && (
                  <span className="nav-badge">{clientCount}</span>
                )}
              </NavLink>

              <span className="nav-label nav-section">KYC</span>
              <NavLink to="/dashboard/kyc/der" className={navClass}>
                <FiFileText className="nav-icon" />
                DER / LdM
              </NavLink>
              <NavLink to="/dashboard/kyc/fcc" className={navClass}>
                <FiSearch className="nav-icon" />
                FCC
                {pendingFcc > 0 && (
                  <span className="nav-badge">{pendingFcc}</span>
                )}
              </NavLink>

              <span className="nav-label nav-section">Outils</span>
              <NavLink to="/dashboard/marches" className={navClass}>
                <FiTrendingUp className="nav-icon" />
                Marchés financiers
              </NavLink>
              <NavLink to="/dashboard/simulateurs" className={navClass}>
                <FiSliders className="nav-icon" />
                Simulateurs
              </NavLink>
            </>
          )}

          {isSuperAdmin && (
            <>
              <span className="nav-label nav-section">Plateforme</span>
              <NavLink to="/dashboard" end className={navClass}>
                <FiHome className="nav-icon" />
                Accueil
              </NavLink>
              <NavLink to="/dashboard/tenants" className={navClass}>
                <FiUsers className="nav-icon" />
                Tenants
              </NavLink>
              <NavLink to="/dashboard/platform/audit" className={navClass}>
                <FiActivity className="nav-icon" />
                Audit
              </NavLink>
            </>
          )}

          {!isSuperAdmin && isTenantAdmin && (
            <>
              <span className="nav-label nav-section">Administration</span>
              <NavLink to="/dashboard/users" className={navClass}>
                <FiShield className="nav-icon" />
                Utilisateurs
              </NavLink>
              <NavLink to="/dashboard/audit" className={navClass}>
                <FiActivity className="nav-icon" />
                Audit
              </NavLink>
              <NavLink to="/dashboard/integrations" className={navClass}>
                <FiLink className="nav-icon" />
                Intégrations
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {orias ? (
            <>
              {brandName} · ORIAS {orias}
              <br />
            </>
          ) : null}
          Powered by Acuria Partners
        </div>

        <div className="dashboard-user">
          <div className="user-meta">
            <strong>{user?.name}</strong>
            <span>{roleLabel}</span>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <FiLogOut />
            {logoutMutation.isPending ? "Déconnexion…" : "Déconnexion"}
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        {showTenantTopbar && <PageTopbar title={pageTitle} />}
        <Outlet />
      </div>
    </div>
  );
}
