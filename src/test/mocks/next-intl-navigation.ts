import React from 'react';

export const createNavigation = (_routing: any) => ({
  Link: ({ href, children, ...props }: any) => (
    React.createElement('a', { href, ...props }, children)
  ),
  redirect: (url: string) => {
    throw new Error(`redirect not implemented in tests: ${url}`);
  },
  usePathname: () => '/',
  useRouter: () => ({
    push: (_url: string) => {},
    replace: (_url: string) => {},
    back: () => {},
  }),
});

export default {
  createNavigation,
};
