import { listMediaAssets } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { MediaLibraryClient, type MediaItem } from "@/components/admin/media-library-client";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const assets = await listMediaAssets({ take: 120 }).catch(() => []);
  const items: MediaItem[] = assets.map((a) => ({ id: a.id, url: a.url, type: a.type }));
  return (
    <>
      <AdminHeader
        title="Media library"
        description="Every image and video you've uploaded. Reuse them anywhere via 'Choose from library'."
      />
      <div className="p-8">
        <MediaLibraryClient items={items} />
      </div>
    </>
  );
}
