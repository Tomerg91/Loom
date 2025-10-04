export function useRouter() {
  return {
    push: () => {},
    replace: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: () => Promise.resolve(),
  };
}

export const usePathname = () => '/';
export const useSearchParams = () => new URLSearchParams();
export const notFound = () => { throw new Error('notFound is not implemented in tests'); };
export const redirect = (_url: string) => { throw new Error('redirect is not implemented in tests'); };
