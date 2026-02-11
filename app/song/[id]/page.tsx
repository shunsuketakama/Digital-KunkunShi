import { SongStatus } from "@/components/SongStatus";

export default function SongPage({ params }: { params: { id: string } }) {
  return (
    <main>
      <SongStatus songId={params.id} />
    </main>
  );
}
