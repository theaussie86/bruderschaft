export function PageHeader({ title }: { title: string }) {
  return (
    <header className="mb-5 pt-5 lg:pt-10">
      <h1 className="font-display text-[2.15rem] leading-[0.95] font-extrabold uppercase lg:text-5xl">
        {title}
      </h1>
    </header>
  )
}
