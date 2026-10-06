"use client";

import NextLink from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";
import type { ComponentPropsWithoutRef } from "react";
import { useCallback, useMemo } from "react";

type LinkProps = Omit<ComponentPropsWithoutRef<typeof NextLink>, "href"> & {
  to: string;
};

export function Link({ to, ...props }: LinkProps) {
  return <NextLink href={to} {...props} />;
}

export function useNavigate() {
  const router = useRouter();

  return useCallback(
    (destination: string | number, options?: { replace?: boolean }) => {
      if (typeof destination === "number") {
        if (destination < 0) router.back();
        else router.forward();
        return;
      }

      if (options?.replace) router.replace(destination);
      else router.push(destination);
    },
    [router],
  );
}

export function useParams(): Record<string, string | undefined> {
  const pathname = usePathname() ?? "/";
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "vendors" || segments[0] === "real-weddings") {
    return { id: segments[1] };
  }
  if (segments[0] === "u") return { slug: segments[1] };
  return {};
}

export function useLocation() {
  const pathname = usePathname() ?? "/";
  const searchParams = useNextSearchParams();

  return {
    pathname,
    search: searchParams?.toString() ? `?${searchParams.toString()}` : "",
    hash: typeof window === "undefined" ? "" : window.location.hash,
  };
}

type SearchParamsInit =
  | string
  | URLSearchParams
  | Record<string, string | string[]>
  | [string, string][];

export function useSearchParams(): [
  URLSearchParams,
  (next: SearchParamsInit) => void,
] {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const current = useNextSearchParams();
  const searchParams = useMemo(
    () => new URLSearchParams(current?.toString()),
    [current],
  );

  const setSearchParams = useCallback(
    (next: SearchParamsInit) => {
      const nextParams = new URLSearchParams();
      if (next instanceof URLSearchParams || typeof next === "string") {
        new URLSearchParams(next).forEach((value, key) => nextParams.append(key, value));
      } else if (Array.isArray(next)) {
        next.forEach(([key, value]) => nextParams.append(key, value));
      } else {
        Object.entries(next).forEach(([key, value]) => {
          if (Array.isArray(value)) value.forEach((item) => nextParams.append(key, item));
          else nextParams.set(key, value);
        });
      }

      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  return [searchParams, setSearchParams];
}
