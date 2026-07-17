import type { SVGProps } from "react";

function Icon({
  d,
  ...props
}: { d: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d={d} />
    </svg>
  );
}

export function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon
      d="M2.5 12S5.5 5.5 12 5.5 21.5 12 21.5 12 18.5 18.5 12 18.5 2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
      {...props}
    />
  );
}

export function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon
      d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M7.4 7.5C4.9 8.9 3.4 11 2.5 12c0 0 3 6.5 9.5 6.5 1.7 0 3.1-.4 4.3-1M16.7 16.7C19.6 15.1 21.5 12 21.5 12s-3-6.5-9.5-6.5c-.8 0-1.6.1-2.3.3"
      {...props}
    />
  );
}

export function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon
      d="M12 9v4m0 4h.01M10.3 3.9 2.6 17.5A1.8 1.8 0 0 0 4.15 20.2h15.7a1.8 1.8 0 0 0 1.55-2.7L13.7 3.9a1.8 1.8 0 0 0-3.4 0Z"
      {...props}
    />
  );
}

export function CheckCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-3.5-9.5 2.5 2.5 5-5" {...props} />
  );
}

export function GoogleLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden {...props}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.4 0 6.4 1.2 8.8 3.5l6.5-6.5C35.3 2.5 30 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.6 5.9C12.1 13 17.6 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.6c-.5 3-2.2 5.5-4.6 7.2l7.3 5.7c4.3-4 6.8-9.8 6.8-17.4Z"
      />
      <path
        fill="#FBBC05"
        d="M10.2 19.1a14.5 14.5 0 0 0 0 9.8l-7.6 5.9a24 24 0 0 1 0-21.6l7.6 5.9Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6 0 11.3-2 15-5.4l-7.3-5.7c-2 1.4-4.6 2.2-7.7 2.2-6.4 0-11.9-3.5-14-9.6l-7.6 5.9C6.5 42.6 14.6 48 24 48Z"
      />
    </svg>
  );
}
