import { getLiveAudioStatus } from "@/lib/data/live-audio";
import { LiveAudioToggle } from "@/components/admin/LiveAudioToggle";

export const dynamic = "force-dynamic";

export default async function AdminLiveAudioPage() {
  const isLive = await getLiveAudioStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-rf-fg">Commentaire audio en direct</h1>
        <p className="mt-1 text-sm text-rf-fg-muted">
          Bascule le lecteur YouTube Live affiché sous le score sur toutes les pages match, pendant que tu commentes en direct.
        </p>
      </div>

      <LiveAudioToggle initialIsLive={isLive} />
    </div>
  );
}
