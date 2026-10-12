import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="stamp mb-4 text-stamp">404</p>
      <h1 className="text-4xl font-semibold">Não encontrado</h1>
      <p className="mt-2 text-ink-soft">O recurso não existe ou não pertence à sua organização.</p>
      <Link href="/" className="btn btn-ghost mt-6">Voltar ao início</Link>
    </div>
  );
}
