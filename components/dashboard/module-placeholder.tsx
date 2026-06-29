import type { ModulePlaceholderContent } from "@/types";

type ModulePlaceholderProps = {
  content: ModulePlaceholderContent;
};

export function ModulePlaceholder({ content }: ModulePlaceholderProps) {
  return (
    <section className="space-y-5">
      <div className="rounded-[1.75rem] bg-white px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:px-7">
        <h1 className="text-[1.9rem] font-semibold tracking-tight text-[color:var(--color-foreground)]">
          {content.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-muted)] sm:text-[15px]">
          {content.description}
        </p>
      </div>

      <div className="rounded-[1.75rem] bg-white px-6 py-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:px-7">
        <p className="text-base font-semibold text-[color:var(--color-foreground)]">
          Belum ada data yang ditampilkan.
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--color-muted)] sm:text-[15px]">
          Area {content.title.toLowerCase()} masih kosong untuk saat ini.
        </p>
      </div>
    </section>
  );
}
