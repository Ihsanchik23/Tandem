export function ProfileSkeleton() {
  return (
    <main aria-hidden className="flex flex-1 flex-col px-5 pb-8 pt-6 md:pt-10">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3">
        <div className="h-24 w-24 rounded-full bg-neutral-100" />
        <div className="h-7 w-48 rounded-lg bg-neutral-100" />
        <div className="h-5 w-32 rounded-lg bg-neutral-100" />
      </div>
    </main>
  );
}
