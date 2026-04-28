import ExtractorDashboard from "@/components/ExtractorDashboard";

type HomePageProps = {
  searchParams?: {
    shared?: string | string[];
  };
};

function readSharedParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function Page({ searchParams }: HomePageProps) {
  const sharedUrl = readSharedParam(searchParams?.shared);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-6 pb-20 pt-10 sm:px-10 lg:px-16 lg:pt-14">
      <header className="flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-pink-500 to-cyan-400 shadow-glow">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="currentColor" aria-hidden>
              <path d="M9 17.5a3 3 0 1 1-2-2.83V7.5l11-2.5v9.83A3 3 0 1 1 16 12V7.79l-7 1.59V17.5z" />
            </svg>
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-white">
            Reel<span className="gradient-text">Tunes</span>
          </span>
        </a>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="hidden text-xs font-medium text-surface-100/60 transition hover:text-white sm:inline-flex"
        >
          v2.0 · Beta
        </a>
      </header>

      <section className="mt-14 flex flex-col items-center text-center">
        <h1 className="mt-2 max-w-4xl font-display text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
          Save the song from{" "}
          <span className="gradient-text">any short video</span> in seconds.
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-7 text-surface-100/65 sm:text-lg">
          Paste a link from Instagram, YouTube, Facebook, Pinterest, Reddit, and more.
          We do the rest.
        </p>
      </section>

      <section className="mt-12">
        <ExtractorDashboard sharedUrl={sharedUrl} />
      </section>

      <footer className="mt-20 flex flex-col items-center gap-2 text-center text-xs text-surface-100/40">
        <p>For personal use only. Respect creators and copyright.</p>
      </footer>
    </main>
  );
}
