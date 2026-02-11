import { SongForm } from "@/components/SongForm";

export default function HomePage() {
  return (
    <main>
      <h1>Digital KunkunShi MVP</h1>
      <p>アップロード音源から主旋律を抽出し、CFC 調弦ベースの工工四へ変換します。</p>
      <SongForm />
    </main>
  );
}
