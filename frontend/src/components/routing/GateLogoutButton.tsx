import { FiLogOut } from "react-icons/fi";
import { useLogout } from "../../hooks";

/** Escape hatch on the onboarding/blocking screens: a tenant who can't (or won't)
 *  connect an integration must still be able to sign out. */
export default function GateLogoutButton() {
  const logout = useLogout();
  return (
    <button
      type="button"
      className="sp-screen__logout"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
    >
      <FiLogOut />
      {logout.isPending ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}
