import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";

export default async function AdminAccountPage() {
  const admin = await getCurrentAdmin();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">Mon compte</h1>
      <p className="text-sm text-rf-fg-muted">Connecté en tant que {admin?.email}</p>

      <div className="max-w-md space-y-3">
        <h2 className="font-display text-lg font-bold text-rf-fg">Changer le mot de passe</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
