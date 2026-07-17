import { AlertIcon } from "./icons";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-[#f8d3d3] bg-[#fdf1f1] px-3.5 py-3 text-[13.5px] leading-relaxed text-[#a41818]">
      <AlertIcon className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
