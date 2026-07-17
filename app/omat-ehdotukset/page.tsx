import { OwnProposalsClient } from "./page-client";

export const metadata = { title: "Omat ehdotukset" };

export default function OwnProposalsPage() {
  return <main className="content-page proposals-page"><OwnProposalsClient /></main>;
}
