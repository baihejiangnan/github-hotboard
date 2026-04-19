import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import styles from "@/app/queries/queries.module.css";
import { DashboardPage } from "@/components/dashboard-page";
import { ShareDraftEditor } from "@/components/share-draft-editor";
import { authOptions } from "@/lib/auth";
import { getShareChannelLabel } from "@/lib/display";
import { prisma } from "@/lib/prisma";
import { normalizeShareDraft } from "@/lib/share-drafts";

export default async function ShareDraftDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/explore");
  }

  const { id } = await params;
  const draft = await prisma.shareDraft.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!draft) {
    notFound();
  }

  const normalizedDraft = normalizeShareDraft(draft);

  return (
    <DashboardPage
      active="share"
      actions={
        <Link className="ghost-button" href="/share">
          返回草稿列表
        </Link>
      }
      description={`正在编辑 ${getShareChannelLabel(normalizedDraft.channel)}，这里适合在发布前做最后一轮精修和预览。`}
      eyebrow="Share Draft"
      title={normalizedDraft.title}
      userName={session?.user?.name}
    >
      <section className={styles.section}>
        <ShareDraftEditor draft={normalizedDraft} />
      </section>
    </DashboardPage>
  );
}
