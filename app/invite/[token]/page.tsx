import { adminDb } from "@/app/lib/firebase-admin";
import { redirect } from "next/navigation";
import { InviteClient } from "@/app/components/invite-client";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  console.log("token:", token);

  const inviteSnap = await adminDb.doc(`invites/${token}`).get();

  console.log("existe?", inviteSnap.exists);

  if (!inviteSnap.exists) redirect("/");

  const invite = inviteSnap.data()!;

  if (invite.accepted) redirect("/dashboard");

  return <InviteClient token={token} email={invite.email} name={invite.name} />;
}
