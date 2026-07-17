function Bar({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function CreditsSkeleton() {
  return (
    <div className="shadow-stripe-sm rounded-xl border border-line bg-white p-6">
      <div className="flex items-center justify-between">
        <Bar className="h-4 w-24" />
        <Bar className="h-5 w-14 rounded-full" />
      </div>
      <Bar className="mt-5 h-9 w-32" />
      <Bar className="mt-4 h-2 w-full rounded-full" />
      <Bar className="mt-2 h-3 w-40" />
      <Bar className="mt-5 h-9 w-full rounded-full" />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="shadow-stripe-sm rounded-xl border border-line bg-white p-5">
          <Bar className="size-8 rounded-lg" />
          <Bar className="mt-4 h-7 w-16" />
          <Bar className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function ProjectsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="shadow-stripe-sm overflow-hidden rounded-xl border border-line bg-white">
          <Bar className="aspect-video w-full rounded-none" />
          <div className="p-4">
            <Bar className="h-4 w-3/4" />
            <Bar className="mt-2.5 h-3 w-1/2" />
            <div className="mt-4 flex items-center justify-between">
              <Bar className="h-5 w-16 rounded-full" />
              <Bar className="h-3 w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivitySkeleton() {
  return (
    <div className="shadow-stripe-sm rounded-xl border border-line bg-white p-6">
      <div className="space-y-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Bar className="size-8 rounded-full" />
            <div className="flex-1">
              <Bar className="h-3.5 w-3/4" />
              <Bar className="mt-1.5 h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
